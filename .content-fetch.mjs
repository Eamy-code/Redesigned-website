import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const directory = path.join(os.tmpdir(), 'corefutec-content-import');
const previous = JSON.parse(await readFile(path.join(directory, 'pages.json'), 'utf8'));
const urls = new Set(previous.map(page => page.url));
urls.add('https://www.corefutec.co.jp/sitemap.xml');
urls.add('https://www.corefutec.co.jp/wp-sitemap.xml');
urls.add('https://www.recruit.corefutec.co.jp/privacy.html');
urls.add('https://www.corefutec.co.jp/privacy.html');
urls.add('https://www.jstqb.jp/partnership/');
const results = JSON.parse(await readFile(path.join(directory, 'audit-pages.json'), 'utf8'));
for (const url of urls) {
  try {
    let record = results.find(record => record.url === url && record.html);
    if (!record) {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      record = {
        url,
        finalUrl: response.url,
        status: response.status,
        fetchedAt: new Date().toISOString(),
        html
      };
      results.push(record);
      console.log(response.status, url, html.length);
    }
    const html = record.html;
    if (url.endsWith('.xml') && record.status === 200) {
      for (const match of html.matchAll(/<loc>(.*?)<\/loc>/g)) {
        const target = match[1].replace(/^<!\[CDATA\[|\]\]>$/g, '').replaceAll('&amp;', '&');
        if (target.startsWith('https://www.corefutec.co.jp/') && urls.size < 80) urls.add(target);
      }
    }
  } catch (error) {
    results.push({
      url,
      error: error.message
    });
    console.log('ERROR', url, error.message);
  }
}
for (const url of [
  'https://www.corefutec.co.jp/wp-content/uploads/2024/06/corefutec_margin_rate_2024.pdf',
  'https://e-dennosuke.com/',
  'http://jstqb.jp/partnership.html',
  'https://www.city.kawasaki.jp/280/page/0000151473.html',
  'https://www.city.kawasaki.jp/280/page/0000130219.html',
  'https://www.jobway.jp/pref/10002',
  'https://www.welbox.com/'
]) {
  if (results.some(record => record.url === url)) continue;
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(20000)
    });
    results.push({
      url,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type')
    });
    console.log(response.status, url, response.headers.get('content-type'));
  } catch (error) {
    results.push({
      url,
      error: error.message
    });
    console.log('ERROR', url, error.message);
  }
}
await writeFile(path.join(directory, 'audit-pages.json'), JSON.stringify(results, null, 2));
