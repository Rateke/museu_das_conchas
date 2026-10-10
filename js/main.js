// Museu das Conchas · Itapirubá — interações do site.
import { SPECIES, GROUPS } from './species.js';
import { drawGlobe } from './globe.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const shot = new URLSearchParams(location.search).has('shot'); // capturas de revisão
if (shot) document.documentElement.classList.add('shot');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const isNarrow = () => innerWidth <= 860;
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
const nf = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/* ---------------------------------------------------------------
   Oceano (WebGL). Se falhar, o CSS assume com um degradê.
   --------------------------------------------------------------- */
let ocean = null, waterAt = null;
const oceanReady = import('./ocean.js').then(m => {
  waterAt = m.waterAt;
  ocean = m.createOcean($('#ocean'), { reduced: reduced || shot, mobile: isNarrow() || coarse });
}).catch(err => { console.warn('WebGL indisponível:', err); document.documentElement.classList.add('no-webgl'); });

/* ---------------------------------------------------------------
   Rolagem suave (Lenis) + ScrollTrigger
   --------------------------------------------------------------- */
let lenis = null;
if (!reduced && !shot && window.Lenis) {
  lenis = new window.Lenis({ lerp: .09, smoothWheel: true, wheelMultiplier: .9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
function scrollToTarget(target, opts = {}) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: t => 1 - Math.pow(1 - t, 4), ...opts });
  else (typeof target === 'number' ? scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' }) : $(target)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }));
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href');
  if (id.length < 2 || !$(id)) return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(id, { offset: id === '#topo' ? 0 : -10 });
  history.replaceState(null, '', id);
});

/* ---------------------------------------------------------------
   Texto que emerge: quebra os títulos em palavras
   --------------------------------------------------------------- */
function split(el) {
  const words = [];
  const wrapWord = (w, iris) => {
    const o = document.createElement('span'); o.className = 'rv-line';
    const i = document.createElement('span'); i.textContent = w; if (iris) i.className = 'iris';
    o.appendChild(i); words.push(i); return o;
  };
  const walk = (node, iris, into) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        for (const p of parts) {
          if (!p) continue;
          if (/^\s+$/.test(p)) into.appendChild(document.createTextNode(' '));
          else into.appendChild(wrapWord(p, iris));
        }
      } else if (n.nodeType === 1 && n.classList.contains('sr-only')) {
        into.appendChild(n.cloneNode(true));
      } else if (n.nodeType === 1) {
        const holder = document.createElement('span'); holder.className = 'em-split';
        walk(n, iris || n.tagName === 'EM', holder); into.appendChild(holder);
      }
    }
  };
  const frag = document.createDocumentFragment();
  walk(el, false, frag);
  el.textContent = ''; el.appendChild(frag);
  words.forEach((w, i) => w.style.setProperty('--wd', (i * .055).toFixed(3) + 's'));
  el.classList.add('is-split');
}
$$('[data-split]').forEach(split);

/* revelação ao entrar na tela */
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px 12% 0px', threshold: 0 });
function watchReveals() { $$('.rv, [data-split]').forEach(el => { if (el.closest('.hero')) return; io.observe(el); }); }

/* ---------------------------------------------------------------
   Pré-carregamento: "respire fundo" e a água sobe
   --------------------------------------------------------------- */
async function intro() {
  const loader = $('.loader'), count = $('[data-count]');
  const paths = $$('.loader__mark path');
  paths.forEach(p => { const l = p.getTotalLength(); p.style.setProperty('--len', l); });
  const st = { v: 0 };
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  if (reduced || shot) {
    await Promise.race([Promise.all([fonts, oceanReady]), new Promise(r => setTimeout(r, 1500))]);
    loader.remove(); return start();
  }
  const draw = gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: .15 });
  const counter = gsap.to(st, { v: 86, duration: 1.6, ease: 'power1.out', onUpdate: () => { count.textContent = Math.round(st.v); } });
  await Promise.race([Promise.all([fonts, oceanReady, new Promise(r => setTimeout(r, 1100))]), new Promise(r => setTimeout(r, 3000))]);
  counter.kill(); draw.progress(1);
  gsap.to(paths, { fillOpacity: 1, duration: .5, ease: 'power1.out' });
  await gsap.to(st, { v: 100, duration: .4, ease: 'power1.out', onUpdate: () => { count.textContent = Math.round(st.v); } });
  const tl = gsap.timeline();
  tl.to('.loader__msg', { yPercent: -30, opacity: 0, duration: .5, ease: 'power2.in' }, 0)
    .to('.loader__count', { opacity: 0, duration: .3 }, 0)
    .to('.loader__water', { height: '115%', duration: 1.3, ease: 'power3.inOut' }, .1)
    .to('.loader__mark', { y: -60, opacity: 0, duration: .8, ease: 'power2.in' }, .25)
    .add(() => { start(); }, 1.05)
    .to(loader, { opacity: 0, duration: .7, ease: 'power1.out' }, 1.15)
    .add(() => loader.remove());
}

