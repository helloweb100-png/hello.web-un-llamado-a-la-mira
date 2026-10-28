/* ═══════════════════════════════════════════════════════════════════
   UN LLAMADO A LA VIDA A.C. — app.js
   Librerías (CDN, versiones fijas): GSAP + ScrollTrigger, Lenis, Three.js
   Todo degrada con gracia: si una librería no carga, la página sigue
   siendo 100 % legible y funcional (el contenido nunca depende del JS).

   ÍNDICE
   0 · Configuración (teléfono y mensajes de WhatsApp)
   1 · Utilidades
   2 · Loader (spinner de carga)
   3 · Scroll suave (Lenis) + anclas
   4 · Navegación y menú móvil
   5 · Hero: escena 3D de partículas con el logo real
   6 · Tipografía animada (palabras con máscara)
   7 · Animaciones de scroll (GSAP / ScrollTrigger)
   8 · Interacciones: FAQ, señales, lightbox, formulario, compartir
   9 · Extras: cursor, botones magnéticos, brasas, WhatsApp flotante
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ─────────────────────────── 0 · CONFIGURACIÓN ─────────────────────────── */
  const CONFIG = {
    phone: '5219711078935', // WhatsApp del centro (formato internacional, sin "+")
    messages: {
      nav: 'Hola, quiero hablar con alguien hoy.',
      hero: 'Hola, estoy listo para empezar. Me gustaría recibir información.',
      casa: 'Hola, quiero saber cómo es el día a día en la casa y qué incluye el acompañamiento.',
      paso: 'Hola, quiero dar el primer paso. ¿Me pueden orientar?',
      family: 'Hola, quiero ayudar a un familiar. ¿Me pueden orientar?',
      donar: 'Hola, quiero ser parte de la obra y hacer un donativo.',
      contacto: 'Hola, me gustaría recibir orientación.',
      float: 'Hola, me gustaría recibir orientación.'
    }
  };

  /* ─────────────────────────── 1 · UTILIDADES ─────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const root = document.documentElement;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HAS_GSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  let lenis = null;

  const waLink = (key, custom) =>
    `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(custom || CONFIG.messages[key] || CONFIG.messages.float)}`;

  /** Ejecuta un módulo sin que un fallo tumbe al resto de la página. */
  const safe = (name, fn) => {
    try { return fn(); } catch (err) { console.warn(`[Un Llamado a la Vida] módulo "${name}" falló:`, err); return null; }
  };

  /** Todos los botones con data-wa abren WhatsApp con su mensaje prellenado. */
  function bindWhatsApp() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });
  }

  /* ─────────────────────────── 2 · LOADER ─────────────────────────── */
  function runLoader() {
    return new Promise((resolve) => {
      const loader = $('#loader');
      if (!loader) { root.classList.remove('is-loading'); return resolve(); }

      const arc = $('#loader-arc');
      const count = $('#loader-count');
      const msg = $('#loader-msg');
      const MIN = REDUCE ? 500 : 2900; // tiempo mínimo para disfrutar la animación
      const messages = ['Encendiendo la luz…', 'Preparando un espacio seguro…', 'Abriendo las manos…', 'Todo listo. Bienvenido.'];
      const t0 = performance.now();

      let loaded = document.readyState === 'complete';
      let fontsReady = !document.fonts;
      if (!loaded) addEventListener('load', () => { loaded = true; }, { once: true });
      if (document.fonts) {
        Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3500))]).then(() => { fontsReady = true; });
      }
      // tope duro: aunque una librería externa tarde, el sitio abre
      setTimeout(() => { loaded = true; fontsReady = true; }, 7000);

      let shown = 0, msgIdx = -1, finished = false, last = performance.now();

      const exit = () => {
        count.textContent = '100';
        arc.style.strokeDashoffset = 0;
        const done = () => {
          loader.setAttribute('data-done', '');
          loader.classList.add('is-gone');
          root.classList.remove('is-loading');
          if (lenis) lenis.start();
          resolve();
        };
        if (!HAS_GSAP || REDUCE) { done(); return; }
        gsap.set(loader, { '--iris': '0%' });
        const tl = gsap.timeline({ onComplete: done });
        tl.to('.loader__orb', { scale: 1.14, duration: 0.7, ease: 'power2.in' })
          .to('.loader__core', { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, '-=0.3')
          .to(loader, { '--iris': '118%', duration: 1.2, ease: 'power3.inOut' }, '-=0.05')
          .call(resolve, null, 1.0); // el hero empieza mientras el iris todavía se abre
      };

      const step = (now) => {
        if (finished) return;
        const elapsed = now - t0;
        const dt = Math.min((now - last) / 1000, 0.25); last = now;   // suavizado independiente de los FPS
        const eased = 1 - Math.pow(1 - Math.min(elapsed / MIN, 1), 2.2);
        const ready = loaded && fontsReady;
        const target = Math.min(ready ? 100 : 92, eased * 100);
        shown += (target - shown) * (1 - Math.exp(-dt * 8));
        count.textContent = Math.round(shown);
        arc.style.strokeDashoffset = 100 - shown;
        const mi = shown < 28 ? 0 : shown < 58 ? 1 : shown < 92 ? 2 : 3;
        if (mi !== msgIdx) { msgIdx = mi; msg.textContent = messages[mi]; }
        if (shown >= 99.4 && ready && elapsed >= MIN) { finished = true; exit(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ─────────────────────────── 3 · SCROLL SUAVE + ANCLAS ─────────────────────────── */
  function initSmoothScroll() {
    if (HAS_GSAP && typeof Lenis !== 'undefined' && !REDUCE) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop(); // bloqueado hasta que termine el loader
    }
  }

  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (typeof target === 'number') scrollTo({ top: target, behavior: REDUCE ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      // pequeño retraso: deja que el menú móvil se cierre y libere el scroll
      setTimeout(() => scrollToTarget(target), 30);
    });
    $('#to-top')?.addEventListener('click', () => scrollToTarget(0));
  }

  /* ─────────────────────────── 4 · NAVEGACIÓN ─────────────────────────── */
  let closeMenu = () => {};

  function initNav() {
    const nav = $('#nav');
    const bar = $('#scroll-progress');
    if (!nav) return;
    let lastY = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 24);
      const delta = y - lastY;
      if (Math.abs(delta) > 6) {
        const menuOpen = $('#menu')?.classList.contains('is-open');
        nav.classList.toggle('is-hidden', delta > 0 && y > 700 && !menuOpen); // baja = se oculta, sube = reaparece
        lastY = y;
      }
      if (bar) {
        const max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // sección activa en el menú de escritorio
    const links = $$('.nav__links a');
    const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => l.classList.remove('is-active'));
          map.get(en.target.id)?.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  function initMenu() {
    const burger = $('#burger');
    const menu = $('#menu');
    if (!burger || !menu) return;

    const set = (open) => {
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
      if (lenis) { open ? lenis.stop() : lenis.start(); } else { document.body.style.overflow = open ? 'hidden' : ''; }
      if (open) $('#nav')?.classList.remove('is-hidden');
    };
    closeMenu = () => { if (menu.classList.contains('is-open')) set(false); };

    burger.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    matchMedia('(min-width: 960px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
  }

  /* ─────────────────────────── 5 · HERO 3D ───────────────────────────
     Las partículas son el LOGO REAL: cada punto conserva el color del
     píxel original (paloma blanca, aro azul, laureles y texto dorados).
     Se parten de una nube caótica y se ensamblan en el logo; reaccionan
     al cursor y, al hacer scroll, se dispersan como brasas hacia arriba. */
  const VERT = `
    uniform float uTime, uForm, uDisperse, uDpr, uBase, uMouseOn;
    uniform vec2 uMouse;
    attribute vec3 aStart;
    attribute vec3 aColor;
    attribute float aRand;
    attribute float aSize;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float delay = aRand * 0.42;
      float t = clamp((uForm - delay) / 0.58, 0.0, 1.0);
      float e = 1.0 - pow(1.0 - t, 3.0);
      vec3 p = mix(aStart, position, e);
      float flight = sin(e * 3.14159);
      p.x += sin(aRand * 40.0 + uTime) * 0.2 * flight;
      p.y += cos(aRand * 31.0 + uTime) * 0.2 * flight;
      float idle = 0.010 + 0.006 * sin(uTime * 0.9 + aRand * 60.0);
      p += vec3(sin(uTime * 0.7 + aRand * 50.0), cos(uTime * 0.6 + aRand * 37.0), sin(uTime * 0.5 + aRand * 23.0)) * idle * e;
      vec2 d = p.xy - uMouse;
      float push = smoothstep(0.36, 0.0, length(d)) * 0.22 * uMouseOn * e;
      p.xy += normalize(d + vec2(0.0001)) * push;
      p.z += push * 1.4;
      float dd = uDisperse * uDisperse;
      p += vec3((aRand - 0.5) * 3.0, 1.2 + aRand * 4.0, (aRand - 0.5) * 3.0) * dd;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float persp = 6.0 / max(0.5, -mv.z);
      gl_PointSize = aSize * uBase * uDpr * persp * (0.85 + 0.3 * sin(uTime * 1.6 + aRand * 20.0));
      float tw = 0.82 + 0.18 * sin(uTime * 2.0 + aRand * 90.0);
      vColor = aColor * (1.0 + 0.45 * flight) * tw;
      vAlpha = (0.3 + 0.7 * e) * (1.0 - clamp(dd * 1.15, 0.0, 1.0));
    }`;
  const FRAG = `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = pow(smoothstep(0.5, 0.0, d), 1.25);
      float core = smoothstep(0.3, 0.0, d);
      gl_FragColor = vec4(vColor * (0.8 + 1.2 * core), a * vAlpha);
    }`;
  const DUST_VERT = `
    uniform float uTime, uDpr;
    attribute float aRand;
    attribute vec3 aColor;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec3 p = position;
      p.y = mod(p.y + uTime * (0.05 + aRand * 0.12) + 4.0, 8.0) - 4.0;
      p.x += sin(uTime * 0.3 + aRand * 30.0) * 0.25;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (1.0 + aRand * 2.4) * uDpr * (6.0 / max(0.5, -mv.z)) * (0.6 + 0.4 * sin(uTime * 1.5 + aRand * 50.0)) * 1.6;
      vColor = aColor;
      vAlpha = smoothstep(0.0, 0.5, 1.0 - abs(p.y) / 4.0) * (0.22 + 0.5 * aRand);
    }`;

  function decodeLogo(b64, every) {
    const bin = atob(b64);
    const n = bin.length >> 2;
    const out = [];
    for (let i = 0; i < n; i += every) {
      const o = i * 4;
      const v = (bin.charCodeAt(o + 2) << 8) | bin.charCodeAt(o + 3); // RGB565
      out.push({
        x: (bin.charCodeAt(o) / 255) * 2 - 1,
        y: -((bin.charCodeAt(o + 1) / 255) * 2 - 1),
        r: ((v >> 11) & 31) / 31, g: ((v >> 5) & 63) / 63, b: (v & 31) / 31
      });
    }
    return out;
  }

  function initHeroScene() {
    const canvas = $('#hero-canvas');
    const hero = $('#inicio');
    const hud = $('.hero__hud');
    const fallback = $('#hero-fallback');

    const useFallback = () => {
      if (canvas) canvas.hidden = true;
      if (fallback) fallback.hidden = false;
      return null;
    };
    if (!canvas || !hero || !hud || typeof THREE === 'undefined') return useFallback();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch (err) { return useFallback(); }
    if (!renderer.getContext()) return useFallback();
    renderer.setClearColor(0x000000, 0);

    const mobile = innerWidth < 720;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
    camera.position.z = 6;
    const group = new THREE.Group();
    scene.add(group);

    /* — Logo: una partícula por cada punto muestreado del logotipo — */
    const pts = decodeLogo(LOGO_POINTS, mobile ? 2 : 1);
    const N = pts.length;
    const pos = new Float32Array(N * 3), start = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const rnd = new Float32Array(N), siz = new Float32Array(N);
    pts.forEach((p, i) => {
      const lum = (p.r + p.g + p.b) / 3;
      const sat = Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
      let z, size;
      if (lum > 0.72 && sat < 0.35) { z = 0.18; size = 1.15; }                         // paloma blanca: al frente
      else if (p.r > 0.55 && p.g > 0.45 && p.b < 0.45) { z = 0.05; size = 1.0; }       // dorado: plano medio
      else if (p.b > p.r + 0.2) { z = -0.14; size = 0.82; }                            // azul: al fondo
      else { z = -0.04; size = 0.9; }
      pos.set([p.x, p.y, z + (Math.random() - 0.5) * 0.05], i * 3);
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), rad = 2.4 + Math.random() * 4.4;
      start.set([rad * Math.sin(b) * Math.cos(a), rad * Math.sin(b) * Math.sin(a) * 0.8, rad * Math.cos(b) - 1], i * 3);
      col.set([p.r, p.g, p.b], i * 3);
      rnd[i] = Math.random();
      siz[i] = size * (0.85 + Math.random() * 0.3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    const U = {
      uTime: { value: 0 }, uForm: { value: 0 }, uDisperse: { value: 0 }, uDpr: { value: 1 },
      uBase: { value: 3.4 }, uMouse: { value: new THREE.Vector2(9, 9) }, uMouseOn: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    const logo = new THREE.Points(geo, mat);
    logo.frustumCulled = false;
    group.add(logo);

    /* — Polvo de luz ambiental: sube eternamente (animación constante) — */
    const DN = mobile ? 280 : 640;
    const dp = new Float32Array(DN * 3), dc = new Float32Array(DN * 3), dr = new Float32Array(DN);
    const palette = [[1, 0.85, 0.35], [0.45, 0.8, 1], [1, 1, 1], [0.3, 0.65, 1]];
    for (let i = 0; i < DN; i++) {
      dp.set([(Math.random() - 0.5) * 11, (Math.random() - 0.5) * 8, -3 + Math.random() * 4.5], i * 3);
      dc.set(palette[(Math.random() * palette.length) | 0], i * 3);
      dr[i] = Math.random();
    }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    dgeo.setAttribute('aColor', new THREE.BufferAttribute(dc, 3));
    dgeo.setAttribute('aRand', new THREE.BufferAttribute(dr, 1));
    const DU = { uTime: { value: 0 }, uDpr: { value: 1 } };
    const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({
      uniforms: DU, vertexShader: DUST_VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    }));
    dust.frustumCulled = false;
    scene.add(dust);

    /* — Encaje con el HUD (el logo siempre queda centrado en los aros) — */
    const focus = $('.hero__focus');
    const state = { W: 1, H: 1, upp: 0.004, baseScale: 1 };
    const mouse = { tx: 0, ty: 0, x: 0, y: 0, px: 0, py: 0, on: false };

    function layout() {
      // medimos con geometría de layout (offset/computed style): no cambia con las animaciones de entrada ni el parallax
      const W = hero.clientWidth, H = hero.clientHeight;
      if (!W || !H) return;
      const ref = focus || hud;
      const cs = getComputedStyle(ref);
      const D = ref.offsetWidth;
      const cx = parseFloat(cs.left);               // el centro del halo = su "left" (translateX -50 %)
      const cy = parseFloat(cs.top) + D / 2;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2);
      state.W = W; state.H = H;
      renderer.setPixelRatio(dpr);
      renderer.setSize(state.W, state.H, false);
      camera.aspect = state.W / state.H;
      camera.updateProjectionMatrix();
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      state.upp = visH / state.H;
      group.position.set((cx - state.W / 2) * state.upp, (state.H / 2 - cy) * state.upp, 0);
      state.baseScale = D * 0.372 * state.upp;
      group.scale.setScalar(state.baseScale);
      U.uBase.value = clamp((D / 560) * (mobile ? 7.4 : 7.2), 4.2, 9);
      U.uDpr.value = DU.uDpr.value = dpr;
      if (REDUCE || !running) renderOnce();
    }

    /* — Bucle de render (se pausa cuando el hero no está visible) — */
    let running = false, t0 = performance.now() / 1000;
    const world = new THREE.Vector3();

    function frame() {
      const t = performance.now() / 1000 - t0;
      U.uTime.value = DU.uTime.value = t;
      mouse.x += (mouse.tx - mouse.x) * 0.07;
      mouse.y += (mouse.ty - mouse.y) * 0.07;
      group.rotation.y = mouse.x * 0.34 + Math.sin(t * 0.4) * 0.05;
      group.rotation.x = -mouse.y * 0.22 + Math.cos(t * 0.33) * 0.03;
      group.scale.setScalar(state.baseScale * (1 + Math.sin(t * 1.1) * 0.006));
      dust.position.x = mouse.x * 0.35;
      // cursor → coordenadas locales del logo (para repeler partículas)
      world.set((mouse.px - state.W / 2) * state.upp, (state.H / 2 - mouse.py) * state.upp, 0);
      U.uMouse.value.set((world.x - group.position.x) / state.baseScale, (world.y - group.position.y) / state.baseScale);
      U.uMouseOn.value += ((mouse.on ? 1 : 0) - U.uMouseOn.value) * 0.08;
      renderer.render(scene, camera);
    }
    function renderOnce() { frame(); }
    const loop = () => frame();
    function run(on) {
      if (REDUCE) return;
      if (on && !running) { running = true; (HAS_GSAP ? gsap.ticker.add(loop) : null); if (!HAS_GSAP) rafLoop(); }
      else if (!on && running) { running = false; if (HAS_GSAP) gsap.ticker.remove(loop); }
    }
    function rafLoop() { if (!running) return; frame(); requestAnimationFrame(rafLoop); }

    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(hero); else addEventListener('resize', layout);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => run(es[0].isIntersecting), { threshold: 0 }).observe(hero);
    else run(true);

    hero.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.px = e.clientX - r.left; mouse.py = e.clientY - r.top;
      mouse.tx = (mouse.px / r.width - 0.5) * 2; mouse.ty = (mouse.py / r.height - 0.5) * 2;
      mouse.on = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.on = false; mouse.tx = 0; mouse.ty = 0; });

    layout();
    if (REDUCE) { U.uForm.value = 1; renderOnce(); }
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); useFallback(); });

    return {
      /** Ensambla el logo (se llama cuando termina el loader). */
      form(duration = 3.8) {
        if (REDUCE) { U.uForm.value = 1; return; }
        if (HAS_GSAP) gsap.to(U.uForm, { value: 1, duration, ease: 'power2.inOut' });
        else U.uForm.value = 1;
      },
      disperse(p) { U.uDisperse.value = p; },
      relayout: layout
    };
  }

  /* ─────────────────────────── 6 · TIPOGRAFÍA ANIMADA ─────────────────────────── */
  /** Envuelve cada palabra en una máscara (respeta <em> y demás etiquetas internas). */
  function splitWords(el) {
    const words = [];
    const frag = document.createDocumentFragment();
    const walk = (node, parent) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'word';
            const i = document.createElement('span'); i.className = 'word__in'; i.textContent = part;
            w.appendChild(i); parent.appendChild(w); words.push(i);
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false);
          parent.appendChild(clone);
          walk(child, clone);
        }
      });
    };
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    return words;
  }

  /** Versión ligera (sin máscara) para el texto del manifiesto: cada palabra se ilumina con el scroll. */
  function wrapScrubWords(el) {
    const words = [];
    const frag = document.createDocumentFragment();
    const walk = (node, parent) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = part;
            parent.appendChild(s); words.push(s);
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(false);
          parent.appendChild(clone);
          walk(child, clone);
        }
      });
    };
    walk(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    return words;
  }

  /* ─────────────────────────── 7 · ANIMACIONES DE SCROLL ─────────────────────────── */
  function buildDecor() {
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };

    // marcas del HUD del hero (reloj técnico)
    const hudTicks = $('#hud-ticks');
    if (hudTicks) {
      for (let i = 0; i < 120; i++) {
        const a = (i * 3 * Math.PI) / 180, major = i % 10 === 0, r1 = 244, r2 = r1 + (major ? 11 : 5);
        hudTicks.appendChild(mk('line', { x1: 300 + Math.cos(a) * r1, y1: 300 + Math.sin(a) * r1, x2: 300 + Math.cos(a) * r2, y2: 300 + Math.sin(a) * r2 }));
      }
    }
    // marcas y nodos del anillo de progreso de "El camino"
    const ticks = $('#orbit-ticks'), nodes = $('#orbit-nodes');
    if (ticks) {
      for (let i = 0; i < 72; i++) {
        const a = (i * 5 * Math.PI) / 180, major = i % 6 === 0, r1 = 176, r2 = r1 + (major ? 9 : 4);
        ticks.appendChild(mk('line', { x1: 200 + Math.cos(a) * r1, y1: 200 + Math.sin(a) * r1, x2: 200 + Math.cos(a) * r2, y2: 200 + Math.sin(a) * r2 }));
      }
    }
    if (nodes) {
      for (let i = 0; i < 5; i++) {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        const g = mk('g', { transform: `translate(${200 + Math.cos(a) * 168} ${200 + Math.sin(a) * 168})` });
        g.appendChild(mk('circle', { r: 13 }));
        const t = mk('text', {}); t.textContent = String(i + 1); g.appendChild(t);
        nodes.appendChild(g);
      }
    }
  }

  function initScrollFX(scene) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* — Titulares: cada palabra sube desde su máscara — */
    const heroTitle = $('.hero__title');
    const heroWords = heroTitle ? splitWords(heroTitle) : [];
    const heading = $$('.h2, .display').filter((h) => !h.closest('.camino__final'));
    const headingSets = heading.map((h) => ({ h, words: splitWords(h) }));

    /* — Estado inicial del hero (se revela al terminar el loader) — */
    gsap.set(heroWords, { yPercent: 118, rotate: 5 });
    gsap.set('.hero__eyebrow, .hero__lead, .hero__cta > *, .hero__proof li, .hero__scroll', { autoAlpha: 0, y: 24 });
    gsap.set('.hud__tag', { autoAlpha: 0 });
    gsap.set('.hero__hud .hud', { autoAlpha: 0, scale: 0.86 });
    gsap.set('.hero__focus', { autoAlpha: 0 });

    /* ── HERO: parallax y dispersión del logo al bajar ── */
    ScrollTrigger.create({
      trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (self) => scene && scene.disperse(self.progress)
    });
    gsap.to('.hero__inner', { y: -90, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '#inicio', start: '12% top', end: '70% top', scrub: true } });
    gsap.to('.hero__hud, .hero__focus, .hero__canvas, .hero__fallback', { y: -70, ease: 'none', scrollTrigger: { trigger: '#inicio', start: 'top top', end: 'bottom top', scrub: true } });

    /* ── MARQUEE: acelera con la velocidad del scroll ── */
    const tracks = $$('.marquee__track');
    if (tracks.length) {
      let rate = 1;
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          const target = 1 + clamp(Math.abs(self.getVelocity()) / 500, 0, 6);
          rate = lerp(rate, target, 0.12);
          tracks.forEach((tr) => tr.getAnimations().forEach((a) => { a.playbackRate = rate; }));
        }
      });
      gsap.ticker.add(() => { // vuelve suavemente a la velocidad normal al detenerse
        if (rate > 1.01) { rate = lerp(rate, 1, 0.06); tracks.forEach((tr) => tr.getAnimations().forEach((a) => { a.playbackRate = rate; })); }
      });
    }

    /* ── MANIFIESTO: las palabras se iluminan una a una ── */
    const mText = $('.manifesto__text');
    if (mText) {
      const mw = wrapScrubWords(mText);
      gsap.set(mw, { opacity: 0.14 });
      gsap.to(mw, { opacity: 1, stagger: 0.5, duration: 1, ease: 'none', scrollTrigger: { trigger: mText, start: 'top 82%', end: 'bottom 48%', scrub: true } });
    }
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count), o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });
    gsap.from('.stat', { autoAlpha: 0, y: 40, duration: 1, stagger: 0.14, ease: 'power3.out', scrollTrigger: { trigger: '.manifesto__stats', start: 'top 88%', once: true } });
    gsap.to('.manifesto__orb', { rotation: 40, yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ── SERVICIOS: tarjetas que se apilan como una baraja ── */
    const svcs = $$('.svc');
    svcs.forEach((svc, i) => {
      const card = $('.svc__card', svc);
      const next = svcs[i + 1];
      ScrollTrigger.create({ trigger: svc, start: 'top 78%', once: true, onEnter: () => svc.classList.add('is-in') });
      gsap.from($$('.svc__text > *', svc), { autoAlpha: 0, y: 34, duration: 0.9, stagger: 0.09, ease: 'power3.out', scrollTrigger: { trigger: svc, start: 'top 82%', once: true } });
      if (FINE_POINTER) {
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - r.left}px`);
          card.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
      }
      if (next && !REDUCE) {
        gsap.to(card, {
          scale: 0.925, '--dim': 0.6, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: () => `top ${parseFloat(getComputedStyle(next).top) + 24}`, scrub: true, invalidateOnRefresh: true }
        });
      }
    });

    /* ── CAMINO, GALERÍA: escenas fijadas con matchMedia (se desactivan con movimiento reducido) ── */
    initCamino();
    initExpand();

    /* ── MOSAICO: cada columna se mueve como un bloque (parallax sin solapar fotos) + entrada de cada foto ── */
    const tiles = $$('.tile');
    if (tiles.length && !REDUCE) {
      const colSpeeds = [0.045, -0.045, 0.07];
      const byCol = new Map();
      tiles.forEach((tile) => {
        const key = Math.round(tile.offsetLeft / 10);
        if (!byCol.has(key)) byCol.set(key, []);
        byCol.get(key).push($('.tile__btn', tile));
      });
      [...byCol.entries()].sort((a, b) => a[0] - b[0]).forEach(([, btns], i) => {
        const sp = colSpeeds[i % colSpeeds.length] * (innerWidth < 720 ? 0.6 : 1);
        gsap.fromTo(btns, { y: sp * 700 }, { y: -sp * 700, ease: 'none', scrollTrigger: { trigger: '.mosaic', start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }
    tiles.forEach((tile) => {
      gsap.from($('.tile__btn img', tile), { autoAlpha: 0, scale: 1.18, duration: 1.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: tile, start: 'top 92%', once: true } });
    });

    /* ── BENTO, apoyo y banda: entrada escalonada ── */
    gsap.set('.reveal', { autoAlpha: 0, y: 56 });
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out' })
    });
    gsap.to('.support__media img', { yPercent: -5, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '.support__media', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* ── FAMILIA: lista de señales y glow ── */
    gsap.from('.sign', { autoAlpha: 0, x: 40, duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: '.signs__list', start: 'top 86%', once: true } });
    gsap.from('.family__quote', { autoAlpha: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.family__quote', start: 'top 90%', once: true } });

    /* ── CONTACTO y FOOTER ── */
    gsap.from('.ccard', { autoAlpha: 0, y: 36, duration: 0.9, stagger: 0.09, ease: 'power3.out', clearProps: 'transform,opacity,visibility', scrollTrigger: { trigger: '.contact__info', start: 'top 85%', once: true } });
    gsap.from('.form', { autoAlpha: 0, y: 60, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.form', start: 'top 90%', once: true } });
    gsap.from('.footer__mega span', { yPercent: 40, autoAlpha: 0, duration: 1.4, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.footer__mega', start: 'top 95%', once: true } });

    /* ── Revelado de titulares (al final, ya con el layout definitivo) ── */
    headingSets.forEach(({ h, words }) => {
      const inPin = h.closest('.camino__pin, .expand__pin');
      gsap.set(words, { yPercent: 118 });
      ScrollTrigger.create({
        trigger: inPin ? h.closest('section') : h,
        start: inPin ? 'top 72%' : 'top 88%', once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, stagger: 0.05, ease: 'expo.out' })
      });
    });

    /* Recalcula posiciones cuando todo terminó de cargar (fuentes, imágenes) */
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === 'complete') setTimeout(refresh, 150); else addEventListener('load', () => setTimeout(refresh, 150), { once: true });
    if (document.fonts) document.fonts.ready.then(() => setTimeout(refresh, 100));
  }

  /* ── EL CAMINO: la sección se fija y el scroll hace amanecer ── */
  function initCamino() {
    const section = $('#camino');
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 960px)' }, (ctx) => {
      if (!ctx.conditions.ok) return;
      const { desktop } = ctx.conditions;
      section.classList.add('is-pinned');

      const pin = $('.camino__pin', section);
      const steps = $$('.cstep', section);
      const day = $('.camino__day', section);
      const dayItems = $$('.camino__final > *', section);
      const nodes = $$('#orbit-nodes g');
      const nowEl = $('#camino-now'), barEl = $('#camino-bar');
      let lastIdx = -1;

      gsap.set(steps, { autoAlpha: 0, y: 36 });
      gsap.set(steps[0], { autoAlpha: 1, y: 0 });
      gsap.set('.camino__sun', { xPercent: -50, yPercent: 92, opacity: 0.3 });
      gsap.set(day, { clipPath: 'circle(0% at 50% 62%)' });
      gsap.set(dayItems, { autoAlpha: 0, y: 34 });

      const paint = (time) => {
        const idx = time < 1 ? 0 : time < 2 ? 1 : time < 3 ? 2 : time < 3.9 ? 3 : 4;
        if (idx !== lastIdx) { lastIdx = idx; if (nowEl) nowEl.textContent = String(idx + 1).padStart(2, '0'); }
        if (barEl) barEl.style.transform = `scaleX(${clamp(time / 5, 0, 1)})`;
        nodes.forEach((g, i) => g.classList.toggle('is-on', time >= i - 0.02));
      };

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: section, start: 'top top', pin, anticipatePin: 1, scrub: 0.5, invalidateOnRefresh: true,
          end: () => `+=${Math.round(window.innerHeight * (desktop ? 4.4 : 4.8))}`,
          onUpdate: (self) => paint(self.animation.time())
        }
      });
      for (let i = 0; i < steps.length - 1; i++) {
        tl.to(steps[i], { autoAlpha: 0, y: -36, duration: 0.32, ease: 'power1.in' }, i + 0.68)
          .fromTo(steps[i + 1], { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, i + 0.8);
      }
      tl.to('.camino__sun', { yPercent: 4, opacity: 1, duration: 4.6 }, 0)
        .to('.camino__horizon', { opacity: 1, duration: 4 }, 0)
        .to('.camino__stars', { opacity: 0.08, duration: 4 }, 0)
        .to('#orbit-prog', { strokeDashoffset: 0, duration: 5 }, 0)
        .to('#orbit-ticks', { rotation: 140, svgOrigin: '200 200', duration: 5 }, 0)
        .to('.orbit__logo', { scale: 1.07, duration: 5 }, 0)
        // el último paso se apaga y el círculo de luz abre el amanecer
        .to(steps[steps.length - 1], { autoAlpha: 0, y: -30, duration: 0.35, ease: 'power1.in' }, 3.72)
        .to('.camino__head, .camino__visual, .camino__rail', { autoAlpha: 0, duration: 0.45 }, 3.95)
        .to(day, { clipPath: 'circle(150% at 50% 62%)', duration: 1.15, ease: 'power2.in' }, 3.7)
        .to(dayItems, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.5, ease: 'power2.out' }, 4.45);
      paint(0);

      return () => section.classList.remove('is-pinned');
    });
  }

  /* ── GALERÍA: la foto pequeña se abre hasta ocupar toda la pantalla ── */
  function initExpand() {
    const expand = $('#expand');
    if (!expand) return;
    const mm = gsap.matchMedia();
    mm.add({ ok: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 960px)' }, (ctx) => {
      if (!ctx.conditions.ok) return;
      const { desktop } = ctx.conditions;
      expand.classList.add('is-pinned');
      const media = $('.expand__media', expand), img = $('img', media), intro = $('.expand__intro', expand), cap = $('.expand__cap', expand);
      const from = desktop ? 'inset(38% 27% 8% 27% round 28px)' : 'inset(40% 8% 9% 8% round 22px)';

      gsap.set(cap, { autoAlpha: 0, y: 36 });
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: expand, start: 'top top', end: () => `+=${Math.round(window.innerHeight * 1.3)}`, pin: $('.expand__pin', expand), anticipatePin: 1, scrub: 0.5, invalidateOnRefresh: true }
      })
        .fromTo(media, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
        .fromTo(img, { scale: 1.32 }, { scale: 1, duration: 1.1 }, 0)
        .to(intro, { autoAlpha: 0, y: -70, duration: 0.4 }, 0.22)
        .to(cap, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 0.78);

      return () => expand.classList.remove('is-pinned');
    });
  }

  /** Intro del hero: se dispara al terminar el loader. */
  function playHeroIntro(scene) {
    if (!HAS_GSAP) { scene?.form(); return; }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero__focus', { autoAlpha: 1, duration: 1.8 }, 0)
      .to('.hero__hud .hud', { autoAlpha: 1, scale: 1, duration: 2, ease: 'expo.out' }, 0.1)
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 0.9 }, 0.2)
      .to($$('.hero__title .word__in'), { yPercent: 0, rotate: 0, duration: 1.35, stagger: 0.075, ease: 'expo.out' }, 0.3)
      .to('.hero__lead', { autoAlpha: 1, y: 0, duration: 1 }, 1.0)
      .to('.hero__cta > *', { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 1.25)
      .to('.hero__proof li', { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, 1.5)
      .to('.hud__tag', { autoAlpha: 1, duration: 1, stagger: 0.2 }, 1.9)
      .to('.hero__scroll', { autoAlpha: 1, y: 0, duration: 0.8 }, 2.2);
    scene?.form(3.9);
  }

  /* ─────────────────────────── 8 · INTERACCIONES ─────────────────────────── */
  function initFAQ() {
    const acc = $('#faq');
    if (!acc) return;
    acc.classList.add('faq-js');
    const items = $$('.acc__item', acc);
    const set = (item, open) => {
      item.classList.toggle('is-open', open);
      $('.acc__q', item).setAttribute('aria-expanded', String(open));
      const a = $('.acc__a', item);
      if (open) a.removeAttribute('inert'); else a.setAttribute('inert', '');
    };
    items.forEach((item, i) => {
      set(item, i === 0);
      $('.acc__q', item).addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((it) => set(it, false));
        set(item, willOpen);
        if (HAS_GSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
      });
    });
  }

  /** "¿Te suena familiar?": mide las señales y personaliza el mensaje a WhatsApp. */
  function initSigns() {
    const wrap = $('#signs');
    if (!wrap) return;
    const inputs = $$('input[type="checkbox"]', wrap);
    const bar = $('#signs-bar'), count = $('#signs-count'), msg = $('#signs-msg'), cta = $('#signs-cta');
    const ctaLabel = $('span', cta);

    const update = () => {
      const picked = inputs.filter((i) => i.checked);
      const n = picked.length;
      count.textContent = `${n} de ${inputs.length}`;
      bar.style.transform = `scaleX(${n / inputs.length})`;
      msg.textContent = n === 0
        ? 'Marca lo que reconozcas. Esto se queda en tu pantalla hasta que tú decidas escribirnos.'
        : n <= 2
          ? 'Con una sola señal ya vale la pena hablar. No necesitas “tocar fondo” para pedir ayuda.'
          : 'Estas señales merecen atención. No tienen que enfrentarlo solos: escríbenos y te escuchamos sin juzgar.';
      const custom = n ? `Hola, quiero ayudar a un familiar. He notado: ${picked.map((i) => i.value).join('; ')}. ¿Me pueden orientar?` : CONFIG.messages.family;
      cta.href = waLink('family', custom);
      ctaLabel.textContent = n ? 'Quiero hablar con alguien ahora' : 'Quiero ayudar a mi familiar';
    };
    inputs.forEach((i) => i.addEventListener('change', update));
    update();
  }

  function initShare() {
    const btn = $('#share-btn'), hint = $('#share-hint');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const data = { title: 'Un Llamado a la Vida A.C.', text: 'Centro de rehabilitación cristiano en Salina Cruz, Oaxaca. Atención las 24 horas.', url: location.href.split('#')[0] };
      try {
        if (navigator.share) { await navigator.share(data); hint.textContent = '¡Gracias por compartir! Alguien lo necesita.'; }
        else if (navigator.clipboard) { await navigator.clipboard.writeText(data.url); hint.textContent = 'Enlace copiado. Pégalo donde alguien pueda necesitarlo.'; }
        else hint.textContent = 'Copia el enlace de la barra de direcciones y compártelo.';
      } catch (err) { /* la persona canceló: no hacemos nada */ }
    });
  }

  function initLightbox() {
    const lb = $('#lightbox');
    const items = $$('[data-lightbox]');
    if (!lb || !items.length) return;
    const img = $('#lb-img'), cap = $('#lb-cap'), count = $('#lb-count'), fig = $('.lightbox__fig', lb);
    const focusables = $$('button', lb);
    let idx = 0, lastFocus = null;

    const show = (i, dir) => {
      idx = (i + items.length) % items.length;
      const src = $('img', items[idx]);
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      cap.textContent = items[idx].dataset.cap || src.alt;
      count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      if (HAS_GSAP && !REDUCE) {
        gsap.fromTo(img, { autoAlpha: 0, x: dir * 50, scale: 0.97, clipPath: 'inset(6% 6% 6% 6% round 18px)' }, { autoAlpha: 1, x: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 14px)', duration: 0.7, ease: 'power3.out' });
      }
    };
    const open = (i) => {
      lastFocus = document.activeElement;
      show(i, 0);
      lb.removeAttribute('inert');
      lb.classList.add('is-open');
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
      $('.lightbox__close', lb).focus({ preventScroll: true });
    };
    const close = () => {
      lb.classList.remove('is-open');
      lb.setAttribute('inert', '');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      lastFocus?.focus?.({ preventScroll: true });
    };

    items.forEach((btn, i) => btn.addEventListener('click', () => open(i)));
    $$('[data-close]', lb).forEach((el) => el.addEventListener('click', close));
    $('#lb-prev').addEventListener('click', () => show(idx - 1, -1));
    $('#lb-next').addEventListener('click', () => show(idx + 1, 1));

    addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1, -1);
      else if (e.key === 'ArrowRight') show(idx + 1, 1);
      else if (e.key === 'Tab') { // atrapa el foco dentro del visor
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // deslizar con el dedo
    let sx = null;
    fig.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    fig.addEventListener('pointerup', (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  }

  function initForm() {
    const form = $('#wa-form');
    if (!form) return;
    const name = $('#f-name'), phone = $('#f-phone'), who = $('#f-who'), msg = $('#f-msg');
    const note = $('#form-note'), btn = $('#form-submit');

    const setErr = (input, text) => {
      const field = input.closest('.field');
      field.classList.toggle('has-error', Boolean(text));
      const e = $('.field__err', field);
      if (e) e.textContent = text || '';
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    [name, phone, who].forEach((i) => i.addEventListener('input', () => setErr(i, '')));
    who.addEventListener('change', () => setErr(who, ''));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      const fail = (input, text) => { setErr(input, text); first = first || input; };
      if (name.value.trim().length < 2) fail(name, 'Cuéntanos tu nombre para saber cómo llamarte.');
      if (!who.value) fail(who, 'Elige una opción para orientarte mejor.');
      if (phone.value.trim() && phone.value.replace(/\D/g, '').length < 8) fail(phone, 'Revisa tu teléfono: parece incompleto.');
      if (first) { first.focus(); return; }

      const parts = [`Hola, soy ${name.value.trim()}.`, `${who.value}.`];
      if (phone.value.trim()) parts.push(`Mi teléfono: ${phone.value.trim()}.`);
      if (msg.value.trim()) parts.push(msg.value.trim());
      parts.push('¿Me pueden orientar, por favor?');
      const url = waLink('', parts.join(' '));

      form.classList.add('is-sent');
      $('span', btn).textContent = '¡Listo! Abriendo WhatsApp…';
      note.innerHTML = `Si WhatsApp no se abre, <a href="${url}" target="_blank" rel="noopener" style="text-decoration:underline">toca aquí</a>.`;
      const w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (err) { /* noop */ } } else location.href = url;
      setTimeout(() => { $('span', btn).textContent = 'Quiero que me escuchen'; }, 4000);
    });
  }

  /* ─────────────────────────── 9 · EXTRAS ─────────────────────────── */
  function initCursor() {
    const c = $('#cursor');
    if (!c || !FINE_POINTER || REDUCE) return;
    root.classList.add('has-cursor');
    const label = $('#cursor-label');
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; c.classList.add('is-on'); }, { passive: true });
    document.addEventListener('mouseleave', () => c.classList.remove('is-on'));
    document.addEventListener('pointerover', (e) => {
      const view = e.target.closest('[data-lightbox]');
      const link = !view && e.target.closest('a, button, label, input, select, textarea');
      c.classList.toggle('is-view', Boolean(view));
      c.classList.toggle('is-link', Boolean(link));
      label.textContent = view ? 'Ver' : '';
    });
    const tick = () => { cx = lerp(cx, x, 0.2); cy = lerp(cy, y, 0.2); c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; requestAnimationFrame(tick); };
    tick();
  }

  /** Botones que se acercan suavemente al cursor. */
  function initMagnetic() {
    if (!FINE_POINTER || REDUCE || !HAS_GSAP) return;
    $$('.btn--magnetic').forEach((btn) => {
      const qx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const qy = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.28);
        qy((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  /** Tarjetas del bento: foco de luz que sigue al cursor + inclinación 3D. */
  function initTilt() {
    if (!FINE_POINTER || REDUCE || !HAS_GSAP) return;
    $$('.bcard').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
        ry((px - 0.5) * 7);
        rx(-(py - 0.5) * 7);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /** Brasas doradas y azules que suben detrás del contacto (canvas 2D, animación continua). */
  function initEmbers() {
    const cv = $('#embers');
    if (!cv || REDUCE) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [], visible = false, raf = 0;

    const sprite = (rgb) => {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, `rgba(${rgb}, 1)`); grad.addColorStop(0.25, `rgba(${rgb}, .55)`); grad.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      return s;
    };
    const gold = sprite('246, 224, 131'), blue = sprite('108, 200, 240');
    const make = (anywhere) => ({
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 20 + Math.random() * 80,
      s: 6 + Math.random() * 22, vy: 0.2 + Math.random() * 0.55, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.6,
      img: Math.random() < 0.62 ? gold : blue
    });
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: clamp(Math.round(W / 15), 28, 80) }, () => make(true));
    };
    const draw = (now) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const t = now / 1000;
      parts.forEach((p, i) => {
        p.y -= p.vy; p.x += Math.sin(t * 0.6 + p.ph) * 0.25;
        if (p.y < -30) parts[i] = make(false);
        ctx.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(t * 2 + p.ph));
        ctx.drawImage(p.img, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      });
      if (visible) raf = requestAnimationFrame(draw);
    };
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    }).observe(cv);
  }

  /** WhatsApp flotante: entra con el sitio y "saluda" con un globo de texto. */
  function initFloat(afterLoader) {
    const wa = $('#wa-float');
    if (!wa) return;
    afterLoader.then(() => {
      setTimeout(() => wa.classList.add('is-in'), 900);
      setTimeout(() => wa.classList.add('is-tip'), 7500);
      setTimeout(() => wa.classList.remove('is-tip'), 14000);
    });
  }

  /* ─────────────────────────── ARRANQUE ─────────────────────────── */
  function boot() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    scrollTo(0, 0);

    bindWhatsApp();
    const year = $('#year'); if (year) year.textContent = new Date().getFullYear();
    safe('decor', buildDecor);
    safe('nav', initNav);
    safe('menu', initMenu);
    safe('smooth', initSmoothScroll);
    safe('anchors', initAnchors);

    const scene = safe('hero-3d', initHeroScene);
    if (HAS_GSAP) safe('scroll-fx', () => initScrollFX(scene));

    safe('faq', initFAQ);
    safe('signs', initSigns);
    safe('share', initShare);
    safe('lightbox', initLightbox);
    safe('form', initForm);
    safe('cursor', initCursor);
    safe('magnetic', initMagnetic);
    safe('tilt', initTilt);
    safe('embers', initEmbers);

    const loaded = runLoader();
    safe('float', () => initFloat(loaded));
    loaded.then(() => {
      safe('hero-intro', () => playHeroIntro(scene));
      if (scene) setTimeout(() => scene.relayout(), 60);
    });
  }

  /* ─────────────────────────── DATOS: LOGO COMO NUBE DE PUNTOS ───────────────────────────
     5 045 puntos muestreados del logotipo (x, y: 1 byte · color: RGB565), en base64.
     Se generó a partir del logo; para actualizarlo con un logo en alta resolución,
     vuelve a ejecutar el muestreo y reemplaza esta cadena. */
  const LOGO_POINTS = 'rbXvXJKE//93IeccX6f//3Jw/7rcwf/0Vkv/+51p//+dTd76aZb//5Za///GIf/+nb///5x4//8bpffVxkHnPIds//+26//3m1///55y//8Vff/7g3T//7ct//dpr///hJD/GFBw//9LS//9Zp3//GKd//+uJf/1e5LuVLvR95mNjf/9hoj//Uxp//5HR//9vuT3WY5j//9peP//aKf//wuH//y9KP/8apL//2Fo//91i//+l3f//6xZ//zQns5WVqb//1xt//+Wi///Z6D//15x//+Zi///alD//+I///thoP//ljLf/0xb//9sYf+a5Un/+ayw//9IS//965X//Gal//94kPZ1ozrP/1ZI//1HIv+Vbpb2tnxp//9Ub///Rjz//5R3//9dgv//xyf/+iCd//l3qP//iML//49o//9XUf/8imX//j+ax/+Yg///xkv3u3CN//90g/+XY3P//6U+x/9sl/a26GD//25u//xybf9Y0sj/+nis///sZP/3xSz/+p1t//9Yov//Qkv/WZNi//+Caf/7QU///GVv//9SpP//ecT//5x8///hQ//YfYn/29U05xjHxf/9kHv//22p//9lg///shr/+3oY//QSaP/5Y2P/nZIl//9/w///baD/WFpM/9l7j/62WBX/9NpL93cpt/+Vmd///Zl1//+Dh//9yCX//Zy3//+sQdf/WL7XGnTC//9lmf//l4D//+d///VSav/6fwj//mpe/1hEs+bZsDP//5EK//yAkP7WjL///3OP93tETfcYj27//1+p//90Wf//Mczedktm///OW//ZtBf//LSs//+lFNaVh2H//22s//90sv//jL3/vV29//+z1dY1jXr//1Jj//+OEv/7mlr//4V///9aYtZ3h3n//2ll//+4rv/+jn3//xte//ZnrP//QljedY5q///UMP/6dOT/+LE3///eQ//5im///0lI//1vsf//ko7//pOT1tlIPP//tDn//4xu///ZOv/8SrD//4p9//9yBv/0U7Lf34DF//9ae///YbD//2QN93R4sP//TbP//553//9prP/9UG7//4Zx//8kxOaVi3b//10n//+2qf//ztj/9Mp5z/9wg//7SkH//5Fl//+EZd99jhb/9h41//vkVv/2dAj/+Zjm/5WhH//6Wlb/+0hh///Gis//wkf//59e//qVO8cUod//vX8Q//WQWf//WJ3Oen8O//djVu51feT/+Hd//7dwq///TiH/+1ly//+Phf//Xrj//1JA7/9kpf//dRL/+3PF//2OYP//TkP//05W//+Kh///0D//+WmY//1xD//5xNf//nCl//5p5P+Ulmj//5OM//9/eP//Ylv//2m13tp7hP//QpLH/1Zw//9fTf95eCP//4OO/1mhOL//Q0L//Zto//9s4veZX2n//5pq//9mrv//Xav//0Q11rqWhf//ZWn//+CY//RT4//Yc67//pNp//9tFv/64En/+3hd//8Plf/3ahD/+Eus//9vf///h5jGN7S0//9RVv//ZYbvGZ4s3xhwqP//TBz//NlX//ZpvP//k27//+dS//oPT8YVXyLe24F8//9uvL9/MDj//I1d//7vh///XHj//3uK/7tye///lrv//567//9FU//+XU3/V6IT//ZtY/8Xdr7//4qO//yacP//cFH//yKE/zZNY///bKL//p3i//uIltY2533//8Xg//pxWu7VwIfn/0Q///wxd8f/ZV3//48P//kjc/81wCX//p613/+HlO51ZnH//10a//xtId77Wg///o6H//+HPteYqC7//1ze99vpZv/6mGP//2Yl//90iP/9nWH//0xW//9FsP//w1PX/0xF//1hmv//c+r/9cTO//iiGf/12L7//Je///9EWf/9jln//2vE///HR///MUfGOGVa/5uMBv//3or/9EZh//+Cwv//uOX/9lvq71ynPM//Ul3//5Nn//9pUu504WX//CJ2//8kOv/6Ux7/9K8h//S11P/+1cb/921x//5OYf//chj/9i28//Z1r///SFj//31r//9pgv//wLf/+qFc//dvJv/8b1T//7Qd//quYcZ1Vbn//7Ts/5RJVv/+Vlf//9VF//RueP/+l0v/+Gqk//+abf//bmn/2rvM//2BIf//jjj/9VRz//9VEv/5lyr/eGlp//9SaP//coH/uJBd//9NcP/+aJP33814z9+Gkv8XjH///39///9jev//f4v/mVTb//nkkP/2SGn3OprS//dZbPeciGr//2Ft//95H///rD/P/1FS//1iX///bIb/urUp//dZXv//0pf/+1p+//2JJv//SEP/+8Mt//eSbP//x2H//8NB//9tfP//sV3/+F9S7lTJx//2bbT//3Wl//tKbve8KnjXXoWD//+LcP//klb//xaD95ZNuv//Y2b//9uk//e75P/1Y2z//4pb9/9m4//3t9D/+t3F//hkf///bH///zTO/5mnt///mSfOWc6Dx/9ZeP//Z2X//2F4//9JRv/9d3n/FSld/7erLf//Z3T211ZN//yw5f/2h3T//4MN//eQYf//zzj/9XGI9vaY7u8YinP//6nd//m/yt7YlYf//9I4//aMGf/2Ion/+SKw//pmf///stj/9WxQ//9GQv/809P3V3h8/7h0o//7kmD//3Bs/9tgX///MC3edxqn//i6K//31Uj/9Hii/xiPld65R1v2tVVS//+JIv//nIj//2YJ//a1Gf/6tOj/24OD//5zku6WY5v//54T//5Ypf//ipH/eZVc//9iKf//Y+H/+pZs///lX//+hQ//9zCt/7fUV/eeg4r/+jZH//rfP//6Zkz//1dm//+Scf//Wqz//22m//6vQtf/U0L//1hG//9QdP+aeZvN9X6P/tbakv/4aqH//9Jl3xmx1P/+joH//1kq///UcPbVYWH29xRP//VWaf//gXn//8qS3/+HZf/6fxX/9WUh//996//1f3D//z4o//iO6P/WaRX/9l5t//+Piv//w9vm2NO7//Y+LP/2e2X//6UP//uiVd8Y05L/+VtH//+Rkf/8WhP/9XRW//9/dP/+5mH/+myO//7dTv/3X3z//9yG1tRzJf/+T1n//1BH//w/Qe75dln//7nW7zZ0d/+YiGj//2Hn/7QdWf/+Y8P//0enx99ZUv/9GqH/+BaR99VSzf82TlD//nSo9xhC6P71LlL/+YcL//08Nv//lVf//2FK//+XdP//Uln//2hc/7uCEv/4QbDvnXsG//zOv963abH//8Et95ScXf//Q5S//3K9//9hq///Y33//4GW3hSSef//gnb//zSA7/+aKt644Fr/9WeG//9fXP//mML//1wV//3dmf/UeIT//6Im//9rcf//Q0n2tppX///Gyv/3Znr//+VY//qkDP//z7f/+Vpa//9f4P/9UbH//2RL//98i/95eIf//1RZ//+30v/621b/udIz//lSeP/+NT3//5w+//x5W///0pX/+MDh//ebUP/3iIn//eFq//bPTf//PiX/+aQX//XJUv/7Tkb//T8Z//zDQ///N7f/NH2A//9kYf//Kyb/+hlW95pEX///cLTvn0NW//++Q//8Y7v//x7A/xROsP//a6jel2ht//9QW///ZpX//4qD//9fof//ZXf//81Y//9aSf//NIP//1xe//9nTv//SyX//3p+//6/Mv/2ZbD//3TG//9aHf/2o7f//yHI/9V/ve//aXD//2QI//dXJ///gJnONh2S//63PP//cCD//823//tcnP//iXX//1Lq/5dSS//94XH//05S9tV5qP//JWX/u+yX//ahLf//4oz/+1JO//5VQ///d4n//7dIv/+3NP//McT/NoVn//uRh///X0j//4OU5jRWbP/+3Wn//NDL5vuHvf//LT7/9pWD//+O4//3bFP//0VL/tXmo//bPz3/+0FN//9cJP//iub/+Cid/1TEJf/6wEX//JIh//9YXP//dl//eLDG/7Uaaf/4FIz/+n9s//+Ov///v1HX/0LC/xZZoP//F6T/+W6k3nVaqv//D6TGFX+G//1T4P/2Vt7/9epO71rjS//4jZL/WV6j//94pf/+vDz//1oZ//VXef//rV3394CI//vTuf/8Wl3//4qV3nZK6P91jtX/+Mdk5/9xeP/8sLP//6wk/9haaf//lmD//6vK//lMyvb0tK///2GD//84x//7Fpj/9uhM//9zh//6XFL/moPk//ZhWO522Z7//H/1zfSw6/+3jWf//5l4//+pPs//3pPvWKrp//bVPP/9eyX//Ezc/1Yqo/+W2FP/+tnM//dWLv7WmyX//452//9lrP//Y6///2IY95jKdPf/RKX//7LF//iwHf/6fmf//51a//9JZP//QVL//YQm/1lyc9YUaKT//8hP//9LPP//l3z//+dV//jsYf/7SF3uVMNW9/8y1P+6l1b//7cV//y4zu9aotzvOIcW97mi7P/52Ub/9myS//9IUv//ab///8lmz/+HB//9rdb/+H5l//9aUP+apun/+kth//9Tof//TmX//8vF//iDCv/71y///2HB//+lzf/4VmD//NSO//jWwP/4zs3/957Q/5dpTP//yJbX/0hm//65Nv/fl5HnXXeO9xiZGv/8FVz/+qLO/7dpDf/4DZT/+apO1/9BR/b3z17/+1af//95Yf//g3///2MP//tqd///Xp3//zhE//tOXu6UjMT//59Q//5a0f/4uuH//nfk//oKiv/0lOH/9Yp5///KRv//Tm3//4h7//9gKf//ihr//ZwW//uk4v/1hXb//xuT//p0c//8bMPv/xKj/9eOB//+NHzPnkve//ojyv/W7IfnOZ8p///TkP81Rlf//0xZ//8Rfv/3zzb/+3BW//9Oaf//3ET/9oOYzjV/I///XVb/+5B///+ZXf//mYf//z9T///Ei8f/S7X//8Zf//93sf//fYb//YnW/5WxH//14Fb/+h5k//Vhu733Xmb//6G1//9rTv//ysD/+Twg//nL2vb1dY/ut9WD//xotN9abCb//n1z/rQfq//6NHj//51n///A0f/3LSn/1lqm//+lGv/51Yf/+O2W//2FF//0eo7+938S//k4P///hMfe2s69//nGmcf/PDz//46O//1OF//1OtL/FFEw/1eRDf/2xCn/94675/9H1f+XLUf//zFf1/+y5Pd5aX///5aJ//+W4f/1jvD3mneezhVY0Pb2P6r//5qC//+Tf///EnvnV0eq//95gP//jJXet5Qw//1rb//+knz//2Fr/1nguecYI87/NJ9Xzpph0//5xq//+jI///87ksf/pbn//1hD1/9frv//V3v//ybT/1QwO//5XWP//4xr//+SP///lsT//ljk9rWNeP//pbP//5aP//6WKe97XHL//+WC//aSXP//XKT//2Al//9uhf/ZdoH/+V2v//9SW///rzD//1ZG//+7vP/1ktX/+h5o//WVwf//fZL2VVm3///apv/3XMD3/1hXzjezKf/7Oy3//L3N/7Zrpv/+4lr/91JF//+tuM7cg3n//6e0//+dV///amz//0c493h6ef93pRL/+356//8lzf72X7H//2l87xhwdP//GU7/9mci//8/z/90c4v//nRd5lSaZf//3V//9EtO//x9b/a0fHv//+GQ//oWR//2mI7//pKK//8bTt8V3Dn//bi///xhgP//bq7//34L//XLp//9nlz//7is//86OP//iIH//9icvfZI1//0P0Tu2NWK//uvNvcZZKL//2VO//9N1/b2zXXP3yrN1jSXRed03jjW2F3w/zS/Ke93nHT//3lk//3MkNe/M4fv/2ly//9Hxv83TjL/+7eX1//XTf/456f/9op///9pqf//yNb/+HvC//+DfP//gdf/VEs0//sxTPdaWGP//yfQ/9Z46P/45pb/2Yhw//+egP//ipe+NqMQ//ZAOf//Z2H//LuSz59agN41D2f//HFp9pVypv//t1Xn/48j//+dev//dH3/+1uf//9Cqf//i1///eCN//idhP//0zb/+VR47redf///JmL/ud+o//Xkqf/20kf/+I8n5vihD//6Yr3//2uW//xNSP/9nXD//5Na//+IMt/+XWr//x67//XJSudcK0D/9JN0//88P/9YwVbH/11a//9hpv//Tunm1Yph//shnP//4pr/9827//WC8tZ2wbX/9XBl/tfCMf/1aAv//Vep1ndpYf/9yML/911U/7oyMP/2GcH/+SjM/5iPvf//iMT//2xp//1ar+d75kf//6JD9/50ev/+Tj7//4aG//5KbP/8mHH//zR6114aWP9ZSdv/9ZqK///hYt62xMb/+INs//iDcf//n1L3dZO771smt//2L8T/9rRHz/+USf/0HWr/lGHk/9ZOS//9LL//1Vh19vbohP/6zU3//2yC//81xf/8zL7GFmuw//9dUPaVl9P/dlJs///Vy+b2Z5r//0Pr9xeKi//9zTv/+eJz/5rCief/1XT//X6Z1hV4iv/crkTH/4yE///Yxv/+f7///2Fw//9/H+ccVlT//JJD95mMiv/+S7f//09N//4+rOc8yaz/+zDA//h8wP//Rzr//4iS/zhrdPcZEo///Ipo///bQv/1T2P//0sY3tZOQf//hHD//6gx///kaf/6WuL/mVxn//+xqP//I0//9kM8//xqg///cbD//4eO/7oief/ZPtT/1agr731Fq///jZD/+95dxjV7m8YWfWHHXp7u/xRgev//mWD//48L//ilIf/+gI7/ONE7//0uN///xVnX/5PEznm8yv/8e6X//Y50//9DOP//4Uz/9WbV/3ewJv/8YU7+1TrK//h7ota5XXT//0TW/9TVMf/8jlz//9Ut//xWWv//kMT//yNw//zAx/e8hRP/9K+Dx/9VD//165n/+rfVxjd0q//8e4L//1Jy//9snv9XkWr//8Pi//bLbsf/ZIL//4Bn//8uRP//5H//91V13lRuwMb7eV7//1pl//95Jf/8Sz///5kj///EMPfbMEn//2x5//8rV//8arP//9Ns/7Z7Y///cZTmNGYO//VmFP/+VRb/+hvC//VSF//by1D3nl6a//9fWv//sjL//6NG//2D1//4jsb//6w0/7uYT//5dSX//Ksq//80QP//4Gz/14WW1lamvef/52f/9q3s//bSV/eejGX//3CQ//2KNP//gXP//5gb//hdef//WsD//1Vj///Ce979Fn//+8A5znmEi//a6WT/9Zhm//9DWv98ynfX/9nK//cbt//5nmP//2md/vaur///pkvf9Rac//pubP//Q6z//6Qp1rqWef//zlK995DC//9adeaWu0D/+z+Ox/9dSf//2cH/+qAS//qHhP//UWb//5Zl//93dfaUXGH//BaV//bhiv/9kRL/9pEV//dzoO52eGL+1Ugm/7XVf//8qUDP/5m3//9z5//Xvzz//5F1//+/jNf/Q+T/VIZ8//9Cp///CWr/+cxx3/+pr///r1r/+lK4//90f/60YhrfFoKS9pVHP///42D/+GnD//8wTv+YTy33nXah3jWCb///PL3/WIEe//8lx//9I4/GNnQV//VgVv95o0j//EoV//x2hf/+foP//pIp//pOc8YVg7///1+A//9jmP//WqH//4dj//50Df/3qMr/t7FF1/8tTr33o7Pv/6Xz1pa75v/3ohb/9U4r//8Sjf/9WnD//2IT//tjq///C1r//yrD/3uMJ//8Q13//6Uw//tsFP/2QjLGOJBx///VeP/9e6z3v127//+OPM5VVF3//zjS/5l8d//7TS3//3Vv7jSSlsa8s0PH/4fk//WMfP//g8P//59a///dSs51p9v3NtKZ/7kifv7028X/+eVl//qpXP/7h8bGeEdj//8qe8Z6aCj+9kdE//0XXf/6QkX/2+lh//hTe+8ZHqj//b4+5z2TiP//ZSj//l1+//6oWt72yNP/9TuQxz4vvv/81VD/9pY0//91C+cZXR3/+sN13/8bvf+WKD7/+w+K//q02f/5q1///ZI895aKBv//y8//+TzO3lWVkve9Znz//0Dg//t3Gd40WuX//HsV//e2wf/4w8r//ski//3I3f/2LtXutGHv/3kWVv/7m4b//8/O//dJW///Txn/9pl7//9WdP//dGzuNB6g//cyY8f/zqD/+sbb//VVZv//Fk7/+kdQ///PT85ZcOn/9Q9a//taLP+Xmkvn3NhH/7SSNP/2gYL//tpd3tms3v/5Cmb/+HGh/1iajddfY7LvW5IQ//e1Ev//Qj///LBj//0nm//aY2n//xCA//ZY3vc2bRr/VA6I93dw5f/1z8H3uVct//xZ4f/35KP/+lQZ//TCeOd/ODH/9IMW//aEaf/5C13/+2XF355Irv//Laj/Np64//+bVf//U0n/++Fe//8ah9aUjML//xJb/7rjjv/6fAn/9Tm67teaf///saz3vp58///iSP/8sNn/+Gho//9sEv+6a9X/NYzqxjXLVv/+3of//V7S//yedP//GKj/90NH//3DSP/+wn7335o65/5wev96og7//4qJ//6Hfv//aF///HWS5jSf4v/5kjj/9ia+/vVXu///lm7//2xl//+93ObUv7n//bNl31qu3f/81zz//OCa//RoEv/3Pjj//0Me//7CNP/1tyf//ydg//6qUcdcNeH/liC//5kwcdf/M3T//xVo//q5lOf/Zan//3uq///pU//8Yb///2+S/3t3wd++jeb/lVYl//956v+YHWD/9Har//88zP/1cbP338ZO//wmPP/6YUz//7Rjz53KvP//uVbXHeJW//ldGP/8xLL//asz//+HGf/7RFD//3CK9vd+jf84w27O3JrDv16i8e80cQv/90BW/7y1N///ln///3gG1lWZSO//tOX3ed7B//w3i9deSjX/dK/o/9R1D/+7LsL/13wX/5UZSf/4W0v//o02//+zL+c8h+n/9JY3//tWKv//ysP/+by7//ZEYv+8JG3/mIAL//3Vff/9VaT//7fh//Zhov/8r9Tvd2Vl//8eyf94lHv//33m//a/zv/1JZX//LDb//dVev//HKrveKU61//PPf/1nhf/3WRZ5jRUS//8WAv/+Jrm/7RNIP+164//9XXX//ghN//+trD//5xs//9ALM5Y3m3OVkxA///Oxe9826HvfO9j//7ni//1K7n/9cUi//xMEP/6Kk33nbAk//lVqNZ2YXv//6Uc//t7h//+F5r/+SzE/7QvK//8DWf/tZB4//8Tl//2MnnH/5lU///K2f/2FEb//NI+//2V5f/2cHL/mk+61x5Nrf//Ljz/9ZZd//9PE//5RR///q6s//9Ztb+/jkjn/dtZ//W/2//2H1r//4og955rrf//V27//1dq//+Hd///Ncf/9mzo/3SiK///S1T//1pY/52DxvfdXab//etg/7yEbf//Hkv/+Gx1//9pxf//guv/1hm7//ZaEf/3lELnXWai///lie+V1G7/+WEc//3SZ//6t2/P/9JV1rpiqP//qtf/+17D557ZUP/2YXT//tV6//w0s//4vt7/1Tsb//U/S/f/oVrnnYps//91Bf/92EPe9lrt/1W00v/9nODvOuZ75xt+ff//Pd7mdRGl//SkPMf/emf/WKRX//pyUvf/dPLWNBNV//dJ5f/3Epb/+hyG//xQYdZYKaD/+WuZ/vdydf/9xN3/9rWn5/9TJ///Q1P//9jD//dfg///tMPm1k7s/7ccxv+4XVz//5Zx//+Evf//f8b//+E9//6/Y8f/mX7//53k//mHiv/8XbHm2BSj//lp6P/Z0WL//N1W//oiTf/YNMP//N+W//oQhf/1M0v//Z7d//9AGv/9gw//9TDG/1Vdof//b+P/+4Mi///Oh8//nsHHHkIi/9WNP//9YHP//1VP//1SHP/1uj//2yGt//vviv/8nYL//4OB//+ku84XIcX/dcs+//bgoPf1Zpj//5CN//5XEv/1XHv//45w//9wIv//0rfnWjiNvr3faP/7dJ7WFE0w//+m7P90RuPmd0TE/7kksvfXpR7/+dK+//drGf/1wDD/+bjp/5aSWP//m/D3dRmd5zhMXf8WcMf//z/A7tZGZf+8jmz//0Q7///Mwf/3Z2vWNoiP/5kgzP8VYcP//5ti//+oSt//T+H/+nGs//9gZP//DVP//153//9n5//4WH/WFhWZ//VkC//21p3/+Rdp//kva8d/LVT+9WVn//97X///rcj/90tD//5A4v/ZOS//9RiI71RnUf9YZ/DedVZ91jWea++/ynHfnpHi//cIYc5ZNIn//0bT//ijLv//zEH/+Rml//WqL///02n//ZtB//VapP//cRHvVHun//96sf//Gpb/9rmBx1+i4f/0PIG+OXoh5zxEQ//9tBXGdWV0/9s/I972xnLP/5GB///Njtf/zKX/9XvE//82Qv//f5LuVOiV//tB0v+3ldT/N3B9//+us///lF7//zvl/1dSL//7fyX//wmH//0laP/9xIfGXWWg9vZv1v+Wwyv/9yVq/7hpmv+6fBL/9cOExrvTxv/6Lqv+9Ild//88HubVcPHm1Wcgxjg0Mv/+w8PGFHBv/9p2H///utL/9V0q///Qm/91U1b//6Pv/9Vyqf//mXP//+hKxjdRQ///goz/mbfj/9ecdv//Sk3//XjX/1SUVf//K73/tniz//+Hv///myP/3iWY7vjjlv/1C5b/+pLo//dHVP//4Ij/93QZ/zavP8f/j1bf/8e///2FCP/8Gmz/9eC793Q0Sf80Epr/9jjP/vVVzv71zqP//DfZ//vrif/2J8D/mFUf//i71f/4p+//d9RO3tjpm+cVOc7/9Slb//tTpt645JP/93Zb//8pRP80f2n//bsp//5ipP//wyT//2Gt//8eTv/5xD///zwi//vS0P/7dLzP/yBM//3kfP/5luj/+EwW/1Yci++UmFrOeVGix79p4v/7cX///mTo/5Xtjt7UoRz/+JZ1//804P+XMrD/dlmo//8kkv/5M27Xn6Dz5tXclv/3mLz3/9nH//qOZf//bLXOFrY7//9lbP//kgv//15h//45K97b3UD//ZA+zpdTU//Z307/9XCg/pU4Us9eZ3f//6HkxjacLP/8drT/XN6c//zK0v/7jkD/9WmH1lZpJdcbVqH//8fL//1YTv/aU1///OBh//SZb///Pub/umt7//9/5P/5IlL3N7c5//8VbP/0giX//+Gk//Wsrd8+t9nOFOiC//uZbP//kUj/9cJSx/9ssf//6FD//Zhp//9ZYdY0I43/+m8Y7xnDgtccvjnGOIdv//+MYf//NbX/l4UR//Y6Qv/4Yobed8Ar//8ST//6VQz/9F5L//+TZf//cWfuNNBZ//9MbP/+uljv/25W/vZz1//5dXv/+MvH3thllv//DlH/+zM3/5VjcP//qNn/9V1w//93x+e/llT//1J0/9spv/9UeOb/99JK//fKU//+uRX//9Fg1nedZf//mR7OVyI4//vopf/8Iof/uMO0//Zaa/aXpVn//B5h5vZAPP/8sC///73S//zAisffTtn//21m//zG2f/6bub/9qDs//tugv//Ssj/1ojx5vdD2P/Vo97/+Nij//Sotv//r7f//xtK//yxQsf/zovP/5BC//h9B//9URb/+haG//WD9840vI/H/5w8//5OEv/83qP/9+RB/7xhfv95KoTPv3EI//bZMOcaXKj/vcYp//5kFf/5kZPvWupR//6kXP/+txf/+5W5///UK+9dqFT/+UtR9paKPv/4tRv//h7D7lQ7u/cXhyb//Eewxjcie/931YX//UbZ/5WqWe/1T0r//Z1S//WX5P/2Nszl9F1H///Kqf/4rSL/+TV11/+zp///sSH/+MHk//ZbTv8Xokv/+DwwxjXdku+7ZNT/eEIc//87Ov//lmL//1Zd///Ypdap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';

  boot();
})();
