/*
 * Site-wide motion: Lenis smooth scrolling + GSAP (ScrollTrigger, SplitText).
 * Only adds animation; no page content is created or changed.
 */
(function () {
  const root = document.documentElement;
  const reveal = () => root.classList.remove('anim-pending');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !window.gsap) {
    reveal();
    return;
  }

  const hasST = !!window.ScrollTrigger;
  const hasSplit = !!window.SplitText;
  gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText].filter(Boolean));

  const EASE = 'expo.out';
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      lerp: 0.14,
      wheelMultiplier: 1.6,
      smoothWheel: true,
    });
    if (hasST) lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- Helpers ---------------- */
  // Fade/rise elements in as they scroll into view.
  function scrollReveal(targets, vars = {}) {
    const els = gsap.utils.toArray(targets);
    if (!els.length) return;
    const { y = 40, ...rest } = vars;
    const to = {
      autoAlpha: 1,
      y: 0,
      duration: 1.1,
      ease: EASE,
      stagger: 0.12,
      clearProps: 'transform,opacity,visibility',
      ...rest,
    };
    // Pre-hide so they don't show before their trigger fires.
    gsap.set(els, { autoAlpha: 0, y });
    if (!hasST) {
      gsap.to(els, to);
      return;
    }
    ScrollTrigger.batch(els, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, to),
    });
  }

  // Mask-reveal text line by line (SplitText), falling back to a simple fade.
  function splitLines(el, vars = {}) {
    if (!el) return;
    if (!hasSplit) {
      gsap.from(el, { autoAlpha: 0, y: 30, duration: 1.1, ease: EASE, ...vars });
      return;
    }
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 105,
          duration: 1.2,
          ease: EASE,
          stagger: 0.08,
          ...vars,
        }),
    });
  }

  function splitChars(el, vars = {}) {
    if (!el) return;
    if (!hasSplit) {
      gsap.from(el, { autoAlpha: 0, y: 30, duration: 1.1, ease: EASE, ...vars });
      return;
    }
    SplitText.create(el, {
      type: 'words,chars',
      wordsClass: 'split-word',
      mask: 'chars',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 110,
          duration: 1.2,
          ease: EASE,
          stagger: 0.035,
          ...vars,
        }),
    });
  }

  function parallax(targets, amount) {
    if (!hasST) return;
    gsap.utils.toArray(targets).forEach((el) => {
      gsap.fromTo(
        el,
        { y: amount },
        {
          y: -amount,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });
  }

  /* ---------------- Sidebar ---------------- */
  function animateSidebar() {
    const firstVisit = (() => {
      try {
        if (sessionStorage.getItem('sidebarIntro')) return false;
        sessionStorage.setItem('sidebarIntro', '1');
      } catch (e) {}
      return true;
    })();

    const items = [
      $('.sidebar .logo'),
      ...$$('.sidebar .nav-links li'),
      ...$$('.sidebar .sidebar-section .section-title'),
      ...$$('.sidebar .sidebar-section li'),
    ].filter(Boolean);

    if (firstVisit) {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.from('.sidebar', { autoAlpha: 0, duration: 0.8 })
        .from(items, { autoAlpha: 0, x: -14, duration: 0.9, stagger: 0.035, clearProps: 'transform' }, 0.1)
        .from('.sidebar-divider', { scaleX: 0, transformOrigin: 'left center', duration: 1, stagger: 0.15 }, 0.3);
    }

    // Logo: soft magnetic hover
    const logo = $('.sidebar .logo');
    if (logo && window.matchMedia('(hover: hover)').matches) {
      const xTo = gsap.quickTo(logo, 'x', { duration: 0.5, ease: 'power3.out' });
      const yTo = gsap.quickTo(logo, 'y', { duration: 0.5, ease: 'power3.out' });
      logo.addEventListener('mousemove', (e) => {
        const r = logo.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      logo.addEventListener('mouseleave', () => {
        xTo(0);
        yTo(0);
      });
    }

    // Nav links: slight nudge on hover
    $$('.sidebar .nav-links a').forEach((a) => {
      a.style.display = 'inline-block';
      a.addEventListener('mouseenter', () => gsap.to(a, { x: 4, duration: 0.35, ease: 'power3.out' }));
      a.addEventListener('mouseleave', () => gsap.to(a, { x: 0, duration: 0.45, ease: 'power3.out' }));
    });
  }

  /* ---------------- Page: home (ink splash) ---------------- */
  function animateHome() {
    const names = $$('.ink-name');
    if (!names.length) return false;

    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.fromTo(names, {
      clipPath: 'inset(0% 0% 100% 0%)',
      yPercent: 30,
    }, {
      clipPath: 'inset(0% 0% 0% 0%)',
      yPercent: 0,
      duration: 1.5,
      stagger: 0.18,
      clearProps: 'clipPath',
    });

    // Ink bleeds outward: displacement + blur grow from zero.
    $$('#ink-bleed-light feDisplacementMap, #ink-bleed-heavy feDisplacementMap').forEach((node, i) => {
      tl.from(node, { attr: { scale: 0 }, duration: 2.4, ease: 'power2.out' }, 0.4 + i * 0.2);
    });
    $$('#ink-bleed-light feGaussianBlur, #ink-bleed-heavy feGaussianBlur').forEach((node, i) => {
      tl.from(node, { attr: { stdDeviation: 0 }, duration: 2.4, ease: 'power2.out' }, 0.4 + i * 0.2);
    });

    // Slow "living ink" drift on the heaviest layer.
    const heavyNoise = $('#ink-bleed-heavy feTurbulence');
    if (heavyNoise) {
      gsap.to(heavyNoise, {
        attr: { baseFrequency: 0.034 },
        duration: 6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2.5,
      });
    }

    // Layers drift apart slightly with the cursor for depth.
    if (window.matchMedia('(hover: hover)').matches) {
      const depth = [4, 10, 18];
      const movers = names.map((el, i) => ({
        x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3.out' }),
        y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3.out' }),
        d: depth[i] || 10,
      }));
      window.addEventListener('mousemove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => {
          m.x(nx * m.d);
          m.y(ny * m.d * 0.6);
        });
      });
    }
    return true;
  }

  /* ---------------- Page: bio ---------------- */
  function animateBio() {
    const hero = $('.hero-section');
    if (!hero) return false;

    gsap.from(hero, { autoAlpha: 0, y: 30, duration: 1.2, ease: EASE, clearProps: 'transform' });
    gsap.from('.hero-header-row > *', { autoAlpha: 0, y: 12, duration: 1, ease: EASE, stagger: 0.1, delay: 0.2 });
    $$('.hero-title', hero).forEach((el, i) => splitLines(el, { delay: 0.3 + i * 0.35 }));

    // Tiles rise in on scroll, then lift on hover.
    scrollReveal('.craft-tile-container', { y: 60, stagger: 0.12 });
    $$('.craft-tile').forEach((tile) => {
      const container = tile.parentElement;
      container.addEventListener('mouseenter', () =>
        gsap.to(tile, { y: -8, boxShadow: '0 18px 48px 0 rgba(80,60,180,0.14)', duration: 0.5, ease: 'power3.out' })
      );
      container.addEventListener('mouseleave', () =>
        gsap.to(tile, { y: 0, boxShadow: '0 4px 24px 0 rgba(80,60,180,0.07)', duration: 0.6, ease: 'power3.out' })
      );
    });
    return true;
  }

  /* ---------------- Page: about ---------------- */
  function animateAbout() {
    const heroRow = $('.about-hero-row');
    if (!heroRow) return false;

    const tl = gsap.timeline({ defaults: { ease: EASE } });
    tl.from('.about-hero-fade', {
      autoAlpha: 0,
      filter: 'blur(10px)',
      letterSpacing: '0.5em',
      duration: 2.2,
      ease: 'power2.out',
      clearProps: 'filter,letterSpacing',
    });
    splitChars($('.about-hero-english'), { delay: 0.35 });
    tl.from('.about-hero-chinese > span', { autoAlpha: 0, y: 24, duration: 1.2, stagger: 0.15 }, 0.8);

    const heroImgs = $$('.about-hero-row .collage-img');
    tl.fromTo(
      heroImgs,
      { clipPath: 'inset(100% 0% 0% 0% round 16px)', scale: 1.12 },
      {
        clipPath: 'inset(0% 0% 0% 0% round 16px)',
        scale: 1,
        clearProps: 'clipPath',
        duration: 1.6,
        ease: 'expo.inOut',
        stagger: 0.12,
      },
      0.3
    );

    // About section
    scrollReveal('.about-images figure', { y: 70, stagger: 0.18 });
    scrollReveal('.about-heading', { y: 20 });
    scrollReveal('.about-text p', { y: 30, stagger: 0.12 });

    // Extra sections: headings/blocks, drawn dividers, images
    const extra = $('.about-extra');
    if (extra) {
      scrollReveal($$(':scope > div > div', extra).filter((el) => !el.classList.contains('collage-grid-irregular')), {
        y: 40,
      });
      $$('hr', extra).forEach((hr) => {
        gsap.from(hr, {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1.4,
          ease: 'expo.inOut',
          scrollTrigger: hasST ? { trigger: hr, start: 'top 90%', once: true } : undefined,
        });
      });
      const loveImgs = $$('.collage-grid-irregular img', extra);
      scrollReveal(loveImgs, { y: 80, stagger: 0.15, duration: 1.3 });
    }

    // Gentle parallax on photos (applied to img elements, not the transformed grids)
    parallax($$('.about-hero-row .collage-img'), 18);
    parallax($$('.about-images img'), 24);
    return true;
  }

  /* ---------------- Generic pages (contact, resume, portfolio, ideas) ---------------- */
  function animateGeneric() {
    const main = $('.main-content');
    if (!main) return;
    const heading = $('h1', main);
    splitChars(heading);

    const blocks = [];
    // Contact: each contact block
    const contactBlocks = $$('.main-content > div > div > div');
    if (contactBlocks.length) blocks.push(...contactBlocks);
    // Resume / portfolio / ideas: paragraph + embed
    blocks.push(...$$(':scope > p, :scope > iframe', main));

    gsap.from(blocks, {
      autoAlpha: 0,
      y: 30,
      duration: 1.1,
      ease: EASE,
      stagger: 0.09,
      delay: 0.25,
      clearProps: 'transform,opacity,visibility',
    });
  }

  /* ---------------- Page transitions ---------------- */
  function setupTransitions() {
    const main = $('.main-content');
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target && a.target !== '_self') return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html?$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      gsap.to(main, {
        autoAlpha: 0,
        y: -16,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => (location.href = url.href),
      });
    });
    // Restore when coming back via the back/forward cache.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) gsap.set(main, { clearProps: 'all' });
    });
  }

  /* ---------------- Boot ---------------- */
  function start() {
    reveal();
    animateSidebar();
    if (!animateHome() && !animateBio() && !animateAbout()) animateGeneric();
    setupTransitions();
    if (hasST) ScrollTrigger.refresh();
  }

  // Wait for fonts so text splits on the final line breaks (capped so the page never stalls).
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(start);
})();
