(() => {
  'use strict';
  const slot = document.querySelector('.home-animation-slot');
  const player = slot?.querySelector('.home-animation-player');
  const frame = player?.querySelector('iframe');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!frame || reduce.matches || location.hash || window.scrollY > 0) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'home-intro-backdrop';
  document.body.append(backdrop);

  const backgroundElements = [...document.querySelectorAll('#main, .site-bar, .site-footer, .skip-link')];
  const previousInert = backgroundElements.map(element => element.inert);
  backgroundElements.forEach(element => {
    element.inert = true;
  });
  const navigationItems = [...document.querySelectorAll('.site-header .nav-item, .site-header .plain-nav, .site-header .header-contact')];
  navigationItems.forEach((item, index) => item.style.setProperty('--home-nav-delay', `${.15 + index * .06}s`));
  document.documentElement.classList.add('home-intro-active');
  player.classList.add('is-intro');
  let started = false;
  let docking = false;
  let finished = false;
  let transition;
  let completionTimer;
  const readinessTimer = window.setTimeout(() => dock(true), 4000);

  function fitIntro() {
    if (docking || finished) return;
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    Object.assign(player.style, {
      left: '0px',
      top: '0px',
      width: `${width}px`,
      height: `${height}px`
    });
  }

  function cleanup() {
    if (finished) return;
    finished = true;
    clearTimeout(readinessTimer);
    clearTimeout(completionTimer);
    transition?.cancel();
    player.classList.remove('is-intro');
    player.removeAttribute('style');
    backdrop.remove();
    document.documentElement.classList.remove('home-intro-active', 'home-intro-docking');
    navigationItems.forEach(item => item.style.removeProperty('--home-nav-delay'));
    backgroundElements.forEach((element, index) => {
      element.inert = previousInert[index];
    });
    window.removeEventListener('message', onMessage);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKeydown);
    reduce.removeEventListener('change', onMotionChange);
    window.removeEventListener('pagehide', cleanup);
  }

  function dock(immediate = false) {
    if (docking || finished) return;
    docking = true;
    clearTimeout(readinessTimer);
    clearTimeout(completionTimer);
    frame.contentWindow.postMessage({ type: 'corefutec:finish' }, '*');
    if (immediate || reduce.matches || !player.animate) {
      cleanup();
      return;
    }
    const target = slot.getBoundingClientRect();
    const signatureTop = parseFloat(window.getComputedStyle(slot).paddingTop) || 0;
    document.documentElement.classList.add('home-intro-docking');
    backdrop.classList.add('is-docking');
    transition = player.animate([
      {
        left: player.style.left,
        top: player.style.top,
        width: player.style.width,
        height: player.style.height,
        borderRadius: '0px'
      },
      {
        left: `${target.left}px`,
        top: `${target.top + signatureTop}px`,
        width: `${target.width}px`,
        height: `${Math.max(1, target.height - signatureTop)}px`,
        borderRadius: '0px'
      }
    ], {
      duration: 1800,
      easing: 'cubic-bezier(.16,1,.3,1)',
      fill: 'forwards'
    });
    transition.finished.then(cleanup, cleanup);
  }

  function onMessage(event) {
    if (event.source !== frame.contentWindow || finished) return;
    if (event.data?.type === 'corefutec:ready' && !started && !docking) {
      started = true;
      clearTimeout(readinessTimer);
      frame.contentWindow.postMessage({ type: 'corefutec:play' }, '*');
      completionTimer = window.setTimeout(() => dock(), 10500);
    } else if (event.data?.type === 'corefutec:complete' && started) {
      dock();
    }
  }
  function onResize() {
    docking ? cleanup() : fitIntro();
  }
  function onKeydown(event) {
    if (event.key === 'Escape') dock();
  }
  function onMotionChange(event) {
    if (event.matches) {
      docking ? cleanup() : dock(true);
    }
  }
  window.addEventListener('message', onMessage);
  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeydown);
  reduce.addEventListener('change', onMotionChange);
  window.addEventListener('pagehide', cleanup);
  fitIntro();
  // A handshake also covers an iframe that loaded before this deferred script.
  frame.contentWindow.postMessage({ type: 'corefutec:ping' }, '*');
})();
