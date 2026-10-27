(() => {
  'use strict';
  const main = document.querySelector('#main');
  const hero = main?.querySelector('.hero');
  const slot = hero?.querySelector('.home-animation-slot');
  const content = main?.querySelector('.home-content');
  const recruit = main?.querySelector('.home-recruit');
  const footer = document.querySelector('.home-footer');
  if (!slot || !content) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const properties = [
    '--content-inset',
    '--content-radius',
    '--content-lift',
    '--signature-opacity',
    '--signature-offset'
  ];
  const recruitProperties = [
    '--recruit-scale',
    '--recruit-shift',
    '--recruit-radius-extra',
    '--recruit-image-offset'
  ];
  const footerProperties = [
    '--footer-offset',
    '--footer-opacity',
    '--footer-word-offset'
  ];
  let scrollStart = 0;
  let scrollDistance = 1;
  let maximumLift = 0;
  let initialInset = 0;
  let initialRadius = 0;
  let queued = false;

  function renderScroll() {
    queued = false;
    if (reduce.matches) return;
    const recruitBounds = recruit?.getBoundingClientRect();
    const footerBounds = footer?.getBoundingClientRect();
    const introActive = document.documentElement.classList.contains('home-intro-active');
    const progress = introActive ? 0 : Math.max(0, Math.min(1, (window.scrollY - scrollStart) / scrollDistance));
    const eased = progress * progress * (3 - 2 * progress);
    main.style.setProperty('--content-inset', (initialInset * (1 - eased)).toFixed(2) + 'px');
    main.style.setProperty('--content-radius', (initialRadius * (1 - eased)).toFixed(2) + 'px');
    main.style.setProperty('--content-lift', (maximumLift * progress).toFixed(2) + 'px');
    main.style.setProperty('--signature-opacity', Math.max(0, 1 - progress / .8).toFixed(3));
    main.style.setProperty('--signature-offset', (-80 * eased).toFixed(2) + 'px');
    if (recruitBounds) {
      const viewportHeight = window.innerHeight;
      const entryProgress = Math.max(0, Math.min(1,
        (viewportHeight * .94 - recruitBounds.top) / (viewportHeight * .68)
      ));
      const entryEased = entryProgress * entryProgress * (3 - 2 * entryProgress);
      const imageProgress = Math.max(0, Math.min(1,
        (viewportHeight - recruitBounds.top) / (viewportHeight + recruitBounds.height)
      ));
      recruit.style.setProperty('--recruit-scale', (.94 + .06 * entryEased).toFixed(4));
      recruit.style.setProperty('--recruit-shift', (52 * (1 - entryEased)).toFixed(2) + 'px');
      recruit.style.setProperty('--recruit-radius-extra', (16 * (1 - entryEased)).toFixed(2) + 'px');
      recruit.style.setProperty('--recruit-image-offset', (2 - 4 * imageProgress).toFixed(3) + '%');
    }
    if (footerBounds) {
      const viewportHeight = window.innerHeight;
      const distance = Math.max(1, Math.min(footerBounds.height, viewportHeight) - viewportHeight * .1);
      const footerProgress = Math.max(0, Math.min(1,
        (viewportHeight * .9 - footerBounds.top) / distance
      ));
      const footerEased = footerProgress * footerProgress * (3 - 2 * footerProgress);
      const offset = Math.min(120, footerBounds.height * .2);
      footer.style.setProperty('--footer-offset', (-offset * (1 - footerEased)).toFixed(2) + 'px');
      footer.style.setProperty('--footer-opacity', (.65 + .35 * footerEased).toFixed(3));
      footer.style.setProperty('--footer-word-offset', (56 * (1 - footerEased)).toFixed(2) + 'px');
    }
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
      recruitProperties.forEach(property => recruit?.style.removeProperty(property));
      footerProperties.forEach(property => footer?.style.removeProperty(property));
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

// Strengths: icon scale-in and clipped text rise, triggered per row.
(() => {
  'use strict';
  const items = document.querySelectorAll('.home-strength-item');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!items.length || reduce.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-strength-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -20% 0px', threshold: 0 });

  items.forEach((item, index) => {
    item.style.setProperty('--strength-delay', String(index * 100) + 'ms');
    observer.observe(item);
  });

  reduce.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    items.forEach(item => item.classList.remove('is-strength-visible'));
  });
})();
