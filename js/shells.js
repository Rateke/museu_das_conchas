// Conchas procedurais.
//
// Gastrópodes e cefalópodes usam o modelo clássico de crescimento por espiral
// logarítmica (Raup, 1966; Cortie, 1989): uma "curva geradora" (o corte da volta)
// gira em torno do eixo e cresce W vezes a cada volta, descendo T unidades.
// Como tudo cresce na mesma proporção, a concha cresce sem mudar de forma.
// Bivalves e cauris têm geradores próprios.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrap = d => { d %= 1; if (d > .5) d -= 1; if (d < -.5) d += 1; return d; };

// ---------- curva geradora: Catmull-Rom fechada ----------
function closedSpline(pts) {
  const n = pts.length;
  const at = (s) => {
    const f = ((s % 1) + 1) % 1 * n, i = Math.floor(f), t = f - i;
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t2 = t * t, t3 = t2 * t;
    const c = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  };
  return (s) => {
    const p = at(s), e = 1e-3, a = at(s - e), b = at(s + e);
    let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    return { x: p[0], z: p[1], nx: tz, nz: -tx }; // normal para fora (curva anti-horária)
  };
}
const ellipse = (rx, rz, k = 14) => Array.from({ length: k }, (_, i) => [Math.cos(i / k * TAU) * rx, Math.sin(i / k * TAU) * rz]);

// ---------- gastrópode / cefalópode ----------
// W: crescimento por volta · D: distância do centro da curva ao eixo (em raios da curva)
// T: descida por unidade de raio (altura da espira) · turns: voltas
// ribs: costelas axiais {N, L, w} · nodes: nódulos/espinhos {N, L, s, ws, wt, phase}
// cords: cordões espirais {N, L} · flare: lábio expandido {L, s, ws, span}
function spiral(p) {
  const prof = closedSpline(p.profile);
  const nS = p.segS ?? 120, perTurn = p.perTurn ?? 64;
  const thMax = 0, thMin = -p.turns * TAU;
  const nT = Math.ceil(p.turns * perTurn);
  const lnW = Math.log(p.W) / TAU;
  const pos = new Float32Array((nT + 1) * (nS + 1) * 3), uv = new Float32Array((nT + 1) * (nS + 1) * 2);
  const hand = p.sinistral ? -1 : 1;
  let k = 0, q = 0;
  for (let i = 0; i <= nT; i++) {
    const th = lerp(thMin, thMax, i / nT);
    const g = Math.exp(th * lnW);           // escala desta volta
    const rc = p.D * g, zc = -p.T * rc;      // centro da curva geradora
    const turnPos = th / TAU;                // posição em voltas (negativa)
    for (let j = 0; j <= nS; j++) {
      const s = j / nS;
      const c = prof(s);
      let off = 0;
      if (p.ribs) for (const r of p.ribs) {
        const d = wrap(turnPos * r.N + (r.phase || 0));
        const env = r.s !== undefined ? Math.exp(-((wrap(s - r.s) / (r.ws || .2)) ** 2)) : 1;
        off += r.L * env * Math.exp(-((d / (r.w || .12)) ** 2));
      }
      if (p.nodes) for (const n of p.nodes) {
        const d = wrap(turnPos * n.N + (n.phase || 0));
        off += n.L * Math.exp(-((wrap(s - n.s) / n.ws) ** 2) - ((d / n.wt) ** 2));
      }
      if (p.cords) for (const cd of p.cords) {
        const env = cd.s !== undefined ? Math.exp(-((wrap(s - cd.s) / (cd.ws || .2)) ** 2)) : 1;
        off += cd.L * env * (.5 + .5 * Math.cos(s * TAU * cd.N));
      }
      if (p.flare) {
        const f = p.flare, t = smooth(-f.span * TAU, 0, th);
        off += f.L * t * t * Math.exp(-((wrap(s - f.s) / f.ws) ** 2));
      }
      if (p.growth) off += p.growth.L * Math.sin(turnPos * p.growth.N * TAU) ** 8; // linhas de crescimento
      const rx = rc + g * (c.x + off * c.nx), rz = zc + g * (c.z + off * c.nz);
      pos[k++] = rx * Math.cos(th); pos[k++] = rz; pos[k++] = hand * rx * Math.sin(th);
      uv[q++] = s; uv[q++] = i / nT;
    }
  }
  return gridGeometry(pos, uv, nT, nS, true, p.sinistral);
}