function start() {
  document.body.classList.remove('is-loading');
  lenis?.start();
  $('.hero h1').classList.add('is-in');
  $$('.hero .rv').forEach(el => el.classList.add('is-in'));
  $('.depth').classList.add('is-on');
  watchReveals();
  ScrollTrigger.refresh();
  if (location.hash) {
    const m = location.hash.match(/^#concha-(\w+)/);
    if (m) openSheet(m[1]);
    else if ($(location.hash)) setTimeout(() => scrollToTarget(location.hash, { immediate: true }), 50);
  }
}

/* ---------------------------------------------------------------
   Profundímetro: cada seção tem uma profundidade (data-depth)
   --------------------------------------------------------------- */
const marks = $$('[data-depth]').filter(el => !el.closest('.depth'));
let stops = [];
function measure() {
  stops = marks.map(el => ({ y: el.getBoundingClientRect().top + scrollY, d: +el.dataset.depth }));
}
const ZONES = [[-Infinity, 'Na praia'], [0, 'Zona do sol'], [200, 'Zona do crepúsculo'], [1000, 'Zona da meia-noite'], [4000, 'Zona abissal']];
const dEl = { val: $('[data-depth]', $('.depth')), zone: $('[data-zone]'), temp: $('[data-temp]'), atm: $('[data-atm]'), light: $('[data-light]'), dot: $('.depth__dot'), rail: $('.depth__rail') };
let depthNow = 0, sea = null;
function depthAt(y) {
  if (!stops.length) return 0;
  if (y <= stops[0].y) return stops[0].d;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (y < b.y) return a.d + (b.d - a.d) * ((y - a.y) / Math.max(1, b.y - a.y));
  }
  return stops.at(-1).d;
}
function onScroll() {
  const y = scrollY, vh = innerHeight;
  const d = depthAt(y + vh * .5);
  depthNow = d;
  const dd = Math.round(d);
  dEl.val.textContent = dd < 0 ? '+' + nf.format(-dd) : (dd === 0 ? '0' : '−' + nf.format(dd));
  dEl.zone.textContent = ZONES.filter(z => d >= z[0]).at(-1)[1];
  dEl.temp.textContent = nf.format(Math.round(Math.max(2, 4 + 19 * Math.exp(-Math.max(0, d) / 260))));
  dEl.atm.textContent = (1 + Math.max(0, d) / 10).toLocaleString('pt-BR', { maximumFractionDigits: d < 100 ? 1 : 0, minimumFractionDigits: d < 100 ? 1 : 0 });
  const light = 100 * Math.exp(-Math.max(0, d) / 45);
  dEl.light.textContent = light >= 1 ? nf.format(Math.round(light)) : light.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const railH = dEl.rail.clientHeight;
  dEl.dot.style.transform = `translateY(${(Math.log1p(Math.max(0, d)) / Math.log1p(4200)) * railH}px)`;
  if (ocean) ocean.set({ depth: d, scroll: y, hero: y / vh });
  if (waterAt) document.body.style.setProperty('--water', '#' + waterAt(d).bottom.getHexString());
  sea?.setDepth(d);
  $('.depth').classList.toggle('on-sand', d < -.5);
  $('.wa-fab').classList.toggle('is-on', y > vh * .6 && !document.body.classList.contains('is-loading'));
  header(y);
}

/* ---------------------------------------------------------------
   Cabeçalho, menu e link ativo
   --------------------------------------------------------------- */
