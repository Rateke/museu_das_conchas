// Exporta as conchas procedurais (projetos/museu-das-conchas/lab.html) como WebP
// com fundo transparente, usadas nos cards do acervo e na régua dos gigantes.
//
//   node tools/museu-render-conchas.mjs            # todas
//   node tools/museu-render-conchas.mjs nautilus   # só uma
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './museu-shot.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'assets/conchas');
mkdirSync(out, { recursive: true });
const srv = await serve();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on('pageerror', e => console.error('erro:', e.message));
const base = `http://localhost:${srv.address().port}`;
await page.goto(`${base}/lab.html?ids=x`, { waitUntil: 'load' }).catch(() => {});
const all = process.argv[2] ? [process.argv[2]] : await page.evaluate(async () => Object.keys((await import('./js/shells.js')).SHAPES));
const PX = 1000;
// vistas extras: a trombeta de frente para a abertura ilustra a anatomia
const jobs = all.map(id => ({ id, name: id, yaw: 0 }));
if (!process.argv[2]) jobs.push({ id: 'syrinx', name: 'anatomia', yaw: 150 });
for (const { id, name, yaw } of jobs) {
  await page.goto(`${base}/lab.html?id=${id}&px=${PX}&yaw=${yaw}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.labReady);
  const png = resolve(out, `${name}.png`);
  await page.locator('canvas').screenshot({ path: png, omitBackground: true });
  execFileSync('convert', [png, '-trim', '+repage', '-resize', '900x900>', '-quality', '86', '-define', 'webp:alpha-quality=90', resolve(out, `${name}.webp`)]);
  rmSync(png);
  console.log('ok', name);
}
await browser.close(); srv.close();
