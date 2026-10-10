// O oceano que fica atrás do site inteiro: a cor da água muda com a profundidade,
// raios de sol e cáusticas perto da superfície, neve marinha que sobe enquanto
// você desce, bolhas, bioluminescência no abismo e o náutilo 3D do topo.
import * as THREE from 'three';
import { buildShell, underwaterEnvironment, studioLights } from './shells.js';

// paleta por profundidade (m): [profundidade, topo da tela, base da tela]
const WATER = [
  [0, '#237f95', '#0d5068'],
  [30, '#1c748b', '#0c4a63'],
  [120, '#15667f', '#0a3d59'],
  [320, '#0e4b67', '#082a43'],
  [1100, '#0a3550', '#061c2f'],
  [3000, '#061b2c', '#030c15'],
  [4200, '#040f19', '#02060b'],
];
const C = WATER.map(([d, a, b]) => [Math.log1p(d), new THREE.Color(a), new THREE.Color(b)]);
export function waterAt(depth) {
  const x = Math.log1p(Math.max(0, depth));
  let i = 0; while (i < C.length - 2 && x > C[i + 1][0]) i++;
  const t = Math.min(1, Math.max(0, (x - C[i][0]) / (C[i + 1][0] - C[i][0])));
  return { top: C[i][1].clone().lerp(C[i + 1][1], t), bottom: C[i][2].clone().lerp(C[i + 1][2], t) };
}

const BG_FRAG = /* glsl */`
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec3 uTop; uniform vec3 uBot;
uniform float uRays; uniform float uCaustic; uniform float uSurface; uniform float uBio; uniform vec2 uMouse;
// cáusticas: grade deformada por senos; as linhas finas acendem onde o produto zera
float caustic(vec2 p, float t){
  vec2 q = p; float v = 0.;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    q += vec2(sin(q.y * 1.7 + t * .8 + fi), cos(q.x * 1.3 - t * .6 + fi * 1.7)) * .55;
    v += abs(sin(q.x * 1.9) * cos(q.y * 1.6));
  }
  return pow(clamp(1. - v / 3., 0., 1.), 7.);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 col = mix(uBot, uTop, smoothstep(0., 1., uv.y));
  // raios de sol saindo de um ponto acima da tela
  vec2 p = (gl_FragCoord.xy - vec2(uRes.x * (.62 + .06 * sin(uTime * .05)), uRes.y * 1.3)) / uRes.y;
  float ang = atan(p.x, -p.y);
  float r = (sin(ang * 17. + uTime * .3) * .5 + .5) * (sin(ang * 29. - uTime * .21 + 1.3) * .5 + .5);
  r += (sin(ang * 6. + uTime * .11) * .5 + .5) * .45;
  r = pow(r, 2.2) * (1. - smoothstep(.15, 1.7, length(p)));
  col += vec3(.72, .95, 1.) * r * uRays * .2;
  // cáusticas perto da superfície
  if (uCaustic > .01) {
    float c = caustic(uv * vec2(uRes.x / uRes.y, 1.) * 6. + 20., uTime * .35);
    col += vec3(.75, 1., .95) * c * uCaustic * smoothstep(.45, 1., uv.y) * .16;
  }
  // a superfície vista de baixo
  float w = sin(uv.x * 11. + uTime * .7) * .012 + sin(uv.x * 29. - uTime * 1.1) * .005;
  float sb = smoothstep(.9, 1.0, uv.y + w);
  col = mix(col, vec3(.78, .95, .96), sb * uSurface * .5);
  // vinheta
  col *= mix(1., 1. - smoothstep(.3, 1.3, length((uv - vec2(.5, .58)) * vec2(1., 1.15))), .5);
  // luz do cursor no fundo
  float md = length((gl_FragCoord.xy - uMouse) / uRes.y);
  col += vec3(.2, .95, .85) * exp(-md * md * 18.) * uBio * .09;
  gl_FragColor = vec4(col, 1.);
}`;