const hdr = $('.hdr');
let lastY = 0;
function header(y) {
  hdr.classList.toggle('is-solid', y > 60);
  const menuOpen = $('#menu').classList.contains('is-open');
  if (!menuOpen) hdr.classList.toggle('is-hidden', y > lastY + 4 && y > innerHeight * .9);
  if (y < lastY - 4) hdr.classList.remove('is-hidden');
  lastY = y;
}
const navLinks = $$('.nav a');
const navIO = new IntersectionObserver(es => {
  for (const e of es) if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
['museu', 'acervo', 'tour', 'itapiruba', 'escolas', 'visite'].forEach(id => $('#' + id) && navIO.observe($('#' + id)));

const burger = $('.burger'), menu = $('#menu');
function openMenu() { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Fechar menu'); lenis?.stop(); }
function closeMenu() {
  if (!menu.classList.contains('is-open')) return;
  menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Abrir menu'); lenis?.start();
  setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 800);
}
burger.addEventListener('click', () => menu.classList.contains('is-open') ? closeMenu() : openMenu());

/* ---------------------------------------------------------------
   Cursor, bolhas e botões magnéticos
   --------------------------------------------------------------- */
const cursor = $('.cursor'), cursorLbl = $('.cursor span');
const fx = $('.fx'), fctx = fx.getContext('2d');
const bubbles = [];
let mx = -100, my = -100, cx = -100, cy = -100, lastBubble = 0;
function sizeFx() { const r = Math.min(devicePixelRatio || 1, 2); fx.width = innerWidth * r; fx.height = innerHeight * r; fctx.setTransform(r, 0, 0, r, 0, 0); }
sizeFx(); addEventListener('resize', sizeFx);
function spawn(x, y, n = 1, power = 1) {
  for (let i = 0; i < n; i++) bubbles.push({ x: x + (Math.random() - .5) * 10 * power, y: y + (Math.random() - .5) * 10 * power, r: 1.5 + Math.random() * 3.5 * power, vy: -(.4 + Math.random() * 1.2) * power, ph: Math.random() * 6, life: 0, max: 60 + Math.random() * 80 });
}
if (!coarse && !reduced) {
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    ocean?.mouse(mx, my);
    const now = performance.now();
    if (now - lastBubble > 70 && !$('.sheet.is-open')) { spawn(mx, my, 1, .7); lastBubble = now; }
  }, { passive: true });
  addEventListener('pointerdown', e => { if (!e.target.closest('.sheet__stage')) spawn(e.clientX, e.clientY, 14, 1.4); });
  document.addEventListener('pointerover', e => {
    const t = e.target;
    cursor.classList.toggle('is-view', !!t.closest('.card'));
    cursor.classList.toggle('is-drag', !!t.closest('.sheet__stage canvas'));
    cursor.classList.toggle('is-link', !t.closest('.card') && !!t.closest('a, button, summary, label, select, input, textarea, .hot'));
    cursorLbl.textContent = t.closest('.sheet__stage canvas') ? 'girar' : 'ver';
  });
  document.addEventListener('pointerleave', () => { mx = my = -100; });
  $$('[data-magnet]').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .6, ease: 'power3.out' });
    });
    el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
  });
} else cursor.remove();

function fxLoop() {
  requestAnimationFrame(fxLoop);
  cx += (mx - cx) * .22; cy += (my - cy) * .22;
  if (cursor.isConnected) cursor.style.transform = `translate(${cx}px, ${cy}px)`;
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]; b.life++;
    b.y += b.vy; b.vy -= .015; b.x += Math.sin(b.life * .08 + b.ph) * .5;
    const a = Math.min(1, b.life / 8) * (1 - b.life / b.max);
    if (a <= 0 || b.life > b.max) { bubbles.splice(i, 1); continue; }
    fctx.beginPath(); fctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    fctx.strokeStyle = `rgba(234,245,242,${a * .65})`; fctx.lineWidth = 1; fctx.stroke();
    fctx.beginPath(); fctx.arc(b.x - b.r * .35, b.y - b.r * .35, b.r * .25, 0, Math.PI * 2);
    fctx.fillStyle = `rgba(255,255,255,${a * .8})`; fctx.fill();
  }
}
fxLoop();

/* ---------------------------------------------------------------
   Números que contam
   --------------------------------------------------------------- */
const countIO = new IntersectionObserver(es => {
  for (const e of es) {
    if (!e.isIntersecting) continue;
    const el = e.target, to = +el.dataset.countup, o = { v: 0 };
    countIO.unobserve(el);
    gsap.to(o, { v: to, duration: reduced || shot ? 0 : 2.2, ease: 'expo.out', onUpdate: () => { el.textContent = nf.format(Math.round(o.v)); } });
  }
}, { threshold: .6 });
$$('[data-countup]').forEach(el => countIO.observe(el));

/* ---------------------------------------------------------------
   Como nasce uma concha: a espiral cresce com a rolagem
   --------------------------------------------------------------- */
