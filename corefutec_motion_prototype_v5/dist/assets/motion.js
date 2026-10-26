(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('#site-header');
  const menus = [...document.querySelectorAll('[data-mega-item]')];
  const scrim = document.querySelector('.mega-scrim');
  const burger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.mobile-drawer');
  let current = null;
  let closeTimer;

  function setMenu(next) {
    if (current === next) return;
    current = next;
    menus.forEach((item, i) => {
      const open = i === next;
      item.classList.toggle('is-open', open);
      item.querySelector('.nav-expand').setAttribute('aria-expanded', String(open));
      item.querySelector('.mega-panel').setAttribute('aria-hidden', String(!open));
    });
    document.body.classList.toggle('menu-open', next !== null);
  }
  menus.forEach((item, index) => {
    // The heading remains a real hyperlink; the + button opens by click/touch.
    item.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      clearTimeout(closeTimer);
      setMenu(index);
    });
    item.addEventListener('pointerleave', () => {
      clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => setMenu(null), 125);
    });
    item.addEventListener('focusin', () => { clearTimeout(closeTimer); setMenu(index); });
    item.addEventListener('focusout', event => {
      if (!item.contains(event.relatedTarget)) setMenu(null);
    });
    item.querySelector('.nav-expand').addEventListener('click', event => {
      event.preventDefault();
      setMenu(current === index ? null : index);
    });
  });
  scrim?.addEventListener('click', () => setMenu(null));
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    setMenu(null);
    if (drawer?.classList.contains('is-open')) setDrawer(false);
  });
  function setDrawer(open) {
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    drawer?.classList.toggle('is-open', open);
    drawer.inert = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('menu-open', open);
  }
  burger?.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
  window.matchMedia('(min-width: 951px)').addEventListener('change', e => {
    if (e.matches && drawer?.classList.contains('is-open')) setDrawer(false);
  });

  // Reuse the same reveal for headings and their labels across all templates.
  // A heading inside an animated row/card already moves with its parent.
  document.querySelectorAll('main h1, main h2, main h3, main .eyebrow, .footer-upper .eyebrow, .footer-upper p').forEach(el => {
    if (!el.hasAttribute('data-reveal') && !el.closest('[data-reveal="left"]')) el.setAttribute('data-reveal', 'left');
  });
  const reveals = document.querySelectorAll('[data-reveal="left"]');
  function revealElement(element) {
    if (element.classList.contains('is-visible')) return;
    element.classList.add('is-visible');
    if (reduce.matches || typeof element.animate !== 'function') return;
    const heading = element.matches('h1, h2, h3, .eyebrow');
    if (heading) element.classList.add('is-revealing');
    let animation;
    try {
      animation = element.animate(heading ? [
        { maskPosition: '100% 0%', webkitMaskPosition: '100% 0%' },
        { maskPosition: '0% 0%', webkitMaskPosition: '0% 0%' }
      ] : [
        { opacity: 0, transform: 'translate3d(0,16px,0)' },
        { opacity: 1, transform: 'translate3d(0,0,0)' }
      ], {
        duration: heading ? 1300 : 600,
        easing: heading ? 'cubic-bezier(.45,0,.25,1)' : 'cubic-bezier(.22,1,.36,1)',
        fill: 'both'
      });
    } catch {
      element.classList.remove('is-revealing');
      return;
    }
    animation.finished.then(() => {
      element.classList.remove('is-revealing');
      animation.cancel();
    }, () => element.classList.remove('is-revealing'));
  }
  if (reduce.matches || !('IntersectionObserver' in window)) {
    reveals.forEach(element => element.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealElement(entry.target);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: '0px 0px 40px 0px' });
    reveals.forEach(element => observer.observe(element));
  }

  const cards = [...document.querySelectorAll('[data-stack] .stack-card')];
  let queued = false;
  function scrubCards() {
    queued = false;
    if (!cards.length || reduce.matches) return;
    const vh = window.innerHeight;
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      const nextTop = next.getBoundingClientRect().top;
      // Start reacting before the next card reaches the sticky card's top.
      // Changes are frame-by-frame, tied to actual scroll position.
      const progress = Math.max(0, Math.min(1, (vh * .90 - nextTop) / (vh * .90 - 124)));
      card.style.setProperty('--stack-scale', (1 - .065 * progress).toFixed(4));
      card.style.setProperty('--stack-shift', `${(-17 * progress).toFixed(1)}px`);
      card.style.boxShadow = `0 ${30 - 14 * progress}px ${70 - 30 * progress}px rgba(8,25,65,${.13 + .08 * progress})`;
    });
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const travel = Math.max(-50, Math.min(50, (vh * .5 - (rect.top + rect.height * .5)) * .13));
      card.style.setProperty('--art-parallax', `${travel.toFixed(1)}px`);
    });
  }
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scrubCards);
  }
  if (cards.length && !reduce.matches) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    scrubCards();
  }
  window.addEventListener('scroll', () => {
    if (current !== null) setMenu(null);
  }, { passive: true });
  // Header remains visible on scroll. Links are plain local HTML paths
  // so the prototype works without a server and is WordPress-ready.
  header?.setAttribute('data-enhanced', 'true');
})();
