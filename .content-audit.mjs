import assert from 'node:assert/strict';
import { readFile, readdir, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const project = path.resolve('corefutec_motion_prototype_v5');
const root = path.join(project, 'dist');
const raw = JSON.parse(await readFile(path.join(os.tmpdir(), 'corefutec-content-import/audit-pages.json'), 'utf8'));
const sources = JSON.parse(await readFile(path.join(project, 'content/source-pages.json'), 'utf8'));
const entities = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  copy: '©',
  reg: '®',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  raquo: '»',
  laquo: '«',
  times: '×'
};
const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, name) => name[0] === '#' ? String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : entities[name] ?? all);
const normalize = html => decode(html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|iframe|svg|button|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]*>/g, '')).replace(/\s/g, '');
const urlKey = value => {
  const url = new URL(value);
  return url.hostname + decodeURIComponent(url.pathname);
};
const recruitPaths = {
  '/': '/recruit/',
  '/message.html': '/recruit/message/',
  '/senior.html': '/recruit/people/',
  '/jobs.html': '/recruit/work/',
  '/workplace.html': '/recruit/culture/',
  '/workplace02.html': '/recruit/culture/',
  '/workplace03.html': '/recruit/training/',
  '/recruit.html': '/recruit/jobs/'
};
const outputPath = value => {
  const url = new URL(value);
  return url.hostname === 'www.recruit.corefutec.co.jp' ? recruitPaths[url.pathname] : url.pathname === '/recruit-contact/' ? '/recruit/entry/' : decodeURIComponent(url.pathname);
};
const fileFor = route => path.join(root, route, 'index.html');
async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'assets') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full)); else if (entry.name.endsWith('.html')) result.push(full);
  }
  return result;
}
const files = await walk(root);
const pages = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, 'utf8')])));
const failures = [];
let bodyChecks = 0;
for (const source of sources) {
  const current = raw.find(page => urlKey(page.url) === urlKey(source.sourceUrl));
  assert.equal(current?.status, 200, source.sourceUrl);
  const url = new URL(source.sourceUrl);
  const isRecruit = url.hostname === 'www.recruit.corefutec.co.jp';
  let original = isRecruit ? current.html.split('<div id="content">')[1]?.split(/<div class="ccc">|<footer\b|<!--topへ戻るボタン-->/)[0]?.split('<div class="wrap">')[0] : current.html.match(/<section[^>]*class="post-content"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.ok(original, source.sourceUrl);
  original = original.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, '');
  if (!url.pathname.includes('contact')) assert.equal(normalize(original), normalize(source.html), `Snapshot changed: ${source.sourceUrl}`);
  if (url.pathname.endsWith('recruitn.html') || url.pathname.includes('contact') || url.pathname === '/site-map/') continue;
  const page = pages.get(fileFor(outputPath(source.sourceUrl)));
  assert.ok(page, `Missing destination: ${source.sourceUrl}`);
  assert.ok(normalize(page).includes(normalize(original)), `Missing original text: ${source.sourceUrl}`);
  bodyChecks++;
}

const sitemapUrls = new Set(raw.filter(page => /\/(?:addl|post|page)-sitemap\.xml$/.test(page.url)).flatMap(page => [...page.html.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map(match => match[1].replace(/^<!\[CDATA\[|\]\]>$/g, ''))));
for (const url of sitemapUrls) assert.ok(pages.has(fileFor(outputPath(url))), `XML sitemap page missing: ${url}`);
for (const record of raw.filter(page => page.url.startsWith('https://www.recruit.corefutec.co.jp/') && page.status === 200)) {
  const html = record.html.replace(/<!--[\s\S]*?-->/g, '');
  for (const match of html.matchAll(/href=["']([^"']+)["']/g)) {
    const target = new URL(match[1], record.url);
    if (target.hostname !== 'www.recruit.corefutec.co.jp' || !target.pathname.endsWith('.html') || target.pathname === '/recruitn.html') continue;
    assert.ok(recruitPaths[target.pathname] || raw.some(page => page.url === target.origin + target.pathname && page.status === 404), `Unmapped recruitment page: ${target.href}`);
  }
}

const graph = new Map();
let references = 0;
for (const [file, html] of pages) {
  const targets = [];
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate ID: ${file}`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `H1 count: ${file}`);
  const stack = [];
  const voids = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  for (const token of markup.match(/<[^>]+>/g) || []) {
    const tag = token.match(/^<\/?([a-z][\w-]*)/i)?.[1].toLowerCase();
    if (!tag || voids.has(tag)) continue;
    if (token.startsWith('</')) assert.equal(stack.pop(), tag, `Unbalanced ${token}: ${file}`); else if (!token.endsWith('/>')) {
      assert.ok(!(tag === 'p' && stack.includes('p')));
      assert.ok(!(tag === 'a' && stack.includes('a')));
      stack.push(tag);
    }
  }
  assert.equal(stack.length, 0, `Unclosed tag: ${file}`);
  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const value = decode(match[1]);
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) continue;
    const [pathname, hash] = value.split('#');
    const target = pathname ? path.resolve(path.dirname(file), decodeURIComponent(pathname.split('?')[0])) : file;
    await access(target);
    references++;
    if (pages.has(target)) {
      targets.push(target);
      if (hash) assert.ok(pages.get(target).includes(`id="${decodeURIComponent(hash)}"`), `Missing anchor: ${file} / ${value}`);
    }
  }
  graph.set(file, targets);
}
const visited = new Set();
const queue = [path.join(root, 'index.html')];
for (const file of queue) {
  if (visited.has(file)) continue;
  visited.add(file);
  queue.push(...(graph.get(file) || []).filter(target => !visited.has(target)));
}
assert.equal(visited.size, pages.size, 'Unreachable pages');

const siteMapFile = fileFor('/site-map/');
const listed = new Set(graph.get(siteMapFile));
const missingFromSitemap = files.filter(file => !listed.has(file));
const brokenExternal = raw.filter(record => record.status >= 400 && !record.url.endsWith('.xml'));
const home = pages.get(path.join(root, 'index.html'));
const oldHome = raw.find(page => page.url === 'https://www.corefutec.co.jp/').html;
const missingHomeParagraphs = [...oldHome.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(match => match[1]).filter(text => normalize(text).length > 30 && !normalize(home).includes(normalize(text)));

const report = {
  checkedAt: new Date().toISOString(),
  pages: files.length,
  references,
  bodyChecks,
  xmlPages: sitemapUrls.size,
  missingFromSitemap: missingFromSitemap.map(file => path.relative(root, file)),
  brokenExternal: brokenExternal.map(({ url, status }) => ({
    url,
    status
  })),
  missingHomeParagraphs: missingHomeParagraphs.map(text => decode(text.replace(/<[^>]*>/g, '')).trim())
};
await writeFile(path.join(os.tmpdir(), 'corefutec-content-import/audit-result.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