function buildGrowth() {
  const svg = $('[data-growsvg]'); if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2, b = Math.log(3) / TAU, R = 100, turns = 3.6;
  const r = th => R * Math.exp(b * th), pt = th => [r(th) * Math.cos(th), -r(th) * Math.sin(th)];
  let d = '';
  for (let th = -turns * TAU; th <= 0; th += .03) { const [x, y] = pt(th); d += (d ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2); }
  let html = `<line class="ax" x1="-108" y1="0" x2="108" y2="0"/><line class="ax" x1="0" y1="-108" x2="0" y2="108"/>`;
  for (let k = 0; k < 3; k++) html += `<circle class="gl" r="${(R / 3 ** k).toFixed(2)}"/>`;
  const septa = [];
  for (let th = -.25 * TAU; th - TAU > -turns * TAU + .1; th -= TAU / 12) {
    const [ax, ay] = pt(th - TAU), [ox, oy] = pt(th), rm = (r(th - TAU) + r(th)) / 2, tc = th - .4;
    septa.push({ th, d: `M${ax.toFixed(2)} ${ay.toFixed(2)}Q${(rm * Math.cos(tc)).toFixed(2)} ${(-rm * Math.sin(tc)).toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)}` });
  }
  html += septa.map(s => `<path class="sept" d="${s.d}" data-th="${s.th}"/>`).join('');
  html += `<path class="sp" d="${d}"/><circle r="3.2" fill="#6FF2DC" data-tip/><text x="${R * .5}" y="-${R * .82}" fill="rgba(169,200,204,.8)" font-size="6" font-family="Geist Mono, monospace" letter-spacing=".6">×3 A CADA VOLTA</text>`;
  svg.innerHTML = html;
  const sp = $('.sp', svg), L = sp.getTotalLength(), tip = $('[data-tip]', svg), sEls = $$('.sept', svg);
  sp.style.strokeDasharray = L; sp.style.strokeDashoffset = L;
  const turnEl = $('[data-turn]'), scaleEl = $('[data-scale]');
  const steps = $$('.step'), dots = $$('.step-dots i');
  let cur = -1;
  const showStep = i => {
    if (i === cur) return; cur = i;
    steps.forEach((s, k) => gsap.to(s, { autoAlpha: k === i ? 1 : 0, y: k === i ? 0 : (k < i ? -24 : 24), duration: .6, ease: 'power3.out', overwrite: true }));
    dots.forEach((dt, k) => dt.classList.toggle('is-on', k <= i));
  };
  const set = p => {
    sp.style.strokeDashoffset = L * (1 - p);
    const P = sp.getPointAtLength(Math.max(.01, L * p)); tip.setAttribute('cx', P.x); tip.setAttribute('cy', P.y);
    const thNow = -turns * TAU + p * turns * TAU;
    sEls.forEach(s => { s.style.opacity = +s.dataset.th - TAU < thNow - .2 && +s.dataset.th < thNow ? .8 : 0; });
    turnEl.textContent = (p * turns).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    scaleEl.textContent = 'Tamanho: ' + nf.format(Math.round(Math.exp(b * p * turns * TAU))) + '×';
    showStep(Math.min(steps.length - 1, Math.floor(p * steps.length * .999)));
  };
  if (reduced) { $('.grow').classList.add('no-pin'); set(1); steps.forEach(s => gsap.set(s, { autoAlpha: 1, y: 0 })); return; }
  set(0);
  ScrollTrigger.create({ trigger: '.grow__pin', start: 'top top', end: () => '+=' + innerHeight * (isNarrow() ? 2.2 : 2.6), pin: true, scrub: .6, onUpdate: s => set(s.progress) });
}

/* ---------------------------------------------------------------
   Anatomia
   --------------------------------------------------------------- */
function anatomy() {
  const items = $$('[data-part]');
  const on = part => items.forEach(el => el.classList.toggle('is-on', el.dataset.part === part));
  items.forEach(el => {
    el.addEventListener('pointerenter', () => on(el.dataset.part));
    el.addEventListener('focus', () => on(el.dataset.part));
    el.addEventListener('click', () => on(el.dataset.part));
  });
  $('.anat').addEventListener('pointerleave', () => on(null));
}

/* ---------------------------------------------------------------
   Acervo: cards + filtros
   --------------------------------------------------------------- */
const ARROW = '<svg aria-hidden="true"><use href="#i-arrow"/></svg>';
function tagsHTML(s) {
  return (s.tags.includes('brasil') ? '<span class="tag tag--br">Brasil</span>' : '') + (s.tags.includes('gigante') ? '<span class="tag tag--g">Gigante</span>' : '');
}
function cards() {
  const box = $('[data-cards]');
  box.innerHTML = SPECIES.map((s, i) => `
    <button class="card rv" type="button" data-id="${s.id}" data-g="${s.grupo}" data-t="${s.tags.join(' ')}" style="--d:${(i % 3) * .07}s;--bd:${-i * .7}s" aria-label="${s.nome}, ${s.sci}. Abrir ficha">
      <span class="card__top mono"><span>Nº ${s.n}</span><span class="card__tags">${tagsHTML(s)}<span class="tag">${GROUPS[s.grupo]}</span></span></span>
      <span class="card__img"><img src="assets/conchas/${s.id}.webp" alt="" loading="lazy"></span>
      <span>
        <span class="card__name" style="display:block">${s.nome}</span>
        <span class="card__sci sci" style="display:block">${s.sci}</span>
        <span class="card__meta"><span>${s.onde}</span><span class="card__go">Ficha ${ARROW}</span></span>
      </span>
    </button>`).join('');
  $$('.card', box).forEach(c => c.addEventListener('click', e => openSheet(c.dataset.id, e)));
  $$('[data-filter]').forEach(ch => ch.addEventListener('click', () => {
    const f = ch.dataset.filter;
    $$('[data-filter]').forEach(o => o.setAttribute('aria-pressed', String(o === ch)));
    $$('.card', box).forEach(c => {
      const show = f === 'all' || c.dataset.g === f || c.dataset.t.split(' ').includes(f);
      if (show && c.classList.contains('is-hidden')) { c.classList.remove('is-hidden'); gsap.fromTo(c, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .6, ease: 'power3.out', clearProps: 'transform,opacity' }); }
      else if (!show) c.classList.add('is-hidden');
      c.classList.add('is-in');
    });
    ScrollTrigger.refresh();
  }));
}

