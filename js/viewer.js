// Visualizador 3D da ficha: gira sozinho e responde ao arrastar.
import * as THREE from 'three';
import { buildShell, underwaterEnvironment, studioLights } from './shells.js';

export function createViewer(stage) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = underwaterEnvironment(renderer, { top: '#d6fbff', mid: '#1b7a90', bottom: '#04121d', sun: 7 });
  studioLights(scene);
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 50); cam.position.set(0, 0, 5.4);
  const pivot = new THREE.Group(); scene.add(pivot);
  const cache = new Map();
  let current = null, rx = 0, ry = 0, vx = 0, vy = .006, drag = null, raf = 0, running = false, intro = 0;

  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
    cam.position.z = cam.aspect < .8 ? 6.6 : 5.4;
  }
  new ResizeObserver(resize).observe(stage);

  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); vx = vy = 0; });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    vy = dx * .006; vx = dy * .004;
  });
  const up = () => { drag = null; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!drag) { vy += (.004 - vy) * .02; vx *= .94; }
    ry += vy; rx = Math.max(-1.1, Math.min(1.1, rx + vx));
    intro += (1 - intro) * .06;
    pivot.rotation.set(rx, ry, 0);
    pivot.scale.setScalar(.78 + intro * .22);
    pivot.position.y = Math.sin(performance.now() / 1400) * .04;
    renderer.render(scene, cam);
  }

  return {
    show(id) {
      if (current) pivot.remove(current);
      if (!cache.has(id)) cache.set(id, buildShell(id, { texSize: 1024 }));
      current = cache.get(id); pivot.add(current);
      rx = .15; ry = -.4; vy = .02; intro = 0;
      resize();
    },
    start() { if (!running) { running = true; resize(); loop(); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