const SNOW_VERT = /* glsl */`
attribute vec4 seed; // x: fase, y: velocidade, z: brilho, w: bio
uniform float uTime; uniform float uScroll; uniform float uPx; uniform vec2 uMouse; uniform float uBio;
varying float vA; varying float vBio;
void main(){
  vec3 p = position;
  p.y = mod(p.y + uScroll * .0016 + uTime * seed.y * .05 + 9., 18.) - 9.;
  p.x += sin(uTime * .25 + seed.x * 6.28) * .25;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float dist = -mv.z;
  vec2 ndc = gl_Position.xy / gl_Position.w;
  float near = exp(-pow(length((ndc - uMouse) * vec2(1.6, 1.)), 2.) * 9.);
  vBio = seed.w * uBio * (.5 + .5 * sin(uTime * (1. + seed.y * 2.) + seed.x * 40.)) + near * uBio;
  vA = seed.z * (1. - smoothstep(3., 16., dist)) * (.35 + .65 * (1. - uBio * .6)) + vBio * .9;
  gl_PointSize = uPx * (1. + seed.z * 1.6 + vBio * 2.2) * (6. / dist);
}`;
const SNOW_FRAG = /* glsl */`
precision mediump float;
varying float vA; varying float vBio;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c);
  float a = 1. - smoothstep(0., .5, d);
  vec3 col = mix(vec3(.85, .95, .95), vec3(.35, 1., .88), clamp(vBio, 0., 1.));
  gl_FragColor = vec4(col, clamp(a * vA, 0., 1.));
}`;

const BUB_VERT = /* glsl */`
attribute vec3 seed; uniform float uTime; uniform float uPx; uniform float uScroll; varying float vA;
void main(){
  vec3 p = position;
  float life = fract(uTime * seed.y * .06 + seed.x);
  p.y = -6. + life * 13. - uScroll * .002;
  p.x += sin(uTime * 2. + seed.x * 30.) * .06 + sin(life * 6.) * .2;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0., .1, life) * (1. - smoothstep(.8, 1., life));
  gl_PointSize = uPx * (2. + seed.z * 7.) * (6. / -mv.z);
}`;
const BUB_FRAG = /* glsl */`
precision mediump float; uniform float uAmt; varying float vA;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c);
  float ring = (1. - smoothstep(.42, .5, d)) * smoothstep(.28, .44, d);
  float hl = 1. - smoothstep(0., .16, length(c - vec2(-.15, .15)));
  gl_FragColor = vec4(vec3(.9, 1., 1.), (ring * .55 + hl * .6) * vA * uAmt);
}`;

