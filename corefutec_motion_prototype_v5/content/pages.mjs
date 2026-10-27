import { readFile } from 'node:fs/promises';
import { contactForm } from './forms.mjs';

const sources = JSON.parse(await readFile(new URL('./source-pages.json', import.meta.url), 'utf8'));
const corporate = 'https://www.corefutec.co.jp';
const recruit = 'https://www.recruit.corefutec.co.jp';
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const normalizeUrl = value => {
  const url = new URL(value);
  return `${url.hostname}${decodeURIComponent(url.pathname)}`;
};
const findSource = url => {
  const source = sources.find(item => normalizeUrl(item.sourceUrl) === normalizeUrl(url));
  if (!source) throw new Error(`本文の取得記録がありません: ${url}`);
  return source;
};
const sourcePaths = {
  test: '/third-party-verification/',
  develop: '/software-development/',
  solution: '/solution/',
  product: '/product/',
  company: '/company/',
  contact: '/contact/',
  entry: '/recruit-contact/'
};
const recruitPaths = {
  recruit: '/',
  people: '/senior.html',
  work: '/jobs.html',
  training: '/workplace03.html',
  jobs: '/recruit.html'
};
const recruitTargets = {
  '/': '/recruit/',
  '/message.html': '/recruit/message/',
  '/senior.html': '/recruit/people/',
  '/jobs.html': '/recruit/work/',
  '/workplace.html': '/recruit/culture/',
  '/workplace02.html': '/recruit/culture/',
  '/workplace03.html': '/recruit/training/',
  '/recruit.html': '/recruit/jobs/'
};
const removedColumnPaths = new Set([
  '/category/software-test-column/',
  '/four-advantages-of-third-party-verification-for-small-and-medium-sized-software-development/',
  '/our-advantages-of-third-party-verification-for-small-and-medium-sized-software-development/',
  '/three-reassurances-necessary-for-software-testing/'
]);
const articleSources = sources.filter(source => {
  const url = new URL(source.sourceUrl);
  return url.hostname === 'www.corefutec.co.jp' && !Object.values(sourcePaths).includes(url.pathname)
    && !url.pathname.startsWith('/company/') && !['/site-map/', '/privacy-policy/'].includes(url.pathname)
    && !removedColumnPaths.has(url.pathname);
});

export const extraPages = sources.filter(source => {
  const url = new URL(source.sourceUrl);
  return url.hostname === 'www.corefutec.co.jp' && (url.pathname.startsWith('/company/') && url.pathname !== '/company/'
    || ['/privacy-policy/', '/site-map/'].includes(url.pathname) || articleSources.includes(source));
}).map(source => ({
  path: decodeURIComponent(new URL(source.sourceUrl).pathname),
  title: source.title,
  source
}));
extraPages.push({
  path: '/recruit/message/',
  title: '求める人物像',
  source: findSource(`${recruit}/message.html`)
});

const localTargets = new Map(sources.filter(source => !source.sourceUrl.endsWith('recruitn.html')
  && !removedColumnPaths.has(new URL(source.sourceUrl).pathname)).map(source => {
  const url = new URL(source.sourceUrl);
  return [
    normalizeUrl(source.sourceUrl),
    url.hostname === 'www.recruit.corefutec.co.jp'
      ? recruitTargets[url.pathname] : url.pathname === '/recruit-contact/' ? '/recruit/entry/' : decodeURIComponent(url.pathname)
  ];
}));
for (const slug of [
  'greetings-from-the-president',
  'management-philosophy',
  'company-profile',
  'access',
  'technology-and-media'
]) {
  localTargets.set(normalizeUrl(`${corporate}/${slug}/`), `/company/${slug}/`);
}
localTargets.set(normalizeUrl(corporate + '/category/information/'), '/category/information/');

export function localizeLinks(html, depth) {
  return html.replace(/<a href="(https?:\/\/www\.corefutec\.co\.jp\/[^"<>]+)"[^>]*>([\s\S]*?)<\/a>/g,
    (link, url, text) => removedColumnPaths.has(new URL(url).pathname) ? text : link)
    .replace(/href="(https?:\/\/[^"<>]+)"/g, (attribute, value) => {
    const url = new URL(value.replaceAll('&amp;', '&'));
    const target = localTargets.get(normalizeUrl(url.href));
    if (!target) return attribute;
    let hash = url.hash;
    // These three references already point to missing anchors on the old site.
    if (url.hostname === 'www.recruit.corefutec.co.jp' && url.pathname === '/senior.html'
      && ['#test-1704new-woman', '#test_1508career-man', '#test_2204new-man'].includes(hash)) hash = '';
    return `href="${escape('../'.repeat(depth) + target.replace(/^\//, '') + 'index.html' + hash)}"`;
  });
}

