import { readFile } from 'node:fs/promises';
import { extraPages, localizeLinks } from './pages.mjs';

const entries = JSON.parse(await readFile(new URL('./news-entries.json', import.meta.url), 'utf8'));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const relative = (pathname, depth) => '../'.repeat(depth) + pathname.replace(/^\//, '') + 'index.html';
const dateLabel = date => date.replaceAll('-', '.');

export const newsCategories = [
  { id: 'recruit', label: '採用情報' },
  { id: 'company', label: '企業情報' },
  { id: 'media', label: 'メディア掲載' }
];
export const newsPageSize = 5;
export const newsItems = entries.map(entry => {
  const page = extraPages.find(page => page.path === entry.path);
  if (!page) throw new Error(`お知らせの原文がありません: ${entry.path}`);
  const category = newsCategories.find(category => category.id === entry.category);
  if (!category) throw new Error(`お知らせの分類が不正です: ${entry.category}`);
  return { ...entry, date: page.source.date.slice(0, 10), categoryLabel: category.label, source: page.source };
}).sort((left, right) => right.date.localeCompare(left.date));
export const newsPageCount = Math.ceil(newsItems.length / newsPageSize);
export const newsImageFiles = newsItems.filter(item => item.image).map(item => `images/news/${item.image.file}`);
export const newsArchivePath = page => page === 1 ? '/category/information/' : `/category/information/page/${page}/`;
export const findNewsItem = pathname => newsItems.find(item => item.path === pathname);

function row(item, depth) {
  return `<li class="news-item"><a class="news-item-link" href="${escape(relative(item.path, depth))}">
    <div class="news-item-meta"><time datetime="${item.date}">${dateLabel(item.date)}</time><span class="news-category">${item.categoryLabel}</span></div>
    <h2 class="news-item-title" data-reveal="none">${escape(item.title)}</h2><span class="news-item-marker" aria-hidden="true">↗</span>
  </a></li>`;
}

function pagerLink(page, label, depth, className = '', disabled = false, current = false) {
  if (disabled || current) return `<span class="${className}"${current ? ' aria-current="page"' : ' aria-disabled="true"'}>${label}</span>`;
  return `<a class="${className}" href="${relative(newsArchivePath(page), depth)}#news-results" data-news-page="${page}">${label}</a>`;
}

function pagination(page, depth) {
  return `<nav class="news-pagination" aria-label="お知らせのページ切り替え" data-news-pagination>
    ${pagerLink(page - 1, '<span aria-hidden="true">←</span> Prev', depth, 'news-page-prev', page === 1)}
    <ol class="news-page-numbers">${Array.from({ length: newsPageCount }, (_, index) => `<li>${pagerLink(index + 1, String(index + 1), depth, 'news-page-number', false, page === index + 1)}</li>`).join('')}</ol>
    ${pagerLink(page + 1, 'Next <span aria-hidden="true">→</span>', depth, 'news-page-next', page === newsPageCount)}
  </nav>`;
}

export function renderNewsArchive(depth, page = 1) {
  const first = (page - 1) * newsPageSize;
  const items = newsItems.slice(first, first + newsPageSize);
  const years = [...new Set(newsItems.map(item => item.date.slice(0, 4)))];
  const data = {
    pageSize: newsPageSize,
    categories: newsCategories,
    years,
    pageUrls: Array.from({ length: newsPageCount }, (_, index) => relative(newsArchivePath(index + 1), depth)),
    items: newsItems.map(item => ({ title: item.title, date: item.date, category: item.category, categoryLabel: item.categoryLabel, href: relative(item.path, depth) }))
  };
  return `<section class="news-hero"><div class="news-container">
    <h1 data-reveal="left">お知らせ</h1><p class="news-hero-word" data-reveal="left" aria-hidden="true">News</p>
    <nav class="news-breadcrumb" aria-label="パンくずリスト"><a href="${relative('/', depth)}">ホーム</a><span aria-hidden="true">/</span><span aria-current="page">お知らせ</span></nav>
  </div></section>
  <section class="news-archive news-container" aria-label="お知らせ一覧" data-news-archive>
    <div class="news-controls" role="group" aria-label="お知らせの絞り込み">
      <div class="news-filter-group news-filter-categories"><span class="news-filter-label" id="news-category-label">カテゴリー</span>
        <div class="news-category-buttons" role="group" aria-labelledby="news-category-label"><button type="button" data-news-category="all" aria-pressed="true">すべて</button>${newsCategories.map(category => `<button type="button" data-news-category="${category.id}" aria-pressed="false">${category.label}</button>`).join('')}</div>
      </div>
      <div class="news-filter-group"><label class="news-filter-label" for="news-year">年</label><select id="news-year" data-news-year><option value="all">すべて</option>${years.map(year => `<option value="${year}">${year}年</option>`).join('')}</select></div>
      <button type="button" class="news-reset" data-news-reset disabled>絞り込み解除 <span aria-hidden="true">×</span></button>
    </div>
    <div class="news-results" id="news-results" tabindex="-1">
      <p class="news-result-count" aria-live="polite" aria-atomic="true" data-news-count>全${newsItems.length}件<span>${first + 1}–${first + items.length}件を表示</span></p>
      <ul class="news-list" data-news-list>${items.map(item => row(item, depth)).join('')}</ul>
      <p class="news-empty" data-news-empty hidden>条件に一致するお知らせはありません。<br>カテゴリーや年を変更してご覧ください。</p>
      ${pagination(page, depth)}
    </div>
    <script type="application/json" id="news-data">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>
  </section>`;
}

export function renderNewsArticle(item, depth) {
  const index = newsItems.indexOf(item);
  const previous = newsItems[index - 1];
  const next = newsItems[index + 1];
  const remaining = item.keepFrom ? item.source.html.slice(item.source.html.indexOf(item.keepFrom)) : '';
  if (item.keepFrom && !item.source.html.includes(item.keepFrom)) throw new Error(`記事の章が見つかりません: ${item.path}`);
  const image = item.image ? `<figure class="news-article-image"><img src="${'../'.repeat(depth)}assets/images/news/${item.image.file}" alt="${escape(item.image.alt)}" width="${item.image.width}" height="${item.image.height}" loading="lazy" decoding="async"></figure>` : '';
  const adjacent = (target, label) => target ? `<a href="${escape(relative(target.path, depth))}"><span>${label}</span><strong>${escape(target.title)}</strong></a>` : '<span></span>';
  return `<header class="news-article-header"><div class="news-article-container">
    <nav class="news-breadcrumb" aria-label="パンくずリスト"><a href="${relative('/', depth)}">ホーム</a><span aria-hidden="true">/</span><a href="${relative(newsArchivePath(1), depth)}">お知らせ</a><span aria-hidden="true">/</span><span aria-current="page">記事</span></nav>
    <div class="news-article-meta"><time datetime="${item.date}">${dateLabel(item.date)}</time><span class="news-category">${item.categoryLabel}</span></div>
    <h1 data-reveal="left">${escape(item.title)}</h1>
  </div></header>
  <article class="news-article-container news-article-body">
    ${item.intro.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}${image}${localizeLinks(remaining, depth)}
    <nav class="news-article-adjacent" aria-label="前後のお知らせ">${adjacent(previous, '← 前の記事')}${adjacent(next, '次の記事 →')}</nav>
    <a class="news-back" href="${relative(newsArchivePath(1), depth)}"><span aria-hidden="true">←</span> お知らせ一覧へ</a>
  </article>`;
}