// ---------- bivalve ----------
// Cada valva é um leque saindo do umbo. outline(ψ) dá o raio da margem,
// ribs são costelas radiais e folds são dobras grandes (tridacna).
function bivalveValve(p, side) {
  const nU = p.segU ?? 70, nV = p.segV ?? 220;
  const pos = new Float32Array((nU + 1) * (nV + 1) * 3), uv = new Float32Array((nU + 1) * (nV + 1) * 2);
  let k = 0, q = 0;
  for (let i = 0; i <= nU; i++) {
    const u = Math.max(i / nU, 1e-3);
    for (let j = 0; j <= nV; j++) {
      const v = j / nV, psi = lerp(-p.spread, p.spread, v);
      let r = p.outline(psi);
      let z = p.H * (1 - u ** 2.1) * Math.max(0, Math.cos(psi * p.domeFall)) ** .55;
      if (p.ribs) {
        const w = Math.cos(psi * p.ribs.N);
        z += p.ribs.L * Math.min(1, u * 1.4) * (p.ribs.sharp ? Math.sign(w) * Math.abs(w) ** p.ribs.sharp : w);
      }
      let fold = 0;
      if (p.folds) {
        const w = Math.sin(psi * p.folds.N + (p.folds.phase || 0));
        fold = p.folds.L * u ** 1.3 * w;
        r *= 1 + p.folds.edge * u ** 3 * Math.abs(w);
      }
      if (p.growth) z += p.growth.L * u * Math.sin(u * p.growth.N * TAU) ** 12;
      if (p.scales) z += p.scales.L * u * Math.max(0, Math.sin(u * p.scales.N * TAU)) ** 6 * (.5 + .5 * Math.cos(psi * p.ribs.N));
      const x = u * r * Math.sin(psi) * p.width, y = -u * r * Math.cos(psi) * p.height;
      // valva de cima/baixo e abertura em torno da charneira (eixo x)
      const a = p.open * side, zz = z * side + fold;
      pos[k++] = x; pos[k++] = y * Math.cos(a) - zz * Math.sin(a); pos[k++] = y * Math.sin(a) + zz * Math.cos(a);
      uv[q++] = v; uv[q++] = u;
    }
  }
  return gridGeometry(pos, uv, nU, nV, false, side > 0);
}

// ---------- cauri (Cypraeidae) ----------
function cowrie(p) {
  const nA = 140, nB = 120;
  const pos = new Float32Array((nA + 1) * (nB + 1) * 3), uv = new Float32Array((nA + 1) * (nB + 1) * 2);
  let k = 0, q = 0;
  for (let i = 0; i <= nA; i++) {
    const lon = lerp(-Math.PI, Math.PI, i / nA);       // em volta do comprimento
    for (let j = 0; j <= nB; j++) {
      const lat = lerp(-Math.PI / 2, Math.PI / 2, j / nB); // ao longo do comprimento
      const cl = Math.cos(lat);
      let x = Math.sin(lat) * p.len;
      // seção transversal: superelipse achatada embaixo
      const ex = p.side, cy = Math.cos(lon), sy = Math.sin(lon);
      let y = Math.sign(cy) * Math.abs(cy) ** ex * cl * p.w;
      let z = sy * cl * (sy > 0 ? p.h : p.base);
      // margens laterais grossas (calos) e base com a fenda dentada
            const dl = Math.abs(lon + Math.PI / 2);
      const slit = Math.exp(-((dl / .12) ** 2));
      const teeth = .5 + .5 * Math.cos(lat * p.teeth);
      z += slit * cl * (p.groove + p.toothL * teeth * (1 - Math.exp(-((dl / .05) ** 2))));
      y *= 1 + p.angular * Math.cos(lat * 2) * (1 - Math.abs(sy));
      pos[k++] = x; pos[k++] = z; pos[k++] = y;
      uv[q++] = i / nA; uv[q++] = j / nB;
    }
  }
  return gridGeometry(pos, uv, nA, nB, true, false);
}