/* ---------------------------------------------------------------
   Ficha da espécie (modal com 3D)
   --------------------------------------------------------------- */
const sheet = $('[data-sheet]');
let viewer = null, sheetIdx = 0, lastFocus = null;
async function openSheet(id, ev) {
  const i = SPECIES.findIndex(s => s.id === id); if (i < 0) return;
  sheetIdx = i; lastFocus = document.activeElement;
  fillSheet(SPECIES[i]);
  const x = ev?.clientX ?? innerWidth / 2, y = ev?.clientY ?? innerHeight / 2;
  const box = $('.sheet__box', sheet);
  sheet.hidden = false;
  const r = box.getBoundingClientRect();
  box.style.setProperty('--ox', ((x - r.left) / r.width * 100).toFixed(1) + '%');
  box.style.setProperty('--oy', ((y - r.top) / r.height * 100).toFixed(1) + '%');
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  lenis?.stop(); document.documentElement.style.overflow = 'hidden'; document.body.classList.add('sheet-open');
  history.replaceState(null, '', '#concha-' + id);
  setTimeout(() => $('.sheet__close', sheet).focus({ preventScroll: true }), 50);
  try {
    if (!viewer) viewer = (await import('./viewer.js')).createViewer($('[data-stage]'));
    viewer.show(id); viewer.start();
  } catch (err) { console.warn(err); }
}
function fillSheet(s) {
  const f = k => $(`[data-f="${k}"]`, sheet);
  f('n').textContent = 'Nº ' + s.n + ' · ' + GROUPS[s.grupo];
  f('tags').innerHTML = tagsHTML(s) + `<span class="tag">${s.classe}</span>`;
  f('nome').textContent = s.nome; f('sci').textContent = s.sci; f('autor').textContent = s.autor;
  f('resumo').textContent = s.resumo; f('grupo').textContent = GROUPS[s.grupo]; f('familia').textContent = s.familia;
  f('onde').textContent = s.onde; f('tamanho').textContent = s.tamanho; f('prof').textContent = s.prof;
  f('texto').textContent = s.texto; f('fato').textContent = s.fato;
  $('.sheet__info', sheet).scrollTop = 0;
}
function closeSheet() {
  if (!sheet.classList.contains('is-open')) return;
  sheet.classList.remove('is-open');
  lenis?.start(); document.documentElement.style.overflow = ''; document.body.classList.remove('sheet-open');
  history.replaceState(null, '', '#acervo');
  setTimeout(() => { if (!sheet.classList.contains('is-open')) { sheet.hidden = true; viewer?.stop(); } }, 900);
  lastFocus?.focus?.({ preventScroll: true });
}
function stepSheet(dir) {
  sheetIdx = (sheetIdx + dir + SPECIES.length) % SPECIES.length;
  const s = SPECIES[sheetIdx];
  gsap.fromTo('.sheet__info > *', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .03, ease: 'power3.out' });
  fillSheet(s); viewer?.show(s.id);
  history.replaceState(null, '', '#concha-' + s.id);
}
$$('[data-close]', sheet).forEach(b => b.addEventListener('click', closeSheet));
$$('[data-nav]', sheet).forEach(b => b.addEventListener('click', () => stepSheet(+b.dataset.nav)));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSheet(); closeMenu(); }
  if (!sheet.classList.contains('is-open')) return;
  if (e.key === 'ArrowRight') stepSheet(1);
  if (e.key === 'ArrowLeft') stepSheet(-1);
  if (e.key === 'Tab') { // mantém o foco dentro da ficha
    const f = $$('button, a[href], [tabindex]:not([tabindex="-1"])', sheet).filter(x => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});

/* ---------------------------------------------------------------
   Curiosidades: trilho horizontal
   --------------------------------------------------------------- */
function tales() {
  const track = $('[data-track]'), bar = $('[data-talesbar]');
  if (reduced || isNarrow()) { $('.tales').classList.add('is-free'); return; }
  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.tales__pin', start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: .8, invalidateOnRefresh: true, onUpdate: s => { bar.style.transform = `scaleX(${s.progress})`; } },
  });
}

