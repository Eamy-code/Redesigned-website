(() => {
  'use strict';
  const main = document.querySelector('#main');
  const hero = main?.querySelector('.hero');
  const slot = hero?.querySelector('.home-animation-slot');
  const content = main?.querySelector('.home-content');
  if (!slot || !content) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const properties = ['--content-inset', '--content-radius', '--content-lift', '--signature-opacity', '--signature-offset'];
  let scrollStart = 0;
  let scrollDistance = 1;
  let maximumLift = 0;
  let initialInset = 0;
  let initialRadius = 0;
  let queued = false;

  function renderScroll() {
    queued = false;
    if (reduce.matches) return;
    const introActive = document.documentElement.classList.contains('home-intro-active');
    const progress = introActive ? 0 : Math.max(0, Math.min(1, (window.scrollY - scrollStart) / scrollDistance));
    const eased = progress * progress * (3 - 2 * progress);
    main.style.setProperty('--content-inset', (initialInset * (1 - eased)).toFixed(2) + 'px');
    main.style.setProperty('--content-radius', (initialRadius * (1 - eased)).toFixed(2) + 'px');
    main.style.setProperty('--content-lift', (maximumLift * progress).toFixed(2) + 'px');
    main.style.setProperty('--signature-opacity', Math.max(0, 1 - progress / .8).toFixed(3));
    main.style.setProperty('--signature-offset', (-80 * eased).toFixed(2) + 'px');
  }

  function measure() {
    if (reduce.matches) return;
    const stageHeight = slot.offsetHeight;
    scrollStart = main.getBoundingClientRect().top + window.scrollY;
    scrollDistance = Math.max(240, Math.min(window.innerHeight * .55, stageHeight * .72));
    maximumLift = Math.max(0, stageHeight - scrollDistance - 64);
    initialInset = Math.min(document.documentElement.clientWidth * .025, 40);
    initialRadius = Math.min(document.documentElement.clientWidth * .04, 48);
    renderScroll();
  }

  function queueRender() {
    if (queued || reduce.matches) return;
    queued = true;
    window.requestAnimationFrame(renderScroll);
  }

  function configure() {
    document.body.classList.toggle('home-scroll-enabled', !reduce.matches);
    if (reduce.matches) {
      properties.forEach(property => main.style.removeProperty(property));
    } else {
      measure();
    }
  }

  window.addEventListener('scroll', queueRender, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  reduce.addEventListener('change', configure);
  configure();
})();
