// Gera os SVGs da marca do Museu das Conchas a partir da geometria.
//
// O símbolo é o múrex, a concha que o museu já usa como marca: silhueta cheia,
// espira em degraus, abertura vazada e espinhos grossos curvados para cima.
// O texto é convertido em contornos com opentype.js, então os SVGs não dependem
// de fontes instaladas.
//
// Uso: cd tools && npm install && npm run logo
// Além dos SVGs, atualiza o símbolo embutido em index.html e assets/icones.svg.
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const out = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/logo');
mkdirSync(out, { recursive: true });

// ---------- fontes (instâncias estáticas do Google Fonts) ----------
const FONTS = {
  display: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@144,500,100',
  italic: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@1,144,400,100',
  mono: 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500',
};
async function font(key) {
  const f = resolve(tmpdir(), `museu-${key}.ttf`);
  if (!existsSync(f)) {
    const css = await (await fetch(FONTS[key], { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
    const url = css.match(/url\((https:[^)]+\.ttf)\)/)[1];
    writeFileSync(f, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  return opentype.loadSync(f);
}
const F = { display: await font('display'), italic: await font('italic'), mono: await font('mono') };

// ---------- cores ----------
const C = { abismo: '#04121D', crepusculo: '#0A3550', espuma: '#EAF5F2', nacar: '#F4E9DC', areia: '#E8CFA0', bio: '#6FF2DC', fossa: '#02080E' };

// ---------- símbolo: o múrex ----------
// Silhueta cheia, espelhada em torno do eixo (Catmull-Rom): espira em degraus,
// corpo largo, canal curto e espinhos grossos que curvam para cima. Suturas,
// abertura e um cordão são vazados (fill-rule evenodd), então funciona em uma cor só.
const TAU = Math.PI * 2;
const f2 = n => +n.toFixed(2);
const HALF = [[0, 2], [3.6, 7.6], [3, 9.2], [7, 14], [6.2, 16], [11, 21.2], [9.8, 23.6], [18.5, 29], [24, 38.5], [24, 47], [20, 55.5], [12, 62.5], [7.4, 67], [6.2, 75], [4.6, 83], [2.4, 89.5], [0, 92]];
const SUTURES = [[9.6, .9], [16.4, 1.3], [24, 1.7]];          // [altura, curvatura]
const APERTURE = { cx: 6.8, cy: 43, rx: 7, ry: 10.5, bot: 76 };
const CORDS = [[33, 56, 4.4]];                                  // [de, até, recuo]
const SPINES = {                                                // [altura, comprimento, ângulo para cima, base]
  full: [[28, 10, 48, 5], [37, 15.5, 28, 6], [47.5, 14.5, 10, 5.6], [57, 9, -2, 4.4], [69, 6.5, 8, 3.2]],
  simple: [[30, 11, 40, 6.5], [44, 15, 14, 7], [60, 8, 0, 5]],
};
function cr(pts, steps = 10) { // Catmull-Rom aberta
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c, d) => .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts.at(-1));
  return out;
}
const halfCurve = cr(HALF, 14);
const widthAt = y => {
  for (let i = 0; i < halfCurve.length - 1; i++) {
    const [x0, y0] = halfCurve[i], [x1, y1] = halfCurve[i + 1];
    if ((y - y0) * (y - y1) <= 0 && y1 !== y0) return x0 + (x1 - x0) * (y - y0) / (y1 - y0);
  }
  return 0;
};
function symbolPaths({ spines = 'full', details = true } = {}) {
  const body = [...halfCurve, ...halfCurve.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const holes = [];
  if (details) {
    if (details !== 'abertura') for (const [y, bow] of SUTURES) { // suturas: crescentes finos de um lado ao outro da espira
      const xa = -widthAt(y + .6) + 1.4, xb = widthAt(y - .6) - 1.4, m = [(xa + xb) / 2, y + bow], top = [], bot = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16, x = (1 - t) ** 2 * xa + 2 * (1 - t) * t * m[0] + t * t * xb, yy = (1 - t) ** 2 * (y + .6) + 2 * (1 - t) * t * m[1] + t * t * (y - .6), k = Math.sin(Math.PI * t) * .6;
        top.push([x, yy - k]); bot.unshift([x, yy + k]);
      }
      holes.push([...top, ...bot]);
    }
    { // abertura: oval que afina para dentro do canal, lábio externo mais cheio
      const { cx, cy, rx, ry, bot } = APERTURE, top = cy - ry, right = [], left = [];
      for (let i = 0; i <= 60; i++) {
        const y = top + (bot - top) * i / 60;
        let hw;
        if (y <= cy + ry * .55) { const k = (y - cy) / ry; hw = rx * Math.sqrt(Math.max(0, 1 - k * k)); }
        else { const y0 = cy + ry * .55, h0 = rx * Math.sqrt(1 - .55 * .55), t = (y - y0) / (bot - y0); hw = h0 * Math.pow(1 - t, 1.3) + .15 * (1 - t); }
        const t = (y - top) / (bot - top), x = cx + (1.2 - cx) * Math.pow(t, 1.6);
        right.push([x + hw * 1.12, y]); left.unshift([x - hw * .82, y]);
      }
      holes.push([...right, ...left]);
    }
    if (details !== 'abertura') for (const [y0, y1, inset] of CORDS) { // cordão espiral do lado esquerdo
      const a = [], b = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, y = y0 + (y1 - y0) * t, x = -widthAt(y) + inset + Math.sin(Math.PI * t) * 1.2, th = .55 * Math.sin(Math.PI * t) + .05;
        a.push([x - th, y]); b.unshift([x + th, y]);
      }
      holes.push([...a, ...b]);
    }
  }
  const thorns = [];
  for (const [y, L, up, bw] of SPINES[spines]) for (const s of [1, -1]) {
    const y1 = y - bw / 2, y2 = y + bw / 2, b1 = [(widthAt(y1) - .4) * s, y1], b2 = [(widthAt(y2) - .4) * s, y2];
    const e = .6; let nx = 2 * e, ny = -(widthAt(y + e) - widthAt(y - e)); const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    const rot = a => { const r = a * Math.PI / 180; return [nx * Math.cos(r) + ny * Math.sin(r), -nx * Math.sin(r) + ny * Math.cos(r)]; };
    const [dx, dy] = rot(up), [tx, ty] = rot(up + 22);
    const tip = [widthAt(y) * s + s * tx * L, y + ty * L];
    thorns.push([b1, [b1[0] + s * dx * L * .55, b1[1] + dy * L * .55 - .6], tip, [b2[0] + s * dx * L * .5, b2[1] + dy * L * .5 + .4], b2]);
  }
  return { body, holes, thorns };
}
// encaixa a geometria numa caixa e devolve strings de path
function fit(geo, box, pad = 0) {
  const all = [...geo.body, ...geo.thorns.flat()];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (box - 2 * pad) / Math.max(x1 - x0, y1 - y0);
  const ox = pad + ((box - 2 * pad) - (x1 - x0) * s) / 2, oy = pad + ((box - 2 * pad) - (y1 - y0) * s) / 2;
  const T = p => `${f2(ox + (p[0] - x0) * s)} ${f2(oy + (p[1] - y0) * s)}`;
  const poly = a => 'M' + a.map(T).join('L') + 'Z';
  return {
    body: poly(geo.body) + geo.holes.map(poly).join(''),
    thorns: geo.thorns.map(([b1, c1, t, c2, b2]) => `M${T(b1)}Q${T(c1)} ${T(t)}Q${T(c2)} ${T(b2)}Z`).join(''),
  };
}
const markG = (g, fill, extra = '') => `<g${extra} fill="${fill}"><path fill-rule="evenodd" d="${g.body}"/><path d="${g.thorns}"/></g>`;
function symbolSVG({ size = 100, fill = C.nacar, bg = null, radius = 22, pad = 5, spines = 'full', details = true } = {}) {
  const g = fit(symbolPaths({ spines, details }), size, pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    (bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : '') + markG(g, fill) + '</svg>';
}

// diagrama de construção para o guia da marca
function construction() {
  const S = 400, pad = 40, g = fit(symbolPaths(), S, pad);
  let grid = '';
  for (let i = 0; i <= 10; i++) { const v = f2(pad + (S - 2 * pad) * i / 10); grid += `M${v} ${pad}V${S - pad}M${pad} ${v}H${S - pad}`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    `<path d="${grid}" stroke="rgba(234,245,242,.08)" stroke-width="1" fill="none"/>` +
    markG(g, 'rgba(244,233,220,.92)') +
    `<path d="M${S / 2} 20V${S - 20}" stroke="#6FF2DC" stroke-width="1" stroke-dasharray="4 5" opacity=".8"/>` +
    `<g font-family="Geist Mono, monospace" font-size="11" fill="#6FF2DC" letter-spacing="1"><text x="${S / 2 + 8}" y="32">EIXO</text><text x="26" y="${S - 26}">GRADE 10 × 10</text><text x="${S - 26}" y="${S - 26}" text-anchor="end">ESPINHOS CURVAM PARA CIMA</text></g></svg>`;
}
// ---------- texto em contornos ----------
function textPath(font, str, x, y, size, tracking = 0) {
  let d = '', cx = x;
  const glyphs = font.stringToGlyphs(str);
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += g.advanceWidth / font.unitsPerEm * size + tracking;
    if (i < glyphs.length - 1) cx += font.getKerningValue(g, glyphs[i + 1]) / font.unitsPerEm * size;
  });
  return { d, width: cx - x - tracking };
}
function runs(parts, x, y) { // [{font,text,size,tracking}] em sequência
  let d = '', cx = x;
  for (const p of parts) { const t = textPath(p.font, p.text, cx, y, p.size, p.tracking || 0); d += t.d; cx += t.width + (p.gap || 0); }
  return { d, width: cx - x };
}

// ---------- assinatura horizontal ----------
function horizontal({ ink = C.espuma, mark = C.nacar, sub = C.bio, bg = null } = {}) {
  const H = 150, ms = 150;
  const g = fit(symbolPaths(), ms, 4);
  const word = runs([
    { font: F.display, text: 'Museu ', size: 46 },
    { font: F.italic, text: 'das', size: 46, gap: 11 },
    { font: F.display, text: 'Conchas', size: 46 },
  ], ms + 14, 80);
  const line = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', ms + 16, 114, 13.5, 3.4);
  const W = Math.ceil(ms + 14 + Math.max(word.width, line.width) + 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
    markG(g, mark, ` transform="translate(0 ${(H - ms) / 2})"`) +
    `<path fill="${ink}" d="${word.d}"/><path fill="${sub}" d="${line.d}"/></svg>`;
}

// ---------- assinatura vertical ----------
function vertical({ ink = C.espuma, mark = C.nacar, sub = C.bio, bg = null } = {}) {
  const ms = 210;
  const w1 = runs([{ font: F.display, text: 'Museu ', size: 50 }, { font: F.italic, text: 'das', size: 50 }], 0, 0);
  const w2 = textPath(F.display, 'Conchas', 0, 0, 50);
  const l = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', 0, 0, 13, 3.2);
  const W = Math.ceil(Math.max(w1.width, w2.width, l.width, ms) + 40), H = 430;
  const cx = W / 2;
  const a = runs([{ font: F.display, text: 'Museu ', size: 50 }, { font: F.italic, text: 'das', size: 50 }], cx - w1.width / 2, ms + 82);
  const b2 = textPath(F.display, 'Conchas', cx - w2.width / 2, ms + 138, 50);
  const c = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', cx - l.width / 2, ms + 186, 13, 3.2);
  const g = fit(symbolPaths(), ms, 4);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
    markG(g, mark, ` transform="translate(${cx - ms / 2} 6)"`) +
    `<path fill="${ink}" d="${a.d}${b2.d}"/><path fill="${sub}" d="${c.d}"/></svg>`;
}

// ---------- selo circular ----------
function seal({ ink = C.nacar, ring = C.bio, bg = null } = {}) {
  const S = 400, cx = S / 2, R = 162, size = 21;
  const text = 'MUSEU DAS CONCHAS · ITAPIRUBÁ · MAIS DE 3.500 ESPÉCIES · ';
  const glyphs = F.mono.stringToGlyphs(text);
  const adv = glyphs.map(g => g.advanceWidth / F.mono.unitsPerEm * size);
  const total = adv.reduce((a, b) => a + b, 0);
  const track = (TAU * R - total) / glyphs.length;
  let d = '', s = 0;
  glyphs.forEach((g, i) => {
    const mid = s + adv[i] / 2, ang = mid / R - Math.PI / 2;
    const p = g.getPath(-adv[i] / 2, 0, size);
    p.commands.forEach(c => {
      // eixo x do glifo na tangente, "para cima" apontando para fora do círculo
      for (const [kx, ky] of [['x', 'y'], ['x1', 'y1'], ['x2', 'y2']]) if (c[kx] !== undefined) {
        const x = c[kx], y = c[ky], ca = Math.cos(ang), sa = Math.sin(ang);
        c[kx] = cx + R * ca - x * sa - y * ca;
        c[ky] = cx + R * sa + x * ca - y * sa;
      }
    });
    d += p.toPathData(2);
    s += adv[i] + track;
  });
  const g = fit(symbolPaths(), 230, 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    (bg ? `<circle cx="${cx}" cy="${cx}" r="${cx}" fill="${bg}"/>` : '') +
    `<circle cx="${cx}" cy="${cx}" r="${R + 22}" fill="none" stroke="${ring}" stroke-width="1.5" opacity=".7"/>` +
    `<circle cx="${cx}" cy="${cx}" r="${R - 26}" fill="none" stroke="${ring}" stroke-width="1.5" opacity=".7"/>` +
    `<path fill="${ink}" d="${d}"/>` +
    markG(g, ink, ` transform="translate(${cx - 115} ${cx - 115})"`) + '</svg>';
}

const files = {
  'simbolo.svg': symbolSVG(),
  'simbolo-mono.svg': symbolSVG({ fill: 'currentColor' }),
  'simbolo-escuro.svg': symbolSVG({ fill: C.crepusculo }),
  'favicon.svg': symbolSVG({ size: 64, bg: C.crepusculo, radius: 14, pad: 5, spines: 'simple', details: 'abertura' }),
  'icone-app.svg': symbolSVG({ size: 512, bg: C.crepusculo, radius: 112, pad: 70 }),
  'construcao.svg': construction(),
  'logo-horizontal.svg': horizontal(),
  'logo-horizontal-areia.svg': horizontal({ ink: C.abismo, mark: C.crepusculo, sub: '#0F6E78' }),
  'logo-vertical.svg': vertical(),
  'logo-vertical-areia.svg': vertical({ ink: C.abismo, mark: C.crepusculo, sub: '#0F6E78' }),
  'selo.svg': seal(),
  'selo-areia.svg': seal({ ink: C.abismo, ring: '#0F6E78' }),
};
for (const [n, s] of Object.entries(files)) writeFileSync(resolve(out, n), s + '\n');
// paths crus para embutir no HTML
writeFileSync(resolve(out, 'simbolo-paths.json'), JSON.stringify(fit(symbolPaths(), 100, 4)) + '\n');
// atualiza o símbolo embutido no site (sprite do index.html, pré-carregamento e assets/icones.svg)
const site = resolve(out, '../..'), idx = resolve(site, 'index.html');
if (existsSync(idx)) {
  const P = fit(symbolPaths(), 100, 4);
  let h = readFileSync(idx, 'utf8');
  h = h.replace(/<symbol id="mk" viewBox="0 0 100 100">[\s\S]*?<\/symbol>/, `<symbol id="mk" viewBox="0 0 100 100">${markG(P, 'currentColor')}</symbol>`);
  h = h.replace(/<svg class="loader__mark"[\s\S]*?<\/svg>/, `<svg class="loader__mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="#0A3550" stroke="#0A3550" stroke-width=".8" stroke-linejoin="round"><path fill-rule="evenodd" d="${P.body}"/><path d="${P.thorns}"/></g></svg>`);
  writeFileSync(idx, h);
  writeFileSync(resolve(site, 'assets/icones.svg'), `<svg xmlns="http://www.w3.org/2000/svg"><defs>${h.match(/<defs>([\s\S]*?)<\/defs>/)[1]}</defs></svg>\n`);
}
console.log('ok:', Object.keys(files).join(', '));
