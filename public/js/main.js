/* Moto Barbershop: motion
   One rhythm for the whole site: the "premium" ease (fast start, long soft landing)
   and three duration tokens. Every effect ends in a readable state; with
   prefers-reduced-motion the page renders statically. */
(() => {
  const root = document.documentElement;
  const loader = document.querySelector('.loader');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Open/closed status, computed in the browser in the shop's time zone, so it
  // is right on a static host too, and stays fresh if the tab stays open.
  const biz = JSON.parse($('#biz-data')?.textContent || 'null');
  const openStatus = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: biz.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const idx = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
    const now = Number(get('hour')) * 60 + Number(get('minute'));
    const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
    const today = biz.hours[idx];
    if (today.open && now >= toMin(today.open) && now < toMin(today.close)) {
      return { open: true, idx, label: `Deschis acum · până la ${today.close}` };
    }
    for (let i = 0; i < 8; i++) {
      const d = biz.hours[(idx + i) % 7];
      if (!d.open || (i === 0 && now >= toMin(d.open))) continue;
      const when = i === 0 ? 'azi' : i === 1 ? 'mâine' : d.day.toLowerCase();
      return { open: false, idx, label: `Închis · deschidem ${when} la ${d.open}` };
    }
    return { open: false, idx, label: 'Închis' };
  };
  const refreshStatus = () => {
    if (!biz) return;
    const s = openStatus();
    $$('[data-status]').forEach(el => { el.textContent = s.label; });
    $$('.dot').forEach(d => d.classList.toggle('dot--on', s.open));
    $('[data-status-pill]')?.classList.toggle('status--open', s.open);
    $$('.hours__table tbody tr').forEach((tr, i) => {
      const isToday = i === s.idx;
      tr.classList.toggle('is-today', isToday);
      if (isToday) tr.setAttribute('aria-current', 'date'); else tr.removeAttribute('aria-current');
      const th = tr.querySelector('th');
      th.querySelector('small')?.remove();
      if (isToday) th.insertAdjacentHTML('beforeend', ' <small>azi</small>');
    });
  };
  refreshStatus();
  setInterval(refreshStatus, 60_000);

  // Nav state works with or without GSAP.
  const nav = $('[data-nav]');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 400 && y > lastY && !nav.contains(document.activeElement));
    lastY = y;
  }, { passive: true });

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    loader?.remove();
    $('.ritual')?.classList.add('no-pin');
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText, ScrollSmoother, CustomEase);
  CustomEase.create('premium', '0.22, 1, 0.36, 1');
  CustomEase.create('premiumInOut', '0.76, 0, 0.24, 1');
  const D = { fast: 0.35, base: 0.8, slow: 1.2 };
  gsap.defaults({ ease: 'premium', duration: D.base });

  /* ---------- Smooth scroll with inertia + parallax layers (data-speed) ---------- */
  const smoother = ScrollSmoother.create({
    wrapper: '#smooth-wrapper', content: '#smooth-content',
    smooth: 1.15, effects: true, smoothTouch: false,
  });
  root.classList.add('smooth');
  smoother.paused(true);

  // In-page links glide instead of jumping, and focus moves to the section.
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? $('#top') : $(id);
      if (!target) return;
      e.preventDefault();
      smoother.scrollTo(target, true, id === '#top' ? 'top top' : 'top 72px');
      history.replaceState(null, '', id);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ---------- Intro: tachometer → logo flare → logo flies into the wheel ---------- */
  const ticks = $('.loader__ticks');
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i <= 14; i++) {
    const a = (-90 + i * (180 / 14)) * Math.PI / 180;
    const pt = (r) => [100 + r * Math.sin(a), 110 - r * Math.cos(a)];
    const [x1, y1] = pt(70), [x2, y2] = pt(i % 2 ? 74 : 64);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    ticks.appendChild(l);
    if (i % 2 === 0) {
      const [tx, ty] = pt(52);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', tx); t.setAttribute('y', ty + 4); t.textContent = i;
      ticks.appendChild(t);
    }
  }
  const num = $('.loader__num');
  const rpm = { v: 0 };
  const showRpm = () => (num.textContent = Math.round(rpm.v));
  const heroLogo = $('.hero__logo');
  const loaderLogo = $('.loader__logo');
  gsap.set('.loader__needle', { rotation: -90, svgOrigin: '100 110' });
  gsap.set(heroLogo, { autoAlpha: 0 });
  gsap.set(loaderLogo, { scale: 0.3, rotation: -120 });

  const intro = gsap.timeline({
    onComplete: () => {
      loader.remove();
      smoother.paused(false);
      ScrollTrigger.refresh();
      startIdle();
    },
  });
  intro
    .to('.loader__needle', { rotation: 40, duration: 0.7, ease: 'power2.in' })
    .to(rpm, { v: 9, duration: 0.7, ease: 'power2.in', onUpdate: showRpm }, '<')
    .to('.loader__needle', { rotation: 82, duration: 0.35, ease: 'power3.out' })
    .to(rpm, { v: 14, duration: 0.35, ease: 'power3.out', onUpdate: showRpm }, '<')
    .to('.loader__needle', { rotation: 76, duration: 0.07, repeat: 3, yoyo: true, ease: 'none' })
    // gauge exits faster than the logo enters
    .to('.loader__gauge', { autoAlpha: 0, scale: 0.92, filter: 'blur(6px)', duration: D.fast, ease: 'power2.in' })
    .to(loaderLogo, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(1.6)' }, '-=0.1')
    .addLabel('fly', '+=0.25')
    .to(loader, { backgroundColor: 'rgba(0,0,0,0)', duration: 1, ease: 'power2.inOut' }, 'fly')
    .to(loaderLogo, {
      // measured when the flight starts, so it lands exactly on the hero logo
      x: () => { const r = heroLogo.getBoundingClientRect(); return r.left + r.width / 2 - innerWidth / 2; },
      y: () => { const r = heroLogo.getBoundingClientRect(); return r.top + r.height / 2 - innerHeight / 2; },
      scale: () => heroLogo.getBoundingClientRect().width / 200,
      boxShadow: '0 0 0 0 rgba(55,129,252,0), 0 0 0 rgba(25,81,252,0)',
      duration: 1.15, ease: 'premiumInOut',
    }, 'fly')
    .set(heroLogo, { autoAlpha: 1 })
    .set(loaderLogo, { autoAlpha: 0 });

  /* ---------- Hero entrance (overlaps the logo flight) ---------- */
  const heroSplit = SplitText.create('.hero__title .line', { type: 'chars', mask: 'chars' });
  const leadSplit = SplitText.create('.hero__lead', { type: 'words' });
  intro
    .from('.wheel', { scale: 0.55, autoAlpha: 0, rotation: -60, svgOrigin: '200 200', duration: 1.4 }, 'fly+=0.15')
    .from('.wheel__spin', { rotation: -540, svgOrigin: '200 200', duration: 1.8, ease: 'power4.out' }, '<')
    .from(heroSplit.chars, { yPercent: 115, rotate: 8, duration: 1.1, stagger: 0.022 }, 'fly+=0.3')
    .from('.hero .eyebrow', { y: 14, autoAlpha: 0, duration: D.base }, '<0.2')
    .from(leadSplit.words, { autoAlpha: 0, y: 10, filter: 'blur(8px)', duration: D.base, stagger: 0.025 }, '<0.15')
    .from('.hero__cta > *, .rating', { y: 18, autoAlpha: 0, stagger: 0.07 }, '<0.25')
    .from('.hero__badge', { scale: 0.6, autoAlpha: 0, ease: 'back.out(2)' }, '<0.1')
    .from('.nav', { autoAlpha: 0, y: -12 }, '<');

  /* ---------- Idle loops that start after the intro ---------- */
  let wheelSpin;
  function startIdle() {
    // a light sweep crosses the logo every few seconds
    const shine = $('.hero__shine');
    gsap.set(shine, { clearProps: 'transform' });
    gsap.fromTo(shine, { xPercent: -130 }, { xPercent: 130, duration: 1.3, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.2 });
  }
  wheelSpin = gsap.to('.wheel__spin', { rotation: '+=360', svgOrigin: '200 200', duration: 8, ease: 'none', repeat: -1 });

  /* ---------- Hero responds to the pointer (depth: wheel > logo > light) ---------- */
  if (finePointer) {
    const hero = $('.hero');
    const wx = gsap.quickTo('.wheel', 'x', { duration: 1.2 }), wy = gsap.quickTo('.wheel', 'y', { duration: 1.2 });
    const lx = gsap.quickTo(heroLogo, 'x', { duration: 1.4 }), ly = gsap.quickTo(heroLogo, 'y', { duration: 1.4 });
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      wx(px * 34); wy(py * 26); lx(px * 14); ly(py * 10);
      hero.style.setProperty('--px', `${(px + 0.5) * 100}%`);
      hero.style.setProperty('--py', `${(py + 0.5) * 100}%`);
    });
    hero.addEventListener('pointerleave', () => { wx(0); wy(0); lx(0); ly(0); });
  }

  /* ---------- Speed streaks ---------- */
  const streakBox = $('.hero__streaks');
  const streaks = [];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('i');
    s.style.top = `${6 + Math.random() * 88}%`;
    s.style.opacity = (0.15 + Math.random() * 0.5).toFixed(2);
    streakBox.appendChild(s);
    streaks.push(gsap.fromTo(s, { x: '-35vw' }, { x: '110vw', duration: 1.6 + Math.random() * 2.4, ease: 'none', repeat: -1, delay: -Math.random() * 4 }));
  }

  /* ---------- Marquee: two rows in opposite directions, skew with scroll speed ---------- */
  const marqueeTop = gsap.to('.marquee__track:not(.marquee__track--rev)', { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
  const marqueeRev = gsap.fromTo('.marquee__track--rev', { xPercent: -50 }, { xPercent: 0, duration: 36, ease: 'none', repeat: -1 });
  const skewTo = gsap.quickTo('.marquee__track', 'skewX', { duration: 0.5, ease: 'power3' });

  /* ---------- Scroll velocity drives wheel, streaks, marquee, speedometer ---------- */
  let velocity = 0;
  ScrollTrigger.create({ onUpdate: (self) => { velocity = self.getVelocity(); } });
  const speedo = $('.speedo');
  const needle = $('.speedo__needle');
  const fill = $('.speedo__fill');
  const val = $('.speedo__val');
  gsap.set(needle, { rotation: -90, svgOrigin: '50 55' });
  const setNeedle = gsap.quickTo(needle, 'rotation', { duration: 0.4, ease: 'power3.out' });
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', endTrigger: '.footer', end: 'bottom bottom',
    onToggle: (self) => speedo.classList.toggle('is-on', self.isActive),
  });
  let smooth = 0;
  gsap.ticker.add(() => {
    smooth += (velocity - smooth) * 0.12;
    velocity *= 0.9;
    const mag = Math.min(Math.abs(smooth), 5000);
    const boost = 1 + mag / 600;
    const dir = smooth < -30 ? -1 : 1;
    wheelSpin.timeScale(boost * dir);
    streaks.forEach((t) => t.timeScale(boost));
    marqueeTop.timeScale(dir * Math.min(1 + mag / 300, 8));
    marqueeRev.timeScale(dir * Math.min(1 + mag / 300, 8));
    skewTo(gsap.utils.clamp(-12, 12, -smooth / 140));
    const kmh = Math.round(Math.min(mag / 20, 240));
    setNeedle(-90 + (kmh / 240) * 180);
    fill.style.strokeDashoffset = 126 - (kmh / 240) * 126;
    val.textContent = kmh;
  });

  /* ---------- Progress bar ---------- */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

  /* ---------- Headings: chars rise from a mask with a slight tilt ---------- */
  $$('h2.split').forEach((h) => {
    const split = SplitText.create(h, { type: 'words,chars', mask: 'words' });
    gsap.from(split.chars, {
      yPercent: 110, rotate: 6, duration: 1, stagger: 0.018,
      scrollTrigger: { trigger: h, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });

  /* ---------- Leads: words come out of a blur ---------- */
  $$('.section-head__lead, .finale__lead').forEach((p) => {
    const split = SplitText.create(p, { type: 'words' });
    gsap.from(split.words, {
      autoAlpha: 0, y: 8, filter: 'blur(8px)', stagger: 0.03,
      scrollTrigger: { trigger: p, start: 'top 88%', toggleActions: 'play none none reverse' },
    });
  });

  /* ---------- Generic reveals (blur fade, batched for a 40ms stagger) ---------- */
  ScrollTrigger.batch('.reveal:not(.svc)', {
    start: 'top 90%',
    onEnter: (els) => gsap.fromTo(els, { y: 24, autoAlpha: 0, filter: 'blur(6px)' }, { y: 0, autoAlpha: 1, filter: 'blur(0px)', stagger: 0.04, overwrite: true }),
    onLeaveBack: (els) => gsap.to(els, { y: 16, autoAlpha: 0, duration: D.fast, overwrite: true }),
  });
  gsap.set('.reveal:not(.svc)', { autoAlpha: 0 });

  /* ---------- Stats count up ---------- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = new Intl.NumberFormat('ro-RO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: 2, ease: 'power3.out',
      onUpdate: () => (el.textContent = fmt.format(o.v)),
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  /* ---------- Services: boss card opens from a window, rows wipe in ---------- */
  gsap.fromTo('.svc--boss',
    { clipPath: 'inset(14% 10% 14% 10% round 24px)', autoAlpha: 0.4, scale: 0.96 },
    { clipPath: 'inset(0% 0% 0% 0% round 24px)', autoAlpha: 1, scale: 1, duration: D.slow,
      scrollTrigger: { trigger: '.services__grid', start: 'top 80%' },
      onComplete: () => gsap.set('.svc--boss', { clearProps: 'clipPath' }) });
  ScrollTrigger.batch('.svc-list .svc', {
    start: 'top 92%',
    onEnter: (els) => gsap.fromTo(els,
      { clipPath: 'inset(0% 0% 100% 0%)', y: 24 },
      { clipPath: 'inset(0% 0% 0% 0%)', y: 0, stagger: 0.05, overwrite: true,
        onComplete: () => gsap.set(els, { clearProps: 'clipPath' }) }),
  });
  gsap.utils.toArray('.rev__bar i').forEach((bar) => {
    gsap.from(bar, {
      scaleX: 0, duration: D.slow, ease: 'power3.out',
      scrollTrigger: { trigger: bar, start: 'top 92%', toggleActions: 'play none none reverse' },
    });
  });

  const mm = gsap.matchMedia();

  // Boss card stays in view while the list scrolls past (desktop)
  mm.add('(min-width: 961px)', () => {
    ScrollTrigger.create({
      trigger: '.boss-pin', pin: true, pinSpacing: false,
      start: 'top 100px', endTrigger: '.svc-list', end: 'bottom bottom',
    });
  });

  /* ---------- Ritual: pinned horizontal ride with 3D cards (desktop) ---------- */
  mm.add('(min-width: 900px)', () => {
    const track = $('.ritual__track');
    const distance = () => track.scrollWidth - innerWidth;
    const ride = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: '.ritual', pin: '.ritual__pin', start: 'top top',
        end: () => `+=${distance()}`, scrub: 0.6, invalidateOnRefresh: true,
      },
    });
    gsap.to('.odo__fill', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.ritual', start: 'top top', end: () => `+=${distance()}`, scrub: 0.6 } });
    gsap.from('.stage__icon', {
      rotation: -90, scale: 0.4, autoAlpha: 0, ease: 'back.out(1.8)', stagger: 0.12,
      scrollTrigger: { trigger: '.ritual', start: 'top 55%', toggleActions: 'play none none reverse' },
    });
    $$('.stage').forEach((stage) => {
      gsap.fromTo(stage,
        { rotationY: -24, scale: 0.92, transformPerspective: 1100, transformOrigin: 'left center' },
        { rotationY: 0, scale: 1, ease: 'none',
          scrollTrigger: { trigger: stage, containerAnimation: ride, start: 'left right', end: 'left 45%', scrub: true } });
      gsap.from(stage.querySelector('.stage__num'), {
        xPercent: 60, autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: stage, containerAnimation: ride, start: 'left right', end: 'left 40%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 899px)', () => {
    const r = $('.ritual');
    r.classList.add('no-pin');
    $$('.stage').forEach((stage) => {
      gsap.from(stage, { y: 30, autoAlpha: 0, scrollTrigger: { trigger: stage, start: 'top 88%' } });
    });
    return () => r.classList.remove('no-pin');
  });

  /* ---------- Hours rows slide in; the map switches on like a headlight ---------- */
  gsap.from('.hours__table tr', {
    x: -24, autoAlpha: 0, stagger: 0.045,
    scrollTrigger: { trigger: '.hours__table', start: 'top 85%', toggleActions: 'play none none reverse' },
  });
  gsap.fromTo('.map',
    { clipPath: 'circle(0% at 50% 50%)' },
    { clipPath: 'circle(75% at 50% 50%)', duration: 1.6, ease: 'premiumInOut',
      scrollTrigger: { trigger: '.map', start: 'top 80%' },
      onComplete: () => gsap.set('.map', { clearProps: 'clipPath' }) });

  /* ---------- Finale: glow breathes, title grows into place, then revs ---------- */
  gsap.to('.finale__glow', { scale: 1.15, opacity: 0.75, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true });
  gsap.fromTo('.finale__title', { scale: 0.86 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'center center', scrub: true } });
  gsap.fromTo('.finale__logo', { rotation: -14 }, { rotation: 14, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true } });
  const finale = SplitText.create('.finale__title', { type: 'words,chars' });
  gsap.timeline({ scrollTrigger: { trigger: '.finale', start: 'top 70%', toggleActions: 'play none none reverse' } })
    .from(finale.chars, { x: () => gsap.utils.random(-120, -40), skewX: -25, autoAlpha: 0, duration: 0.6, stagger: 0.025, ease: 'power4.out' })
    .from('.finale .btn', { scale: 0.85, autoAlpha: 0, duration: D.base, ease: 'back.out(1.8)' }, '-=0.35')
    .to(finale.chars, { x: '+=3', duration: 0.05, repeat: 5, yoyo: true, ease: 'none' }, '<');

  /* ---------- Nav: a glass pill slides to the hovered / active link ---------- */
  const pill = $('.nav__pill');
  const links = $$('.nav__links a');
  let activeLink = null;
  const pillTo = (link) => {
    if (!link || getComputedStyle(link).display === 'none') return gsap.to(pill, { autoAlpha: 0, duration: D.fast });
    gsap.to(pill, { x: link.offsetLeft, width: link.offsetWidth, autoAlpha: 1, duration: 0.55 });
  };
  root.classList.add('has-pill');
  links.forEach((a) => {
    a.addEventListener('pointerenter', () => pillTo(a));
    a.addEventListener('focus', () => pillTo(a));
    const target = $(a.getAttribute('href'));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        a.classList.toggle('is-active', self.isActive);
        if (self.isActive) activeLink = a;
        else if (activeLink === a) activeLink = null;
        pillTo(activeLink);
      },
    });
  });
  $('.nav__links').addEventListener('pointerleave', () => pillTo(activeLink));

  /* ---------- Pointer-only polish ---------- */
  if (finePointer) {
    // Light cursor: grows over links, shows a label over booking buttons
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const label = $('.cursor__label');
    gsap.set(cursor, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const cx = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
    const cy = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });
    let shown = false;
    addEventListener('pointermove', (e) => {
      cx(e.clientX); cy(e.clientY);
      if (!shown) { shown = true; gsap.set(cursor, { x: e.clientX, y: e.clientY }); gsap.to(cursor, { autoAlpha: 1, duration: D.fast }); }
    });
    document.addEventListener('pointerleave', () => { shown = false; gsap.to(cursor, { autoAlpha: 0, duration: D.fast }); });
    let state = '';
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button');
      const next = t ? (t.dataset.cursor ? `label:${t.dataset.cursor}` : 'link') : '';
      if (next === state) return;
      state = next;
      if (next.startsWith('label:')) {
        label.textContent = next.slice(6);
        cursor.classList.add('is-label');
        gsap.to(cursor, { scale: 2.3, duration: 0.5 });
        gsap.to(label, { autoAlpha: 1, scale: 1 / 2.3, duration: 0.5 });
      } else {
        cursor.classList.remove('is-label');
        gsap.to(cursor, { scale: next === 'link' ? 1.5 : 1, duration: 0.5 });
        gsap.to(label, { autoAlpha: 0, scale: 0.6, duration: D.fast });
      }
    });
    addEventListener('pointerdown', () => gsap.to(cursor, { scale: '*=0.85', duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' }));
    // the map iframe swallows pointer events, so hide the cursor over it
    $('.map')?.addEventListener('pointerenter', () => gsap.to(cursor, { autoAlpha: 0, duration: D.fast }));
    $('.map')?.addEventListener('pointerleave', () => gsap.to(cursor, { autoAlpha: 1, duration: D.fast }));

    // Magnetic pull on the main calls to action only
    $$('.magnetic').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, .45)' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, .45)' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.3);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // Tilt + spotlight on the Final Boss card
    $$('.tilt').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7 });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7 });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 10); rx((0.5 - py) * 8);
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
})();