function gridGeometry(pos, uv, nI, nJ, seamJ, flip) {
  const idx = [];
  const W = nJ + 1;
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  if (seamJ) { // costura: média das normais nas duas bordas
    const n = g.attributes.normal.array;
    for (let i = 0; i <= nI; i++) {
      const a = (i * W) * 3, b = (i * W + nJ) * 3;
      for (let c = 0; c < 3; c++) { const m = (n[a + c] + n[b + c]) / 2; n[a + c] = n[b + c] = m; }
    }
  }
  return g;
}

// ---------- texturas pintadas (u = ao redor da volta, v = crescimento) ----------
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
function fbm(x, y, o = 4) { let a = 0, f = 1, w = .5; for (let i = 0; i < o; i++) { a += w * vnoise(x * f, y * f); f *= 2; w *= .5; } return a; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function paintTexture(fn, size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const col = fn(x / size, 1 - y / size); const o = (y * size + x) * 4;
    d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// ---------- catálogo de formas ----------
// pose: rotação de exibição [x, y, z] (graus) · size: maior dimensão em cm (escala real)
export const SHAPES = {
  nautilus: {
    kind: 'spiral', size: 20, pose: [90, 0, 0], view: [0, 0, 1],
    W: 3.1, D: 1.18, T: 0, turns: 3.2, perTurn: 90,
    profile: [[1, 0], [.86, .5], [.45, .74], [-.2, .62], [-.62, .3], [-.7, 0], [-.62, -.3], [-.2, -.62], [.45, -.74], [.86, -.5]],
    growth: { N: 70, L: .006 },
    paint(u, v, turns) {
      const tp = (v - 1) * turns; // voltas a partir da abertura (<= 0)
      const base = mix3(hex('#f3ead9'), hex('#fbf6ee'), smooth(-.3, 0, tp));
      const stripe = Math.sin((tp * 11 + Math.sin(u * TAU * 2.5) * .12) * TAU);
      const across = smooth(.42, .12, Math.abs(wrap(u)));
      const fade = smooth(-.12, -.42, tp);
      const s = smooth(.35, .75, stripe) * fade * Math.min(1, across + .15) * (.75 + .25 * fbm(u * 9, v * 40));
      return mix3(base, hex('#9c4a22'), s * .92);
    },
    rough: .38, coat: .7, inner: 'nacre',
  },
  goliath: {
    kind: 'spiral', size: 38, pose: [8, 2, 0], view: [0, 0, 1],
    W: 2.35, D: .55, T: 1.7, turns: 7.2, perTurn: 56,
    profile: [[.95, .55], [.55, .95], [-.15, .7], [-.45, .25], [-.5, -.5], [-.3, -1.5], [-.05, -1.9], [.25, -1.1], [.75, -.3]],
    nodes: [{ N: 9, L: .22, s: .02, ws: .07, wt: .2 }],
    flare: { L: 1.9, s: .08, ws: .22, span: .55 },
    growth: { N: 40, L: .01 },
    paint(u, v) {
      const n = fbm(u * 6, v * 30);
      return mix3(hex('#e7cfae'), hex('#c99a6b'), smooth(.35, .8, n) * .7);
    },
    rough: .5, coat: .3, inner: 'porcelain-peach',
  },
  syrinx: {
    kind: 'spiral', size: 90, pose: [0, 200, 0], view: [0, 0, 1],
    W: 1.55, D: .6, T: 4.6, turns: 10, perTurn: 48,
    profile: [[.92, .5], [.6, .92], [.05, .85], [-.4, .5], [-.5, -.3], [-.35, -1.6], [-.2, -3.4], [.05, -3.5], [.18, -1.7], [.7, -.4]],
    nodes: [{ N: 11, L: .05, s: .03, ws: .05, wt: .2 }],
    growth: { N: 30, L: .01 },
    paint(u, v) {
      const n = fbm(u * 5, v * 50);
      return mix3(mix3(hex('#e4a067'), hex('#c46f3c'), n), hex('#f2d5b6'), smooth(.35, .05, v) * .6);
    },
    rough: .45, coat: .4, inner: 'porcelain-peach',
  },
  conus: {
    kind: 'spiral', size: 15, pose: [6, 160, 0], view: [0, 0, 1],
    nodes: [{ N: 11, L: .07, s: .06, ws: .05, wt: .2 }],
    W: 2.7, D: .5, T: .55, turns: 8, perTurn: 56,
    profile: [[1, .28], [.75, .52], [.1, .46], [-.4, .3], [-.48, -.3], [-.3, -1.6], [-.12, -2.35], [.1, -1.8], [.75, -.3]],
    paint(u, v) {
      const n = fbm(u * 14 + 3, v * 60, 5);
      const net = fbm(u * 60, v * 220, 3);
      const band = smooth(.25, .6, Math.sin(u * TAU * 1.6 + 2.2) * .5 + .5);
      let c = mix3(hex('#f3e6e3'), hex('#e6cfc8'), fbm(u * 3, v * 9));
      c = mix3(c, hex('#9a5a36'), smooth(.47, .56, n * .8 + band * .25) * .85);
      return mix3(c, hex('#7a4326'), smooth(.55, .68, net) * .55);
    },
    rough: .2, coat: 1, inner: 'porcelain',
  },
  epitonium: {
    kind: 'spiral', size: 6, pose: [0, 0, 0], view: [0, 0, 1],
    W: 1.42, D: 1.6, T: 4.1, turns: 8, perTurn: 120,
    profile: ellipse(1, 1.05, 14),
    ribs: [{ N: 9, L: .2, w: .022 }],
    paint(u, v) { return mix3(hex('#f5eee3'), hex('#d9c3a5'), fbm(u * 4, v * 30) * .35); },
    rough: .45, coat: .4, inner: 'porcelain',
  },
  bolinus: {
    kind: 'spiral', size: 9, pose: [0, 120, 0], view: [0, 0, 1],
    W: 2.2, D: .55, T: 2.3, turns: 7, perTurn: 120, segS: 160,
    profile: [[1, .15], [.8, .6], [.2, .75], [-.4, .45], [-.55, -.2], [-.35, -.8], [-.1, -1.4], [-.05, -3.2], [.08, -3.2], [.12, -1.4], [.5, -.9], [.9, -.4]],
    nodes: [
      { N: 7, L: .5, s: .04, ws: .03, wt: .05 },
      { N: 7, L: .25, s: .55, ws: .02, wt: .05 },
    ],
    ribs: [{ N: 7, L: .05, w: .08 }],
    paint(u, v) {
      const band = .5 + .5 * Math.sin(u * TAU * 3 + 1);
      return mix3(hex('#ead8bd'), hex('#a77a55'), band * .45 * fbm(u * 5, v * 20));
    },
    rough: .55, coat: .25, inner: 'porcelain-lilac',
  },
  argonauta: {
    kind: 'spiral', size: 30, pose: [90, 0, 0], view: [0, 0, 1],
    W: 6.5, D: 1.02, T: 0, turns: 1.85, perTurn: 140,
    profile: [[1, 0], [.95, .32], [.55, .5], [-.1, .45], [-.7, .25], [-.85, 0], [-.7, -.25], [-.1, -.45], [.55, -.5], [.95, -.32]],
    nodes: [{ N: 22, L: .1, s: .05, ws: .03, wt: .15 }, { N: 22, L: .1, s: .95, ws: .03, wt: .15 }],
    ribs: [{ N: 22, L: .035, w: .3, phase: .5 }],
    paint(u, v) {
      const keel = smooth(.1, .02, Math.abs(wrap(u)));
      const apex = smooth(.55, .1, v);
      return mix3(hex('#f6f2ea'), hex('#6e4a33'), keel * apex * .85);
    },
    rough: .5, coat: .3, inner: 'porcelain', thin: true,
  },
  turritella: {
    kind: 'spiral', size: 15, pose: [0, 0, 0], view: [0, 0, 1],
    W: 1.18, D: 1.0, T: 5.4, turns: 15, perTurn: 48,
    profile: [[.9, .25], [.7, .62], [-.2, .72], [-.62, .4], [-.7, -.3], [-.3, -.7], [.5, -.62], [.92, -.25]],
    cords: [{ N: 6, L: .05 }],
    paint(u, v) {
      const band = smooth(.3, .7, .5 + .5 * Math.sin(u * TAU * 2 + .6));
      return mix3(mix3(hex('#c99a6c'), hex('#7c4a2a'), band * .8), hex('#5e351c'), smooth(.7, .9, fbm(u * 4, v * 60)) * .4);
    },
    rough: .5, coat: .3, inner: 'porcelain',
  },
  pachycymbiola: {
    kind: 'spiral', size: 15, pose: [4, 72, 0], view: [0, 0, 1],
    W: 3.4, D: .45, T: .9, turns: 4.6, perTurn: 80,
    profile: [[.95, .45], [.62, .85], [-.05, .78], [-.45, .35], [-.5, -.6], [-.32, -1.5], [-.05, -1.7], [.55, -1.1], [.95, -.35]],
    growth: { N: 30, L: .006 },
    paint(u, v) {
      const z = Math.abs(Math.sin(u * 40 + Math.abs(wrap(v * 30)) * 6));
      let c = mix3(hex('#e9b48f'), hex('#f3d2b7'), fbm(u * 4, v * 12));
      return mix3(c, hex('#b8663f'), smooth(.92, 1, z) * .35 * smooth(.2, .6, v));
    },
    rough: .35, coat: .6, inner: 'porcelain-peach',
  },
  tridacna: {
    kind: 'bivalve', size: 137, pose: [-35, 0, 0], view: [0, 0, 1],
    width: 1.45, height: 1, spread: 1.45, domeFall: .62, H: .7, open: .03,
    outline: psi => .85 + .15 * Math.cos(psi * 1.2),
    folds: { N: 9, L: .34, edge: .1, phase: Math.PI / 2 },
    ribs: { N: 40, L: .012 },
    scales: { N: 10, L: .03 },
    growth: { N: 22, L: .01 },
    paint(u, v) { return mix3(hex('#efeadf'), hex('#c9c2b0'), fbm(u * 10, v * 6) * .6); },
    rough: .7, coat: .1, inner: 'porcelain',
  },
  nodipecten: {
    kind: 'bivalve', size: 15, pose: [-8, 0, 0], view: [0, 0, 1],
    width: 1, height: 1, spread: 1.7, domeFall: .7, H: .28, open: .015,
    outline: psi => { const a = Math.abs(psi); return a < 1.05 ? 1 : lerp(1, .38, smooth(1.05, 1.22, a)); },
    ribs: { N: 9, L: .045, sharp: .8 },
    growth: { N: 30, L: .008 },
    nodesBiv: true,
    paint(u, v) {
      const n = fbm(u * 12, v * 8);
      return mix3(hex('#d9542e'), hex('#f08a4b'), n * .7);
    },
    rough: .5, coat: .3, inner: 'porcelain',
  },
  moneta: {
    kind: 'cowrie', size: 3, pose: [-14, 0, 0], view: [0, 0, 1],
    len: 1, w: .8, h: .55, base: .24, side: .55, callus: .1, groove: .2, teeth: 26, toothL: .05, angular: .16,
    paint(u, v) {
      const bottom = smooth(.3, .12, Math.abs(wrap(u - .25)));
      const n = fbm(u * 8, v * 8);
      return mix3(mix3(hex('#f0d36f'), hex('#e9c35a'), n), hex('#f8f2e2'), bottom);
    },
    rough: .12, coat: 1, inner: 'porcelain',
  },
};

// ---------- materiais ----------
const INNER = {
  nacre: { color: '#f3ebe4', roughness: .14, metalness: .1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [180, 720], clearcoat: 1, clearcoatRoughness: .08 },
  porcelain: { color: '#f5efe8', roughness: .3, clearcoat: .8, clearcoatRoughness: .15 },
  'porcelain-peach': { color: '#f6b98f', roughness: .22, clearcoat: 1, clearcoatRoughness: .1, iridescence: .25 },
  'porcelain-lilac': { color: '#e8cfd6', roughness: .3, clearcoat: .8 },
};

const texCache = new Map();
export function buildShell(id, opts = {}) {
  const p = SHAPES[id];
  let geos = [];
  if (p.kind === 'spiral') geos = [spiral(p)];
  else if (p.kind === 'bivalve') geos = [bivalveValve(p, 1), bivalveValve(p, -1)];
  else geos = [cowrie(p)];

  if (!texCache.has(id)) texCache.set(id, paintTexture((u, v) => p.paint(u, v, p.turns || 1), opts.texSize || 512));
  const map = texCache.get(id);
  const outer = new THREE.MeshPhysicalMaterial({
    map, roughness: p.rough, clearcoat: p.coat, clearcoatRoughness: .25, side: THREE.FrontSide,
  });
  const inner = new THREE.MeshPhysicalMaterial({ ...INNER[p.inner || 'porcelain'], side: THREE.BackSide });

  const group = new THREE.Group();
  const holder = new THREE.Group();
  for (const g of geos) { holder.add(new THREE.Mesh(g, outer), new THREE.Mesh(g, inner)); }
  // centra e normaliza para caber num cubo de lado 2
  const box = new THREE.Box3().setFromObject(holder);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const k = 2 / Math.max(s.x, s.y, s.z);
  holder.position.copy(c).multiplyScalar(-k); holder.scale.setScalar(k);
  const pose = new THREE.Group();
  pose.add(holder);
  pose.rotation.set(...p.pose.map(d => d * Math.PI / 180));
  // renormaliza depois da pose
  const box2 = new THREE.Box3().setFromObject(pose);
  const c2 = box2.getCenter(new THREE.Vector3()), s2 = box2.getSize(new THREE.Vector3());
  const k2 = 2 / Math.max(s2.x, s2.y);
  pose.scale.setScalar(k2); pose.position.copy(c2).multiplyScalar(-k2);
  group.add(pose);
  group.userData = { id, size: p.size, aspect: s2.x / s2.y };
  return group;
}

// ---------- ambiente subaquático para reflexos ----------
export function underwaterEnvironment(renderer, { top = '#bdf3ff', mid = '#1b6f86', bottom = '#03121c', sun = 6 } = {}) {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) }, sun: { value: sun } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, mid, bottom; uniform float sun; varying vec3 vP;
      void main(){ float y = vP.y;
        vec3 c = mix(bottom, mid, smoothstep(-.6, .1, y)); c = mix(c, top, smoothstep(.1, .9, y));
        c += vec3(1., .97, .9) * sun * pow(max(0., y), 28.);
        c += vec3(.6, .9, 1.) * .9 * pow(max(0., dot(vP, normalize(vec3(.8, .35, .5)))), 10.);
        gl_FragColor = vec4(c, 1.); }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, .02);
  pmrem.dispose(); geo.dispose(); mat.dispose();
  return rt.texture;
}

export function studioLights(scene) {
  const key = new THREE.DirectionalLight('#fff4e0', 2.2); key.position.set(2, 5, 4);
  const rim = new THREE.DirectionalLight('#7fe9ff', 1.6); rim.position.set(-4, 2, -3);
  const fill = new THREE.HemisphereLight('#bfefff', '#06202e', .6);
  scene.add(key, rim, fill);
  return { key, rim, fill };
}