/* ---------------------------------------------------------------
   Gigantes: a régua dá zoom-out do cauri à tridacna
   --------------------------------------------------------------- */
const GIANTS = [
  { id: 'moneta', a: 890 / 412 }, { id: 'nautilus', a: 882 / 669 }, { id: 'argonauta', a: 888 / 563 },
  { id: 'goliath', a: 784 / 842 }, { id: 'syrinx', a: 375 / 868 }, { id: 'tridacna', a: 880 / 485 },
  { id: 'pessoa', a: 60 / 170, cm: 170, nome: 'Você', tamanho: '1,70 m' },
];
function fmtCm(cm) { return cm >= 100 ? nf.format(cm / 100) + ' m' : nf.format(cm) + ' cm'; }
function giants() {
  const row = $('[data-ruler-row]'), ruler = $('[data-ruler]'), pxEl = $('[data-pxcm]');
  const items = GIANTS.map(g => {
    const s = SPECIES.find(x => x.id === g.id) || {};
    const cm = g.cm || s.cm, w = g.a >= 1 ? cm : cm * g.a, h = g.a >= 1 ? cm / g.a : cm;
    return { ...g, cm, w, h, nome: g.nome || s.nome, tam: g.tamanho || fmtCm(cm) };
  });
  row.innerHTML = items.map(g => `
    <div class="giant" style="--w:${g.w.toFixed(2)};--h:${g.h.toFixed(2)}">
      <div class="giant__img">${g.id === 'pessoa'
        ? `<svg class="diver" viewBox="0 0 60 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="30" cy="11" r="10" fill="none" stroke="#6FF2DC" stroke-width="1.4"/><path d="M30 22c8 0 14 3 16 8l6 32c1 4-2 6-4 2l-5-24-1 38-1 34-1 52c0 4-6 4-6 0l-2-52-2-20-2 20-2 52c0 4-6 4-6 0l-1-52-1-34-1-38-5 24c-2 4-5 2-4-2l6-32c2-5 8-8 16-8z" fill="rgba(111,242,220,.06)" stroke="#6FF2DC" stroke-width="1.4"/></svg>`
        : `<img src="assets/conchas/${g.id}.webp" alt="${g.nome}" loading="lazy">`}</div>
      <div class="giant__lbl"><b>${g.nome}</b><span>${g.tam}</span></div>
    </div>`).join('');
  const n = items.length, MINW = 112;
  const els = $$('.giant', row);
  const gutter = () => parseFloat(getComputedStyle(row).paddingLeft) || 24;
  const gapOf = px => 3 * px + 18;
  const totalW = px => items.reduce((a, g) => a + Math.max(MINW, g.w * px), 0) + gapOf(px) * (n - 1) + gutter() * 2;
  const fit = () => {
    const byH = (ruler.parentElement.clientHeight - 420) / 170;
    let lo = .3, hi = Math.max(.31, byH);
    if (totalW(hi) <= innerWidth) return hi;
    for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (totalW(mid) <= innerWidth) lo = mid; else hi = mid; }
    return isNarrow() ? Math.max(lo, 1.1) : lo;
  };
  const startPx = () => Math.min(40, (innerHeight * .3) / 20);
  const apply = p => {
    const e = 1 - Math.pow(1 - p, 2.2);
    const end = fit(), px = startPx() + (end - startPx()) * e;
    ruler.style.setProperty('--pxcm', px.toFixed(3) + 'px');
    pxEl.textContent = px.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    // se a régua não couber (celular), ela desliza até a tridacna e a pessoa
    const tx = Math.min(0, innerWidth - totalW(px)) * e;
    row.style.transform = `translateX(${tx}px)`;
  };
  if (reduced) { apply(1); addEventListener('resize', () => apply(1)); return; }
  apply(0);
  ScrollTrigger.create({ trigger: '.giants__pin', start: 'top top', end: () => '+=' + innerHeight * 2.2, pin: true, scrub: .7, onUpdate: s => apply(s.progress), onRefresh: s => apply(s.progress) });
}

/* ---------------------------------------------------------------
   Fundador: globo com a rota
   --------------------------------------------------------------- */
function founder() {
  const svg = $('[data-route]'); if (!svg) return;
  const pos = drawGlobe(svg, { R: 320, cx: 600, cy: 350 });
  const [l1, l2] = $$('.route__lbl');
  l1.style.cssText = `left:${(pos.from[0] * 100 + 2).toFixed(1)}%;top:${(pos.from[1] * 100 - 4).toFixed(1)}%`;
  l2.style.cssText = `left:${(pos.to[0] * 100 + 2.5).toFixed(1)}%;top:${(pos.to[1] * 100 - 4).toFixed(1)}%`;
  const path = $('[data-routepath]', svg);
  path.style.strokeDasharray = '1'; path.style.strokeDashoffset = '1';
  if (reduced) { path.style.strokeDashoffset = '0'; return; }
  ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => gsap.to(path, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', onComplete: () => { path.style.strokeDasharray = '.004 .008'; } }) });
}

/* ---------------------------------------------------------------
   Horário de funcionamento ao vivo (fuso de Brasília)
   --------------------------------------------------------------- */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}
function holidays(y) {
  const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map(md => `${y}-${md}`);
  const E = easter(y), day = 864e5, iso = t => new Date(t).toISOString().slice(0, 10);
  return new Set([...fixed, iso(E - 48 * day), iso(E - 47 * day), iso(E - 2 * day), iso(E + 60 * day)]);
}
function nowBR() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute };
}
// alta temporada: verão (dezembro a fevereiro, mais o Carnaval)
function schedule(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d)), iso = date.toISOString().slice(0, 10), wd = date.getUTCDay();
  const hol = holidays(y).has(iso);
  const E = easter(y), carnaval = Math.abs(date - (E - 47.5 * 864e5)) <= 2.5 * 864e5;
  const alta = m === 12 || m <= 2 || carnaval;
  if (alta) return { alta, open: wd !== 1 || hol, from: 15 * 60, to: 20 * 60 };
  return { alta, open: wd === 0 || wd === 6 || hol, from: 14 * 60, to: 18 * 60 };
}
const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function status() {
  const n = nowBR(), today = schedule(n.y, n.m, n.d);
  let html, open = false;
  const h = t => (t / 60) + 'h';
  if (today.open && n.min >= today.from && n.min < today.to) { open = true; html = `<b>Aberto agora</b> · até as ${h(today.to)}`; }
  else if (today.open && n.min < today.from) html = `<b>Fechado agora</b> · abre hoje às ${h(today.from)}`;
  else {
    html = '<b>Fechado agora</b>';
    for (let k = 1; k <= 14; k++) {
      const dt = new Date(Date.UTC(n.y, n.m - 1, n.d + k)), s = schedule(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      if (s.open) { html += ` · abre ${k === 1 ? 'amanhã' : WD[dt.getUTCDay()]} às ${h(s.from)}`; break; }
    }
  }
  $$('[data-status]').forEach(el => { el.classList.toggle('is-open', open); el.querySelector('span').innerHTML = html; });
  $$('[data-season]').forEach(el => el.classList.toggle('is-now', (el.dataset.season === 'alta') === today.alta));
}

/* ---------------------------------------------------------------
   Calculadora de ingressos
   --------------------------------------------------------------- */
// Preços: adulto R$ 5,00; crianças e idosos R$ 2,50; família R$ 10,00 (um ingresso
// para até 5 pessoas da mesma família). O ingresso família só entra quando a pessoa
// diz que é uma família e quando sai mais barato; ele cobre primeiro os adultos.
const PRICE = { a: 5, c: 2.5, fam: 10, famMax: 5 };
export function quoteTickets(a, c, family) {
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const plain = a * PRICE.a + c * PRICE.c;
  const individual = (na, nc) => [
    ...(na ? [[`${plural(na, 'adulto', 'adultos')} × ${brl.format(PRICE.a)}`, na * PRICE.a]] : []),
    ...(nc ? [[`${plural(nc, 'criança/idoso', 'crianças/idosos')} × ${brl.format(PRICE.c)}`, nc * PRICE.c]] : []),
  ];
  if (a + c === 0) return { lines: [], total: 0, tip: 'Quantas pessoas vêm?' };
  const fa = Math.min(a, PRICE.famMax), fc = Math.min(c, PRICE.famMax - fa);
  const withFamily = PRICE.fam + (a - fa) * PRICE.a + (c - fc) * PRICE.c;
  const saves = plain - withFamily;
  if (family && saves > 0) {
    const who = [fa && plural(fa, 'adulto', 'adultos'), fc && plural(fc, 'criança/idoso', 'crianças/idosos')].filter(Boolean).join(' + ');
    return {
      lines: [[`1 ingresso família (${who})`, PRICE.fam], ...individual(a - fa, c - fc)],
      total: withFamily,
      tip: `Com o ingresso família vocês economizam ${brl.format(saves)}.`,
    };
  }
  const tip = family ? (saves === 0 ? 'Para esse grupo, o ingresso família custa o mesmo que os individuais.' : 'Para esse grupo, os ingressos individuais saem mais em conta.')
    : saves > 0 ? `Se vocês são uma família, marquem a opção acima: fica ${brl.format(withFamily)}.` : '';
  return { lines: individual(a, c), total: plain, tip };
}

function calc() {
  // tudo dentro do bloco da calculadora (há outros [data-*] parecidos na página)
  const box = $('[data-calc]'); if (!box) return;
  const st = { a: 2, c: 2 };
  const fam = $('[data-fam]', box);
  const render = () => {
    $('[data-out="a"]', box).textContent = st.a; $('[data-out="c"]', box).textContent = st.c;
    const q = quoteTickets(st.a, st.c, fam.checked);
    $('[data-lines]', box).innerHTML = q.lines.map(([l, v]) => `<li><span>${l}</span><b class="tnum">${brl.format(v)}</b></li>`).join('');
    $('[data-calc-total]', box).textContent = brl.format(q.total);
    $('[data-calc-tip]', box).textContent = q.tip;
  };
  $$('[data-step]', box).forEach(b => b.addEventListener('click', () => {
    const [k, v] = b.dataset.step.split(':'); st[k] = Math.max(0, Math.min(30, st[k] + +v)); render();
  }));
  fam.addEventListener('change', render);
  render();
}

/* ---------------------------------------------------------------
   Aviso rápido (copiar endereço etc.)
   --------------------------------------------------------------- */
const toastEl = $('[data-toast]');
function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('is-on'), 3800); }

/* ---------------------------------------------------------------
   Tour 360° do Google Maps: só carrega quando a pessoa pede
   --------------------------------------------------------------- */
function tour() {
  const box = $('[data-tour]'); if (!box) return;
  const btn = $('[data-tour-load]', box);
  // onde não é possível incorporar outros sites, o botão vira link direto
  if (document.documentElement.dataset.noembed !== undefined) {
    btn.remove();
    $('.form__note', box).textContent = 'O tour abre no Google Maps, em uma nova aba.';
    return;
  }
  btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = box.dataset.embed; f.title = 'Tour 360° do Museu das Conchas no Google Maps';
    f.loading = 'lazy'; f.allow = 'fullscreen; accelerometer; gyroscope'; f.referrerPolicy = 'no-referrer-when-downgrade';
    box.appendChild(f); box.classList.add('is-live');
    const link = $('[data-tour-link]', box).cloneNode(true);
    link.className = 'btn btn--sm'; link.style.cssText = 'position:absolute;right:14px;bottom:14px;z-index:3';
    box.appendChild(link);
  });
}

/* ---------------------------------------------------------------
   Perguntas frequentes com abertura suave
   --------------------------------------------------------------- */
function faq() {
  $$('[data-faq] details').forEach(d => {
    const s = $('summary', d), body = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduced) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => { d.open = false; ScrollTrigger.refresh(); };
      } else {
        d.open = true; const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => ScrollTrigger.refresh();
      }
    });
  });
}

/* ---------------------------------------------------------------
   Superfície: ondas desenhadas ao vivo
   --------------------------------------------------------------- */
function waves() {
  const p1 = $('[data-wave]'), p2 = $('[data-wave2]'); if (!p1) return;
  let vis = false;
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; }).observe($('.surface'));
  const wave = (t, base, amp, k, sp) => {
    let d = `M0 ${base}`;
    for (let x = 0; x <= 1440; x += 24) d += ` L${x} ${(base + Math.sin(x * k + t * sp) * amp + Math.sin(x * k * 2.3 - t * sp * 1.3) * amp * .35).toFixed(1)}`;
    return d + ' V140 H0Z';
  };
  const tick = t => { requestAnimationFrame(tick); if (!vis) return; t /= 1000; p1.setAttribute('d', wave(t, 82, 10, .006, 1.1)); p2.setAttribute('d', wave(t + 3, 70, 12, .005, -.9)); };
  if (reduced) p1.setAttribute('d', wave(0, 82, 10, .006, 1)); else requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------
   Pequenos: copiar endereço, voltar ao fundo, som, ano
   --------------------------------------------------------------- */
$$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); toast('Endereço copiado.'); } catch { toast(b.dataset.copy); }
}));
$('[data-totop]').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect(); spawn(r.left + r.width / 2, r.top, 40, 2);
  scrollToTarget(0, { duration: 4.5, easing: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 });
});
$('[data-year]').textContent = new Date().getFullYear();
$('[data-sound]').addEventListener('click', async e => {
  const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', String(on));
  if (!sea) sea = (await import('./audio.js')).createSea();
  sea.setDepth(depthNow);
  on ? sea.play() : sea.pause();
});

/* ---------------------------------------------------------------
   Início
   --------------------------------------------------------------- */
cards(); anatomy(); buildGrowth(); tales(); giants(); founder(); calc(); tour(); faq(); waves();
status(); setInterval(status, 60e3);
measure(); onScroll();
ScrollTrigger.addEventListener('refresh', () => { measure(); onScroll(); });
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', () => { measure(); onScroll(); });
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts?.ready.then(() => ScrollTrigger.refresh());
oceanReady.then(onScroll);
intro();
