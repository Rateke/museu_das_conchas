// Gera os SVGs da marca do Museu das Conchas a partir da geometria.
//
// O símbolo é o múrex, a concha que o museu já usa como marca: corpo em fuso,
// espira com suturas, canal longo e fileiras de espinhos curvados para cima.
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
// Corpo em fuso desenhado por meia-silhueta espelhada (Catmull-Rom), espira com
// suturas, abertura e fileiras de espinhos que nascem do contorno e curvam para cima.
const TAU = Math.PI * 2;
const f2 = n => +n.toFixed(2);
const HALF = [[0, 4], [2.4, 8.5], [5.2, 14], [8, 19.5], [10.6, 24.5], [14, 29.5], [16.4, 36.5], [16.2, 44.5], [13.4, 52.5], [8.6, 58.6], [5, 63], [3.6, 71], [2.6, 81], [1.3, 91], [0, 96]];
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
const halfCurve = cr(HALF, 12);
const widthAt = y => { // meia-largura do contorno na altura y
  for (let i = 0; i < halfCurve.length - 1; i++) {
    const [x0, y0] = halfCurve[i], [x1, y1] = halfCurve[i + 1];
    if (y >= y0 && y <= y1) return x0 + (x1 - x0) * ((y - y0) / ((y1 - y0) || 1));
  }
  return 0;
};
const SPINES = {
  full: [[21, 6, 42], [30, 12, 32], [37, 15.5, 24], [44, 16, 16], [51, 13, 11], [64, 8.5, 14], [74, 6.5, 12], [84, 5, 10]],
  simple: [[33, 14, 28], [45, 15, 16], [65, 9, 12], [79, 7, 10]],
};
function symbolPaths({ spines = 'full' } = {}) {
  const body = [...halfCurve, ...halfCurve.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  const sp = [];
  for (const [y, L, up] of SPINES[spines]) for (const side of [1, -1]) {
    const x = widthAt(y) * side, e = .6;
    const tx = widthAt(y + e) - widthAt(y - e), ty = 2 * e; // tangente (lado direito)
    let nx = ty, ny = -tx; const l = Math.hypot(nx, ny); nx /= l; ny /= l; // normal para fora
    const a = up * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const dx = nx * ca + ny * sa, dy = -nx * sa + ny * ca; // gira para cima
    const a2 = (up + 18) * Math.PI / 180, dx2 = nx * Math.cos(a2) + ny * Math.sin(a2), dy2 = -nx * Math.sin(a2) + ny * Math.cos(a2);
    const c = [x + side * dx * L * .55, y + dy * L * .55], t = [x + side * dx2 * L, y + dy2 * L];
    sp.push([[x, y], c, t]);
  }
  const det = [];
  for (const y of [9.5, 15, 20.5, 26]) { // suturas da espira
    const w = widthAt(y);
    det.push([[-w * .92, y + 1.2], [0, y + 2.6], [w * .92, y - 1]]);
  }
  det.push([[4.2, 31], [13.6, 44], [4.4, 58]]); // abertura
  return { body, spines: sp, details: det };
}
// encaixa a geometria numa caixa e devolve strings de path
function fit(geo, box, pad = 0) {
  const all = [...geo.body, ...geo.spines.flat(), ...geo.details.flat()];
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (box - 2 * pad) / Math.max(x1 - x0, y1 - y0);
  const ox = pad + ((box - 2 * pad) - (x1 - x0) * s) / 2, oy = pad + ((box - 2 * pad) - (y1 - y0) * s) / 2;
  const T = p => [f2(ox + (p[0] - x0) * s), f2(oy + (p[1] - y0) * s)];
  const body = 'M' + geo.body.map(T).map(p => p.join(' ')).join('L') + 'Z';
  const q = arr => arr.map(([a, c, o]) => `M${T(a).join(' ')}Q${T(c).join(' ')} ${T(o).join(' ')}`).join('');
  return { body, spines: q(geo.spines), details: q(geo.details) };
}
const markG = (g, sw, stroke, extra = '') => `<g${extra} fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="${g.body}"/><path d="${g.spines}" stroke-width="${f2(sw * .78)}"/><path d="${g.details}" stroke-width="${f2(sw * .6)}" opacity=".85"/></g>`;
function symbolSVG({ size = 100, stroke = C.nacar, sw = 3, bg = null, radius = 22, pad = 8, spines = 'full' } = {}) {
  const g = fit(symbolPaths({ spines }), size, pad);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    (bg ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` : '') + markG(g, sw, stroke) + '</svg>';
}

// diagrama de construção para o guia da marca
function construction() {
  const S = 400, pad = 40, g = fit(symbolPaths(), S, pad);
  let grid = '';
  for (let i = 0; i <= 10; i++) { const v = f2(pad + (S - 2 * pad) * i / 10); grid += `M${v} ${pad}V${S - pad}M${pad} ${v}H${S - pad}`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    `<path d="${grid}" stroke="rgba(234,245,242,.08)" stroke-width="1" fill="none"/>` +
    `<path d="M${S / 2} 20V${S - 20}" stroke="#6FF2DC" stroke-width="1" stroke-dasharray="4 5" opacity=".7"/>` +
    markG(g, 4, '#F4E9DC') +
    `<g font-family="Geist Mono, monospace" font-size="11" fill="#6FF2DC" letter-spacing="1"><text x="${S / 2 + 8}" y="32">EIXO</text><text x="${S - 26}" y="${S - 26}" text-anchor="end">ESPINHOS CURVAM PARA CIMA</text><text x="26" y="${S - 26}">GRADE 10 × 10</text></g></svg>`;
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
  const H = 120, ms = 104;
  const g = fit(symbolPaths(), ms, 6);
  const word = runs([
    { font: F.display, text: 'Museu ', size: 46 },
    { font: F.italic, text: 'das', size: 46, gap: 11 },
    { font: F.display, text: 'Conchas', size: 46 },
  ], ms + 26, 64);
  const line = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', ms + 28, 98, 13.5, 3.4);
  const W = Math.ceil(ms + 26 + Math.max(word.width, line.width) + 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
    markG(g, 3.2, mark, ` transform="translate(0 ${(H - ms) / 2})"`) +
    `<path fill="${ink}" d="${word.d}"/><path fill="${sub}" d="${line.d}"/></svg>`;
}

// ---------- assinatura vertical ----------
function vertical({ ink = C.espuma, mark = C.nacar, sub = C.bio, bg = null } = {}) {
  const ms = 150;
  const w1 = runs([{ font: F.display, text: 'Museu ', size: 50 }, { font: F.italic, text: 'das', size: 50 }], 0, 0);
  const w2 = textPath(F.display, 'Conchas', 0, 0, 50);
  const l = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', 0, 0, 13, 3.2);
  const W = Math.ceil(Math.max(w1.width, w2.width, l.width, ms) + 40), H = 380;
  const cx = W / 2;
  const a = runs([{ font: F.display, text: 'Museu ', size: 50 }, { font: F.italic, text: 'das', size: 50 }], cx - w1.width / 2, ms + 82);
  const b2 = textPath(F.display, 'Conchas', cx - w2.width / 2, ms + 138, 50);
  const c = textPath(F.mono, 'ITAPIRUBÁ · IMBITUBA · SC', cx - l.width / 2, ms + 186, 13, 3.2);
  const g = fit(symbolPaths(), ms, 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
    markG(g, 3.8, mark, ` transform="translate(${cx - ms / 2} 12)"`) +
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
  const g = fit(symbolPaths(), 190, 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
    (bg ? `<circle cx="${cx}" cy="${cx}" r="${cx}" fill="${bg}"/>` : '') +
    `<circle cx="${cx}" cy="${cx}" r="${R + 22}" fill="none" stroke="${ring}" stroke-width="1.5" opacity=".7"/>` +
    `<circle cx="${cx}" cy="${cx}" r="${R - 26}" fill="none" stroke="${ring}" stroke-width="1.5" opacity=".7"/>` +
    `<path fill="${ink}" d="${d}"/>` +
    markG(g, 4.6, ink, ` transform="translate(${cx - 95} ${cx - 95})"`) + '</svg>';
}

const files = {
  'simbolo.svg': symbolSVG(),
  'simbolo-mono.svg': symbolSVG({ stroke: 'currentColor' }),
  'simbolo-escuro.svg': symbolSVG({ stroke: C.crepusculo }),
  'favicon.svg': symbolSVG({ size: 64, sw: 3.6, bg: C.crepusculo, radius: 14, pad: 7, spines: 'simple' }),
  'icone-app.svg': symbolSVG({ size: 512, sw: 15, bg: C.crepusculo, radius: 112, pad: 84 }),
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
writeFileSync(resolve(out, 'simbolo-paths.json'), JSON.stringify(fit(symbolPaths(), 100, 6)) + '\n');
// atualiza o símbolo embutido no site (sprite do index.html, pré-carregamento e assets/icones.svg)
const site = resolve(out, '../..'), idx = resolve(site, 'index.html');
if (existsSync(idx)) {
  const P = fit(symbolPaths(), 100, 6);
  let h = readFileSync(idx, 'utf8');
  h = h.replace(/<symbol id="mk" viewBox="0 0 100 100">[\s\S]*?<\/symbol>/, `<symbol id="mk" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.4"><path d="${P.body}"/><path d="${P.spines}" stroke-width="2.6"/><path d="${P.details}" stroke-width="2" opacity=".85"/></g></symbol>`);
  h = h.replace(/<svg class="loader__mark"[\s\S]*?<\/svg>/, `<svg class="loader__mark" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#0A3550" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"><path d="${P.body}"/><path d="${P.spines}" stroke-width="1.8"/><path d="${P.details}" stroke-width="1.4"/></g></svg>`);
  writeFileSync(idx, h);
  writeFileSync(resolve(site, 'assets/icones.svg'), `<svg xmlns="http://www.w3.org/2000/svg"><defs>${h.match(/<defs>([\s\S]*?)<\/defs>/)[1]}</defs></svg>\n`);
}
console.log('ok:', Object.keys(files).join(', '));
