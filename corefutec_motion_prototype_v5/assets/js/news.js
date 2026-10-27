(() => {
  'use strict';
  const archive = document.querySelector('[data-news-archive]');
  if (!archive) return;
  const data = JSON.parse(document.querySelector('#news-data').textContent);
  const initialUrl = location.href;
  data.items.forEach(item => { item.href = new URL(item.href, initialUrl).href; });
  data.pageUrls = data.pageUrls.map(href => new URL(href, initialUrl).href);
  const list = archive.querySelector('[data-news-list]');
  const rowTemplate = list.firstElementChild.cloneNode(true);
  const results = archive.querySelector('#news-results');
  const count = archive.querySelector('[data-news-count]');
  const empty = archive.querySelector('[data-news-empty]');
  const pagination = archive.querySelector('[data-news-pagination]');
  const categoryButtons = [...archive.querySelectorAll('[data-news-category]')];
  const yearSelect = archive.querySelector('[data-news-year]');
  const reset = archive.querySelector('[data-news-reset]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state;

  function readState() {
    const url = new URL(location.href);
    const category = url.searchParams.get('category') || 'all';
    const year = url.searchParams.get('year') || 'all';
    const pathPage = url.pathname.match(/\/page\/(\d+)(?:\/index\.html)?\/?$/)?.[1];
    const requestedPage = Number(url.searchParams.get('page') || pathPage || 1);
    return {
      category: data.categories.some(item => item.id === category) ? category : 'all',
      year: data.years.includes(year) ? year : 'all',
      page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    };
  }

  function pageUrl(page) {
    const url = new URL(data.pageUrls[page - 1], location.href);
    if (state.category !== 'all') url.searchParams.set('category', state.category);
    if (state.year !== 'all') url.searchParams.set('year', state.year);
    url.hash = 'news-results';
    return url.href;
  }

  function writeState() {
    const url = location.protocol === 'file:' ? new URL(location.href) : new URL(data.pageUrls[state.page - 1], location.href);
    url.search = '';
    if (location.protocol === 'file:') url.searchParams.set('page', state.page);
    if (state.category !== 'all') url.searchParams.set('category', state.category);
    if (state.year !== 'all') url.searchParams.set('year', state.year);
    url.hash = 'news-results';
    history.pushState(null, '', url);
  }

  function createRow(item) {
    const row = rowTemplate.cloneNode(true);
    row.querySelector('a').setAttribute('href', item.href);
    const date = row.querySelector('time');
    date.dateTime = item.date;
    date.textContent = item.date.replaceAll('-', '.');
    row.querySelector('.news-category').textContent = item.categoryLabel;
    row.querySelector('.news-item-title').textContent = item.title;
    return row;
  }

  function pageControl(page, label, className, disabled = false, current = false) {
    const element = document.createElement(disabled || current ? 'span' : 'a');
    element.className = className;
    element.textContent = label;
    if (current) element.setAttribute('aria-current', 'page');
    else if (disabled) element.setAttribute('aria-disabled', 'true');
    else {
      element.href = pageUrl(page);
      element.dataset.newsPage = page;
    }
    return element;
  }

  function render({ updateUrl = false, scroll = false, animate = false } = {}) {
    const filtered = data.items.filter(item => (state.category === 'all' || item.category === state.category)
      && (state.year === 'all' || item.date.startsWith(state.year)));
    const pageCount = Math.max(1, Math.ceil(filtered.length / data.pageSize));
    state.page = Math.min(state.page, pageCount);
    const start = (state.page - 1) * data.pageSize;
    const items = filtered.slice(start, start + data.pageSize);
    list.replaceChildren(...items.map(createRow));
    empty.hidden = items.length > 0;
    count.replaceChildren(document.createTextNode(`全${filtered.length}件`));
    if (items.length) {
      const range = document.createElement('span');
      range.textContent = `${start + 1}–${start + items.length}件を表示`;
      count.append(range);
    }
    categoryButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.newsCategory === state.category)));
    yearSelect.value = state.year;
    reset.disabled = state.category === 'all' && state.year === 'all';

    const pages = document.createElement('ol');
    pages.className = 'news-page-numbers';
    for (let page = 1; page <= pageCount; page++) {
      const item = document.createElement('li');
      item.append(pageControl(page, String(page), 'news-page-number', false, page === state.page));
      pages.append(item);
    }
    pagination.replaceChildren(
      pageControl(state.page - 1, '← Prev', 'news-page-prev', state.page === 1),
      pages,
      pageControl(state.page + 1, 'Next →', 'news-page-next', state.page === pageCount)
    );
    pagination.hidden = !filtered.length;
    if (updateUrl) writeState();
    if (animate && !reduce.matches && typeof list.animate === 'function') {
      list.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 350, easing: 'ease-out' });
    }
    if (scroll) {
      results.focus({ preventScroll: true });
      window.scrollTo({ top: window.scrollY + results.getBoundingClientRect().top - 120, behavior: reduce.matches ? 'instant' : 'smooth' });
    }
  }

  categoryButtons.forEach(button => button.addEventListener('click', () => {
    if (state.category === button.dataset.newsCategory) return;
    state.category = button.dataset.newsCategory;
    state.page = 1;
    render({ updateUrl: true, animate: true });
  }));
  yearSelect.addEventListener('change', () => {
    state.year = yearSelect.value;
    state.page = 1;
    render({ updateUrl: true, animate: true });
  });
  reset.addEventListener('click', () => {
    state = { category: 'all', year: 'all', page: 1 };
    render({ updateUrl: true, animate: true });
  });
  pagination.addEventListener('click', event => {
    const link = event.target.closest('a[data-news-page]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    state.page = Number(link.dataset.newsPage);
    render({ updateUrl: true, scroll: true, animate: true });
  });
  window.addEventListener('popstate', () => {
    state = readState();
    render({ scroll: true });
  });
  state = readState();
  render();
})();