function sourceBody(source) {
  const date = source.date && articleSources.includes(source) ? `<p><time datetime="${escape(source.date)}">${escape(source.date.slice(0, 10))}</time></p>` : '';
  let html = source.html.replaceAll('href="http://jstqb.jp/partnership.html"', 'href="https://www.jstqb.jp/partnership/"')
    .replace(/<a href="https:\/\/www\.city\.kawasaki\.jp\/280\/page\/0000151473\.html">([\s\S]*?)<\/a>/g, '$1');
  if (new URL(source.sourceUrl).pathname.includes('contact')) {
    html = html.replace(/<p>以下のフォームより、[\s\S]*?<\/p>/, '')
      .replace(/<p>\s*Δ\s*<span[^>]*><\/span><\/p>/, '')
      .replace('に同意の上送信します。', 'への同意');
    html = `<h2>お問い合わせ項目</h2>${html}`;
  }
  return `${date}${html}`;
}

function excerpt(key, startHeading, endHeading) {
  const source = findSource(corporate + sourcePaths[key]);
  const start = source.html.indexOf(startHeading);
  const end = endHeading ? source.html.indexOf(endHeading, start + startHeading.length) : source.html.length;
  if (start < 0 || end < 0) throw new Error(`原文の章が見つかりません: ${key}/${startHeading}`);
  return source.html.slice(start, end);
}

function articleList() {
  return `<ul>${articleSources.map(source => `<li>${source.date ? `<time datetime="${escape(source.date)}">${escape(source.date.slice(0, 10))}</time> ` : ''}<a href="${escape(source.sourceUrl)}">${escape(source.title)}</a></li>`).join('')}</ul>`;
}

export function pageContent(key, depth) {
  let html;
  if (key === 'contact' || key === 'entry') html = contactForm(key);
  else if (sourcePaths[key]) html = sourceBody(findSource(corporate + sourcePaths[key]));
  else if (recruitPaths[key]) html = sourceBody(findSource(recruit + recruitPaths[key]));
  else if (key === 'culture') html = `<div id="teams">${sourceBody(findSource(`${recruit}/workplace.html`))}</div><div id="environment">${sourceBody(findSource(`${recruit}/workplace02.html`))}</div>`;
  else if (key === 'services') html = ['test', 'develop', 'solution'].map(service => {
    const source = findSource(corporate + sourcePaths[service]);
    const intro = source.html.slice(0, source.html.search(/<h3\b/));
    return `<article><h2>${escape(source.title)}</h2>${intro}<p><a href="${escape(source.sourceUrl)}">${escape(source.title)}の詳細</a></p></article>`;
  }).join('');
  else if (key === 'strengths') html = excerpt('test', '<h2>私たちは', '<h3>主なソフトウェアテスト')
    + excerpt('test', '<h3>世界標準の検証技術', '<h2>ソフトウェアテストの問題');
  else if (key === 'process') html = '<h2>ソフトウェア開発</h2>'
    + excerpt('develop', '<h2>ソフトウェア開発・システム構築の流れ')
    + '<h2>ログ解析ソリューション</h2>'
    + excerpt('solution', '<h3>ログ解析ソリューション・システム構築の流れ', '<h2>2. セキュリティ診断');
  else if (key === 'news') html = articleList();
  else throw new Error(`本文の対応がありません: ${key}`);
  if (key === 'jobs') html = '<p>既存採用サイトのナビゲーションに掲載された募集要項の原文です。募集条件の現況は確認中です。</p>' + html;
  if (key === 'company') html += `<p><a href="${corporate}/privacy-policy/">個人情報保護に関する基本方針</a>／<a href="${corporate}/site-map/">サイトマップ</a></p>`;
  if (key === 'people') html = '<p>インタビューは原サイトに記載された取材時点の内容です。</p>' + html;
  if (key === 'recruit') html = '<h2>採用サイト掲載のお知らせ</h2><p>以下は既存採用サイトに掲載されている過去のお知らせです。</p>' + html
    + `<p><a href="${recruit}/message.html">求める人物像</a></p>`;
  return localizeLinks(html, depth);
}

export function extraPageContent(page, depth, sitePages = []) {
  if (page.path === '/site-map/' && sitePages.length) {
    const pageLinks = sitePages.map(item => `<li><a href="${'../'.repeat(depth) + item.path.replace(/^\//, '')}index.html">${escape(item.title)}</a></li>`).join('');
    return `<h2>ページ一覧</h2><ul>${pageLinks}</ul><h2>関連サイト・資料</h2><p><a href="https://e-dennosuke.com/">離床センサー e伝之介くん</a></p><p><a href="https://www.corefutec.co.jp/wp-content/uploads/2024/06/corefutec_margin_rate_2024.pdf">改正派遣法に基づくマージン率の公開資料（PDF）</a></p>`;
  }
  return localizeLinks(sourceBody(page.source), depth);
}
