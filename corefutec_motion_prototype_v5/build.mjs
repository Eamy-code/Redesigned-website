import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pageContent, extraPages, extraPageContent, localizeLinks } from './content/pages.mjs';
import { formatHtml } from './scripts/format-html.mjs';
import { renderNewsArchive, renderNewsArticle, findNewsItem, newsPageCount, newsArchivePath, newsImageFiles } from './content/news.mjs';

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(sourceDir, 'dist');

const links = {
  home: '/',
  services: '/services/',
  test: '/third-party-verification/',
  develop: '/software-development/',
  solution: '/solution/',
  strengths: '/strengths/',
  process: '/process/',
  product: '/product/',
  company: '/company/',
  recruit: '/recruit/',
  work: '/recruit/work/',
  people: '/recruit/people/',
  culture: '/recruit/culture/',
  training: '/recruit/training/',
  jobs: '/recruit/jobs/',
  entry: '/recruit/entry/',
  contact: '/contact/',
  news: '/category/information/'
};
const sections = [
  {
    name: 'サービス',
    en: 'Our Services',
    top: 'services',
    pages: [
      ['services', 'サービス一覧'],
      ['test', 'ソフトウェアテスト・第三者検証'],
      ['develop', 'ソフトウェア開発'],
      ['solution', 'ソリューション'],
      ['process', 'ご相談からの流れ']
    ]
  },
  {
    name: '私たちの強み',
    en: 'Our Strengths',
    top: 'strengths',
    pages: [
      ['strengths', '強みについて'],
      ['process', '仕事の進め方'],
      ['product', '自社製品について']
    ]
  },
  {
    name: '企業情報',
    en: 'About Us',
    top: 'company',
    pages: [
      ['company', '企業情報トップ'],
      ['news', 'お知らせ']
    ]
  },
  {
    name: '採用情報',
    en: 'Careers',
    top: 'recruit',
    pages: [
      ['recruit', '採用トップ'],
      ['work', '仕事内容'],
      ['people', '社員の声'],
      ['culture', '働く環境'],
      ['training', '研修・育成'],
      ['jobs', '募集要項'],
      ['entry', '応募・お問い合わせ']
    ]
  }
];
const r = (key, depth) => '../'.repeat(depth) + links[key].replace(/^\//, '') + (links[key] === '/' ? 'index.html' : 'index.html');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const a = (key, label, depth, cls = '') => `<a href="${r(key, depth)}"${cls ? ` class="${cls}"` : ''}>${label}</a>`;
const arrow = `<span class="arrow-orb" aria-hidden="true">↗</span>`;
const action = (key, label, depth, contrast = false) => a(key, `<span>${label}</span>${arrow}`, depth, contrast ? 'btn-arrow btn-arrow--light' : 'btn-arrow');

function header(depth, selected) {
  const menus = sections.map((g, i) => {
    const menuLinks = g.pages.map(([k, n], idx) => `<li>${a(k, `<span class="menu-no">${String(idx + 1).padStart(2, '0')}</span><span>${n}</span><span aria-hidden="true">↗</span>`, depth)}</li>`).join('');
    return `<div class="nav-item ${g.top === selected ? 'is-current' : ''}" data-mega-item="${i}">
      ${a(g.top, g.name, depth, 'nav-anchor')}<button class="nav-expand" aria-label="${g.name}のメニューを開閉" aria-controls="mega-${i}" aria-expanded="false" type="button">＋</button>
      <div class="mega-panel" id="mega-${i}" aria-hidden="true"><div class="mega-intro"><span class="eyebrow">EXPLORE / ${String(i + 1).padStart(2, '0')}</span><div class="mega-title">${g.en}<span class="mega-title-dot">.</span></div><p>${g.name}</p></div><ul class="mega-links">${menuLinks}</ul><div class="mega-cta">${action(g.top, 'もっと見る', depth)}</div></div>
    </div>`;
  }).join('');
  const mobiles = sections.map(g => `<div class="mobile-group"><div class="mobile-group-title">${g.name}</div>${g.pages.map(([k, n]) => a(k, `${n}<span>↗</span>`, depth)).join('')}</div>`).join('');
  return `<div class="site-bar"><header class="site-header" id="site-header"><div class="nav-shell">
    ${a('home', '<span class="logo-glyph"><i></i><i></i></span><span class="wordmark">CORE<span>FUTEC</span><small>Co., Ltd.</small></span>', depth, 'brand')}
    <nav class="site-nav" aria-label="グローバルナビゲーション">${menus}<a href="${r('news', depth)}" class="plain-nav"${selected === 'news' ? ' aria-current="page"' : ''}>お知らせ</a></nav>
    ${a('contact', 'お問い合わせ <span aria-hidden="true">●</span>', depth, 'header-contact')}
    <button class="hamburger" type="button" aria-expanded="false" aria-controls="mobile-drawer" aria-label="メニューを開く"><span></span><span></span></button>
  </div></header><div class="mega-scrim" aria-hidden="true"></div>
  <div class="mobile-drawer" id="mobile-drawer" inert><div class="mobile-drawer-inner">${mobiles}${a('contact', 'お問い合わせ ↗', depth, 'mobile-contact')}</div></div></div>`;
}
function footer(depth) {
  return `<footer class="site-footer"><div class="footer-upper"><div><span class="eyebrow">THE NEXT STEP</span><p>次の品質を、<br>ともにつくる。</p></div><div>${action('contact', 'お問い合わせ', depth, true)}${action('recruit', '採用情報', depth, true)}</div></div><div class="footer-word">CORE<span>FUTEC</span><sup>®</sup></div><div class="footer-bottom"><small>© CORE FUTEC Co., Ltd.</small><nav>${a('services', '事業内容', depth)}${a('company', '企業情報', depth)}${a('recruit', '採用情報', depth)}${a('news', 'お知らせ', depth)}</nav><span>DESIGN CONCEPT / 2026</span></div></footer>`;
}
function pageWrap({ depth = 0, selected = '', title = 'CORE FUTEC', description = '', body = '', cls = '', styles = [], scripts = [] }) {
  const extraStyles = styles.map(file => `<link rel="stylesheet" href="${'../'.repeat(depth)}${file}">`).join('');
  const extraScripts = scripts.map(file => `<script defer src="${'../'.repeat(depth)}${file}"></script>`).join('');
  const formScript = /(?:^|\s)page-(contact|entry)(?:\s|$)/.test(cls) ? `<script defer src="${'../'.repeat(depth)}assets/js/contact-form.js"></script>` : '';
  return `<!doctype html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f5f6f7"><meta name="description" content="${esc(description || 'コアフューテックのコーポレートサイト・採用サイト統合リニューアル。静的デザインプロトタイプ。')}"><title>${esc(title)} | コアフューテック</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="${'../'.repeat(depth)}assets/css/style.css"><link rel="stylesheet" href="${'../'.repeat(depth)}assets/css/page-variants.css">${extraStyles}</head><body class="${cls}"><a class="skip-link" href="#main">本文へ移動</a>${header(depth, selected)}<main id="main">${body}</main>${footer(depth)}<script defer src="${'../'.repeat(depth)}assets/js/motion.js"></script>${formScript}${extraScripts}</body></html>`;
}
const smallHead = (eyebrow, title, desc = '') => `<div class="section-heading"><div><span class="eyebrow" data-reveal="left">${eyebrow}</span><h2 class="display-head" data-reveal="left">${title}</h2></div>${desc ? `<p class="section-desc" data-reveal="left">${desc}</p>` : ''}</div>`;
const pageData = {
  services: {
    label: 'サービス',
    eyebrow: 'WHAT WE DO',
    title: 'Technology is<br><i>our language.</i>',
    lead: 'ソフトウェアの品質と開発を、技術の視点から支えます。',
    intro: '3つの事業領域',
    items: [
      ['Software Testing', '第三者検証・ソフトウェアテスト', 'test'],
      ['Development', 'ソフトウェア開発', 'develop'],
      ['Solutions', 'ソリューション', 'solution']
    ]
  },
  test: {
    label: 'ソフトウェアテスト・第三者検証',
    eyebrow: 'SOFTWARE TESTING',
    title: 'Test for<br><i>confidence.</i>',
    lead: '私たちはソフト開発プロジェクトの伴走者です',
    intro: '対象となるテーマ',
    items: [
      ['Verification', '第三者の立場による検証', 'test'],
      ['Process', '品質を確かめるプロセス', 'process'],
      ['Talk to us', '検証について相談する', 'contact']
    ]
  },
  develop: {
    label: 'ソフトウェア開発',
    eyebrow: 'SOFTWARE DEVELOPMENT',
    title: 'Built to<br><i>move forward.</i>',
    lead: '革新的な技術ソリューションでビジネスを支える',
    intro: '関連する入口',
    items: [
      ['Engineering', '開発のご相談', 'contact'],
      ['Quality', 'テスト・検証', 'test'],
      ['Approach', '仕事の進め方', 'process']
    ]
  },
  solution: {
    label: 'ソリューション',
    eyebrow: 'SOLUTIONS',
    title: 'Find a better<br><i>answer.</i>',
    lead: 'ログ解析ソリューション・セキュリティ診断',
    intro: '関連する入口',
    items: [
      ['Technology', '関連する技術分野', 'services'],
      ['Experience', '私たちの強み', 'strengths'],
      ['Discuss', 'お問い合わせ', 'contact']
    ]
  },
  strengths: {
    label: '私たちの強み',
    eyebrow: 'OUR STRENGTHS',
    title: 'Quality starts<br><i>with people.</i>',
    lead: '経験、技術、向き合い方。品質を支える要素をご紹介します。',
    intro: '詳しく知る',
    items: [
      ['Testing', 'ソフトウェアテスト', 'test'],
      ['Engineering', '開発について', 'develop'],
      ['Process', '仕事の進め方', 'process']
    ]
  },
  process: {
    label: 'ご相談からの流れ',
    eyebrow: 'OUR PROCESS',
    title: 'A clearer<br><i>process.</i>',
    lead: 'ソフトウェア開発とログ解析ソリューションの、システム構築の流れをご紹介します。',
    intro: 'システム構築の流れ',
    items: [
      ['01 / Listen', 'ご相談・ヒアリング', 'contact'],
      ['02 / Propose', '対応範囲・進め方の確認', 'contact'],
      ['03 / Execute', '実施・結果共有', 'contact']
    ]
  },
  product: {
    label: '自社製品',
    eyebrow: 'OUR PRODUCTS',
    title: 'Tools for<br><i>everyday work.</i>',
    lead: '自社製品「e伝之介くん」についてご紹介します。',
    intro: '関連情報',
    items: [
      ['Product', '製品について相談', 'contact'],
      ['Solutions', '関連ソリューション', 'solution'],
      ['Company', '企業情報', 'company']
    ]
  },
  company: {
    label: '企業情報',
    eyebrow: 'ABOUT US',
    title: 'Behind the<br><i>technology.</i>',
    lead: 'コアフューテックの会社情報、企業理念、取り組みをご案内します。',
    intro: '企業情報を知る',
    items: [
      ['Our Business', '事業内容', 'services'],
      ['Our Thinking', '強み・品質への考え方', 'strengths'],
      ['Work With Us', '採用情報', 'recruit']
    ]
  },
  recruit: {
    label: '採用情報',
    eyebrow: 'CAREERS AT CORE FUTEC',
    title: 'Create what<br><i>comes next.</i>',
    lead: '技術を学び、仕事を知り、仲間とともに前へ。',
    intro: 'コアフューテックで働く',
    items: [
      ['01 / Work', '仕事を知る', 'work'],
      ['02 / People', '社員の声', 'people'],
      ['03 / Culture', '働く環境を知る', 'culture'],
      ['04 / Growth', '研修・育成制度', 'training'],
      ['05 / Jobs', '募集要項', 'jobs'],
      ['06 / Entry', '応募・採用問い合わせ', 'entry']
    ]
  },
  work: {
    label: '仕事内容',
    eyebrow: 'OUR WORK',
    title: 'Work with<br><i>purpose.</i>',
    lead: 'ソフトウェアテストや開発に関わる仕事をご紹介します。',
    intro: '仕事とキャリア',
    items: [
      ['Testing', 'ソフトウェアテスト', 'test'],
      ['Development', 'ソフトウェア開発', 'develop'],
      ['Growth', '研修・育成制度', 'training']
    ]
  },
  people: {
    label: '社員の声',
    eyebrow: 'OUR PEOPLE',
    title: 'Every person<br><i>matters.</i>',
    lead: '先輩の言葉',
    intro: '採用情報',
    items: [
      ['Work', '仕事内容', 'work'],
      ['Culture', '働く環境', 'culture'],
      ['Jobs', '募集要項', 'jobs']
    ]
  },
  culture: {
    label: '働く環境',
    eyebrow: 'OUR CULTURE',
    title: 'Belong and<br><i>build.</i>',
    lead: '部署のご紹介・職場の雰囲気',
    intro: '採用について知る',
    items: [
      ['Work', '仕事内容', 'work'],
      ['Growth', '研修・育成', 'training'],
      ['Jobs', '募集要項', 'jobs']
    ]
  },
  training: {
    label: '研修・育成制度',
    eyebrow: 'LEARNING & GROWTH',
    title: 'Keep<br><i>growing.</i>',
    lead: '質の高いITエンジニアを育てる',
    intro: '採用について知る',
    items: [
      ['Work', '仕事内容', 'work'],
      ['People', '社員の声', 'people'],
      ['Jobs', '募集要項', 'jobs']
    ]
  },
  jobs: {
    label: '募集要項',
    eyebrow: 'OPEN POSITIONS',
    title: 'Your next<br><i>chapter.</i>',
    lead: '新卒採用募集要項・キャリア採用募集要項',
    intro: '応募に向けて',
    items: [
      ['Conditions', '新卒・キャリアの募集要項', 'jobs'],
      ['Culture', '働く環境', 'culture'],
      ['Entry', '採用お問い合わせ', 'entry']
    ]
  },
  entry: {
    label: '応募・採用お問い合わせ',
    eyebrow: 'CAREERS / ENTRY',
    title: 'Let’s start<br><i>a conversation.</i>',
    lead: '採用応募・お問い合わせのご案内',
    intro: '応募前の確認',
    items: [
      ['Jobs', '募集要項', 'jobs'],
      ['Culture', '働く環境', 'culture'],
      ['Contact', '一般お問い合わせ', 'contact']
    ]
  },
  contact: {
    label: 'お問い合わせ',
    eyebrow: 'CONTACT',
    title: 'Let’s talk<br><i>quality.</i>',
    lead: 'サービス・製品・事業に関するお問合せ',
    intro: 'お問い合わせの対象',
    items: [
      ['Testing', 'ソフトウェアテストについて', 'test'],
      ['Development', '開発について', 'develop'],
      ['Careers', '採用関連のご相談', 'entry']
    ]
  },
  news: {
    label: 'お知らせ',
    eyebrow: 'INFORMATION',
    title: 'News &<br><i>updates.</i>',
    lead: 'お知らせ',
    intro: '関連コンテンツ',
    items: [
      ['Services', 'サービスについて', 'services'],
      ['Company', '企業情報', 'company']
    ]
  }
};

const recruitKeys = new Set(['recruit', 'work', 'people', 'culture', 'training', 'jobs', 'entry']);
const archetypes = {
  services: 'editorial',
  company: 'editorial',
  recruit: 'poster',
  test: 'technical',
  develop: 'technical',
  solution: 'technical',
  strengths: 'narrative',
  process: 'timeline',
  work: 'narrative',
  people: 'portrait',
  culture: 'collage',
  training: 'timeline',
  jobs: 'practical',
  entry: 'practical',
  contact: 'practical',
  news: 'journal',
  product: 'product'
};
function navContext(key, depth) {
  return recruitKeys.has(key) ? `<aside class="recruit-tabs" aria-label="採用ページ">${[
    ['recruit', 'TOP'],
    ['work', 'WORK'],
    ['people', 'PEOPLE'],
    ['culture', 'CULTURE'],
    ['training', 'GROWTH'],
    ['jobs', 'JOBS'],
    ['entry', 'ENTRY']
  ].map(([k, n]) => a(k, n, depth, key === k ? 'active' : '')).join('')}</aside>` : '';
}
function pageNote() {
  return '';
}
function routeList(p, depth, variation = 'horizontal') {
  return `<div class="route-list route-list--${variation}">${p.items.map(([name, desc, key], i) => `<a class="route-item" href="${r(key, depth)}"><span class="route-index">${String(i + 1).padStart(2, '0')}</span><div><h3>${name}</h3><p>${desc}</p></div><span class="route-arrow">↗</span></a>`).join('')}</div>`;
}
function nextBlock(key, depth) {
  const recruit = recruitKeys.has(key);
  const target = recruit ? 'jobs' : 'contact';
  return `<section class="next-action"><span class="eyebrow" data-reveal="left">MAKE A CONNECTION</span><h2 data-reveal="left">Let’s take<br>the next step<span>.</span></h2>${action(target, recruit ? '募集要項を見る' : 'お問い合わせ', depth, true)}</section>`;
}
function visualMotif(key) {
  if (key === 'test') return `<div class="verification-console"><div class="console-top"><span>QUALITY CHECK / 01</span><b>● ● ●</b></div><div class="verification-grid">${Array.from({ length: 42 }, (_, i) => `<i class="${[2, 7, 15, 20, 29, 35, 40].includes(i) ? 'passed' : ''}"></i>`).join('')}</div><span class="console-caption">VERIFY / OBSERVE / REFINE</span></div>`;
  if (key === 'develop') return `<div class="architecture-art"><div class="architecture-sheet"><span>01 / STRUCTURE</span><b>DESIGN</b><i></i></div><div class="architecture-sheet"><span>02 / ENGINEER</span><b>BUILD</b><i></i></div><div class="architecture-sheet"><span>03 / IMPROVE</span><b>EVOLVE</b><i></i></div><div class="architecture-axis">BUILD ↗</div></div>`;
  if (key === 'solution') return `<div class="solution-art"><div class="solution-loop"><span>CF.</span></div><b>THINK / CONNECT / SOLVE</b></div>`;
  return '';
}
function technicalPage(key, p, depth) {
  return `<section class="variant-hero variant-hero--technical theme-${key}"><div class="variant-copy"><span class="eyebrow">${p.eyebrow} / ${p.label}</span><h1 data-reveal="left">${p.title}</h1><p>${p.lead}</p><span class="hero-footnote">01 / ENGINEERING</span></div><div class="variant-art" aria-hidden="true">${visualMotif(key)}</div></section><section class="design-story"><div class="story-aside"><span class="eyebrow">EXPLORE</span><p>${p.intro}</p></div>${routeList(p, depth, 'rows')}</section>${nextBlock(key, depth)}`;
}
function editorialPage(key, p, depth) {
  const isCompany = key === 'company';
  return `<section class="variant-hero variant-hero--editorial theme-${key}"><span class="eyebrow" data-reveal="left">${p.eyebrow}</span><div class="editorial-hero-grid"><h1 data-reveal="left">${p.title}</h1><div class="editorial-graphic" aria-hidden="true"><span>${isCompany ? 'CORE /' : 'MAKE /'}</span><strong>${isCompany ? 'CF.' : '03'}</strong><i></i><small>${isCompany ? 'ENGINEERING COMPANY' : 'THREE BUSINESS FIELDS'}</small></div></div><div class="editorial-hero-bottom"><p>${p.lead}</p><span>CORE FUTEC / ${p.label}</span></div></section><section class="editorial-index section-pad">${smallHead('EXPLORE / OUR WORLD', p.intro)}${routeList(p, depth, 'editorial')}${pageNote()}</section>${nextBlock(key, depth)}`;
}
function posterPage(key, p, depth) {
  return `<section class="variant-hero variant-hero--poster theme-recruit"><div class="poster-pin"><span class="eyebrow">${p.eyebrow}</span><span class="poster-edition">JOIN OUR JOURNEY / 2026</span></div><div class="poster-lines" aria-hidden="true"><span>CREATE</span><span>THE FUTURE</span></div><h1 data-reveal="left">${p.title}</h1><p>${p.lead}</p><div class="poster-vertical" aria-hidden="true">CONNECT TO TOMORROW ↗</div></section>${navContext(key, depth)}<section class="recruit-route section-pad">${smallHead('PEOPLE / WORK / CULTURE', 'Find your <span class="blue-period">path.</span>', '知りたいことから、コアフューテックの仕事へ。')}${routeList(p, depth, 'recruit')}${pageNote()}</section>${nextBlock(key, depth)}`;
}
function narrativePage(key, p, depth) {
  return `<section class="variant-hero variant-hero--narrative theme-${key}"><div class="narrative-hero-plate"><span class="eyebrow">${p.eyebrow}</span><h1 data-reveal="left">${p.title}</h1><span class="narrative-side-word" aria-hidden="true">${key === 'strengths' ? 'PERSPECTIVE' : 'EXPERIENCE'}</span></div><p class="narrative-lead">${p.lead}</p></section>${navContext(key, depth)}<section class="narrative-sections"><div class="narrative-sticky"><span class="eyebrow">${p.intro}</span><h2 data-reveal="left">Explore<br>the details<span>.</span></h2></div><div class="narrative-chapters">${p.items.map(([en, ja, target], i) => `<a href="${r(target, depth)}" class="narrative-chapter" data-reveal="left"><span>0${i + 1} /</span><h3>${en}</h3><p>${ja}</p><b>↗</b></a>`).join('')}</div></section><div class="note-wrap">${pageNote()}</div>${nextBlock(key, depth)}`;
}
function timelinePage(key, p, depth) {
  return `<section class="variant-hero variant-hero--timeline theme-${key}"><span class="eyebrow">${p.eyebrow}</span><div class="timeline-heading"><h1 data-reveal="left">${p.title}</h1><p>${p.lead}</p></div><span class="timeline-watermark" aria-hidden="true">01—03</span></section>${navContext(key, depth)}<section class="process-track section-pad"><div class="process-intro"><span class="eyebrow">${p.intro}</span><h2>Step by<br>step<span>.</span></h2></div><div>${pageContent(key, depth)}</div></section>${nextBlock(key, depth)}`;
}
function portraitPage(key, p, depth) {
  return `<section class="variant-hero variant-hero--portrait"><span class="eyebrow">${p.eyebrow}</span><div class="portrait-hero-grid"><h1 data-reveal="left">${p.title}</h1><div class="portrait-frame" aria-label="社員写真の掲載予定位置"><span>PORTRAIT / PHOTO PENDING</span><b>PEOPLE</b></div></div><p>${p.lead}</p></section>${navContext(key, depth)}<section class="portrait-info section-pad"><div>${pageContent(key, depth)}</div></section>${nextBlock(key, depth)}`;
}
function collagePage(key, p, depth) {
  return `<section class="variant-hero variant-hero--collage"><div><span class="eyebrow">${p.eyebrow}</span><h1 data-reveal="left">${p.title}</h1><p>${p.lead}</p></div><div class="culture-tiles" aria-label="社内写真の配置を検討するエリア"><span>01 / TEAMS</span><span>02 / OFFICE</span><span>03 / CULTURE</span></div></section>${navContext(key, depth)}<section class="culture-statement section-pad"><div>${pageContent(key, depth)}</div></section>${nextBlock(key, depth)}`;
}
function practicalPage(key, p, depth) {
  return `<section class="variant-hero variant-hero--practical theme-${key}"><div><span class="eyebrow">${p.eyebrow}</span><h1 data-reveal="left">${p.title}</h1></div><div class="practical-summary"><p>${p.lead}</p><span>INFORMATION & NEXT STEPS</span></div></section>${navContext(key, depth)}<section class="practical-body section-pad"><div class="practical-main">${key !== 'jobs' ? '<p class="form-warning">この静的サイトからは送信できません。</p>' : ''}${pageContent(key, depth)}${routeList(p, depth, 'rows')}</div></section>${nextBlock(key, depth)}`;
}
function journalPage(key, p, depth, page = 1) {
  return renderNewsArchive(depth, page);
}
function productPage(key, p, depth) {
  return `<section class="variant-hero variant-hero--product"><span class="eyebrow">${p.eyebrow}</span><div class="product-grid"><div><h1 data-reveal="left">${p.title}</h1><p>${p.lead}</p>${action('contact', '製品について相談する', depth)}</div><div class="product-symbol" aria-hidden="true"><span>e</span><small>PRODUCT / TECHNOLOGY</small></div></div></section><section class="product-information section-pad"><span class="eyebrow">OUR PRODUCT</span><h2>e伝之介くん</h2>${pageContent(key, depth)}${routeList(p, depth, 'rows')}${pageNote()}</section>${nextBlock(key, depth)}`;
}
const renderArchetype = {
  editorial: editorialPage,
  poster: posterPage,
  technical: technicalPage,
  narrative: narrativePage,
  timeline: timelinePage,
  portrait: portraitPage,
  collage: collagePage,
  practical: practicalPage,
  journal: journalPage,
  product: productPage
};
function inside(key, depth, page = 1) {
  const p = pageData[key];
  const selected = key === 'news' ? 'news' : recruitKeys.has(key) ? 'recruit' : sections.find(g => g.pages.some(([k]) => k === key))?.top || key;
  let body = renderArchetype[archetypes[key]](key, p, depth, page);
  if (!['timeline', 'portrait', 'collage', 'practical', 'journal', 'product'].includes(archetypes[key])) {
    body = body.replace('<section class="next-action">', `<section class="section-pad">${pageContent(key, depth)}</section><section class="next-action">`);
  }
  return pageWrap({
    depth,
    title: key === 'news' && page > 1 ? p.label + ' (' + page + ')' : p.label,
    description: key === 'news' ? 'コアフューテックからのお知らせ。採用情報、企業情報、メディア掲載のお知らせをご覧いただけます。' : '',
    styles: key === 'news' ? ['assets/css/news.css'] : [],
    scripts: key === 'news' ? ['assets/js/news.js'] : [],
    selected,
    cls: `page-variant page-${key}${recruitKeys.has(key) ? ' is-recruit' : ''}`,
    body
  });
}
async function build() {
  const homeHtml = await readFile(path.join(sourceDir, 'index.html'), 'utf8');
  const sitePages = [
    ...Object.entries(links).map(([key, slug]) => ({
      path: slug,
      title: key === 'home' ? 'ホーム' : pageData[key].label
    })),
    ...Array.from({ length: newsPageCount - 1 }, (_, index) => ({ path: newsArchivePath(index + 2), title: pageData.news.label + ' (' + (index + 2) + ')' })),
    ...extraPages
  ];
  // Source HTML links to generated pages for direct previews; dist uses its own root.
  const generatedHomeHtml = homeHtml.replaceAll('href="dist/', 'href="');
  const all = [['index.html', localizeLinks(generatedHomeHtml, 0)]];
  for (const [key, slug] of Object.entries(links)) {
    if (key === 'home') continue;
    const rel = slug.replace(/^\//, '') + 'index.html';
    const depth = rel.split('/').length - 1;
    all.push([rel, inside(key, depth)]);
  }
  for (let page = 2; page <= newsPageCount; page++) {
    const file = newsArchivePath(page).replace(/^\//, '') + 'index.html';
    all.push([file, inside('news', file.split('/').length - 1, page)]);
  }
  for (const page of extraPages) {
    const rel = page.path.replace(/^\//, '') + 'index.html';
    const depth = rel.split('/').length - 1;
    const isRecruit = page.path.startsWith('/recruit/');
    const newsItem = findNewsItem(page.path);
    const body = newsItem ? renderNewsArticle(newsItem, depth) : `<section class="section-pad"><h1>${esc(page.title)}</h1>${extraPageContent(page, depth, sitePages)}</section>${nextBlock(isRecruit ? 'recruit' : 'company', depth)}`;
    all.push([
      rel,
      pageWrap({
        depth,
        title: newsItem?.title || page.title,
        description: newsItem?.summary || '',
        styles: newsItem ? ['assets/css/news.css'] : [],
        selected: newsItem ? 'news' : isRecruit ? 'recruit' : 'company',
        cls: newsItem ? 'page-variant page-news-article' : `page-variant page-content${isRecruit ? ' is-recruit' : ''}`,
        body
      })
    ]);
  }
  for (const [file, html] of all) {
    const destination = path.join(outDir, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file === 'index.html' ? html : formatHtml(html), 'utf8');
  }
  for (const name of [
    'css/style.css',
    'css/page-variants.css',
    'css/home.css',
    'css/news.css',
    'js/motion.js',
    'js/home-intro.js',
    'js/home-scroll.js',
    'js/news.js',
    'js/contact-form.js',
    'animations/brand-animation.html',
    'images/e-dennosuke.jpg',
    'images/company-map.svg',
    ...newsImageFiles,
    'images/about-experience.png',
    'images/about-istqb.png',
    'images/about-quality.png',
    'images/recruit-teamwork.png',
    'vendor/bootstrap-grid.css',
    'vendor/bootstrap-LICENSE.txt',
    'vendor/bootstrap-icons/LICENSE.txt',
    'vendor/bootstrap-icons/patch-check.svg',
    'vendor/bootstrap-icons/bullseye.svg',
    'vendor/bootstrap-icons/bug.svg',
    'vendor/bootstrap-icons/clock-history.svg'
  ]) {
    const destination = path.join(outDir, 'assets', name);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(sourceDir, 'assets', name), destination);
  }
  console.log(`Built ${all.length} static HTML pages in ${outDir}`);
}
build().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