export function createOcean(canvas, { reduced = false, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false;

  // fundo
  const bgScene = new THREE.Scene(), bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgU = {
    uRes: { value: new THREE.Vector2() }, uTime: { value: 0 }, uTop: { value: new THREE.Color() }, uBot: { value: new THREE.Color() },
    uRays: { value: 1 }, uCaustic: { value: 1 }, uSurface: { value: 1 }, uBio: { value: 0 }, uMouse: { value: new THREE.Vector2(-999, -999) },
  };
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: BG_FRAG, depthWrite: false, depthTest: false,
  })));

  // cena 3D
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, .1, 60); cam.position.set(0, 0, 9);
  scene.environment = underwaterEnvironment(renderer);
  studioLights(scene);

  // neve marinha
  const N = reduced ? 300 : mobile ? 520 : 1000;
  const sp = new Float32Array(N * 3), ss = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    sp[i * 3] = (Math.random() - .5) * 22; sp[i * 3 + 1] = (Math.random() - .5) * 18; sp[i * 3 + 2] = -Math.random() * 12 + 3;
    ss[i * 4] = Math.random(); ss[i * 4 + 1] = .3 + Math.random(); ss[i * 4 + 2] = Math.random() ** 2; ss[i * 4 + 3] = Math.random() < .22 ? 1 : 0;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('seed', new THREE.BufferAttribute(ss, 4));
  const snowU = { uTime: { value: 0 }, uScroll: { value: 0 }, uPx: { value: 2.2 * dpr }, uMouse: { value: new THREE.Vector2(9, 9) }, uBio: { value: 0 } };
  const snow = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: snowU, vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  snow.frustumCulled = false; scene.add(snow);

  // bolhas
  const B = reduced ? 0 : mobile ? 40 : 80;
  const bp = new Float32Array(B * 3), bs = new Float32Array(B * 3);
  for (let i = 0; i < B; i++) { bp[i * 3] = (Math.random() - .5) * 16 + (Math.random() < .5 ? 3 : 0); bp[i * 3 + 2] = -Math.random() * 8 + 2; bs[i * 3] = Math.random(); bs[i * 3 + 1] = .5 + Math.random(); bs[i * 3 + 2] = Math.random() ** 3; }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('seed', new THREE.BufferAttribute(bs, 3));
  const bubU = { uTime: { value: 0 }, uPx: { value: 2.2 * dpr }, uAmt: { value: 1 }, uScroll: { value: 0 } };
  const bubbles = new THREE.Points(bg, new THREE.ShaderMaterial({ uniforms: bubU, vertexShader: BUB_VERT, fragmentShader: BUB_FRAG, transparent: true, depthWrite: false }));
  bubbles.frustumCulled = false; scene.add(bubbles);

  // náutilo do topo
  const shell = buildShell('nautilus', { texSize: 1024 });
  const holder = new THREE.Group(); holder.add(shell); scene.add(holder);

  const state = { depth: 0, scroll: 0, hero: 0, mx: 0, my: 0, tmx: 0, tmy: 0, mousePx: [-999, -999], w: 1, h: 1, t: 0, running: true };

  function layout() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    state.w = w; state.h = h;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    bgU.uRes.value.set(w * dpr, h * dpr);
    const narrow = w < 860;
    // posição do náutilo: à direita no desktop, atrás do texto no celular
    const visH = 2 * Math.tan(cam.fov * Math.PI / 360) * cam.position.z, visW = visH * cam.aspect;
    holder.userData.base = narrow ? new THREE.Vector3(visW * .24, visH * .3, -1.5) : new THREE.Vector3(visW * .25, -visH * .04, 0);
    holder.userData.scale = narrow ? Math.min(visW * .36, visH * .17) : Math.min(visW * .17, visH * .3);
  }
  layout();

  function frame(dt) {
    state.t += dt;
    const t = state.t, d = state.depth;
    const { top, bottom } = waterAt(d);
    bgU.uTop.value.copy(top); bgU.uBot.value.copy(bottom);
    bgU.uTime.value = t;
    bgU.uRays.value = Math.exp(-d / 160);
    bgU.uCaustic.value = Math.exp(-d / 40);
    bgU.uSurface.value = Math.max(0, 1 - state.scroll / (state.h * .5));
    const bio = THREE.MathUtils.smoothstep(d, 700, 2600);
    bgU.uBio.value = bio; snowU.uBio.value = bio;
    bgU.uMouse.value.set(state.mousePx[0] * dpr, (state.h - state.mousePx[1]) * dpr);
    snowU.uTime.value = t; snowU.uScroll.value = state.scroll;
    snowU.uMouse.value.set((state.mousePx[0] / state.w) * 2 - 1, -(state.mousePx[1] / state.h) * 2 + 1);
    bubU.uTime.value = t; bubU.uScroll.value = state.scroll; bubU.uAmt.value = Math.exp(-d / 90);

    // náutilo: flutua, segue o mouse e sobe quando você desce
    state.mx += (state.tmx - state.mx) * .05; state.my += (state.tmy - state.my) * .05;
    const hp = state.hero; // 0..1 ao rolar o hero
    holder.visible = hp < 1.02;
    if (holder.visible) {
      const b = holder.userData.base, s = holder.userData.scale;
      holder.position.set(b.x + state.mx * .25, b.y + Math.sin(t * .6) * .08 + hp * 5.5, b.z);
      holder.scale.setScalar(s * (1 + hp * .15));
      holder.rotation.set(-.15 + state.my * .18 + Math.sin(t * .4) * .05 + hp * .6, -.35 + state.mx * .3 + Math.sin(t * .23) * .12, -.08 + Math.sin(t * .31) * .05 - hp * .8);
    }
    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(scene, cam);
  }

  let last = performance.now(), raf = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!state.running) return;
    frame(reduced ? 0 : dt);
  }
  if (reduced) frame(0); else raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { state.running = !document.hidden; last = performance.now(); });
  addEventListener('resize', () => { layout(); if (reduced) frame(0); });

  return {
    set(o) { Object.assign(state, o); if (reduced) frame(0); },
    mouse(x, y) { state.mousePx = [x, y]; state.tmx = (x / state.w) * 2 - 1; state.tmy = (y / state.h) * 2 - 1; },
    render: () => frame(0),
  };
}
