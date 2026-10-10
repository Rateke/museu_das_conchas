// Captura páginas do site do Museu das Conchas com Playwright (para revisão).
//
//   node tools/museu-shot.mjs <caminho-relativo> <saida.png> [largura] [altura] [--full] [--wait ms] [--scroll y] [--eval js]
//
// Sobe um servidor estático temporário na pasta do projeto, porque os módulos ES
// não carregam via file://.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain', '.xml': 'application/xml' };
export function serve(port = 0) {
  return new Promise(res => {
    const srv = createServer(async (req, rsp) => {
      const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      try {
        const f = resolve(root, '.' + (p.endsWith('/') ? p + 'index.html' : p));
        const b = await readFile(f);
        rsp.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); rsp.end(b);
      } catch { rsp.writeHead(404); rsp.end('404'); }
    }).listen(port, () => res(srv));
  });
}
export async function launch() {
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const flag = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  const [path, out, w = '1440', h = '900'] = a.filter((x, i) => !x.startsWith('--') && !(a[i - 1] || '').match(/^--(wait|scroll|eval)$/));
  const srv = await serve();
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('erro na página:', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/${path}`, { waitUntil: 'load' });
  if (flag('--eval')) await page.evaluate(flag('--eval'));
  if (flag('--scroll')) await page.evaluate(y => window.scrollTo(0, +y), flag('--scroll'));
  await page.waitForTimeout(+(flag('--wait') || 1500));
  await page.screenshot({ path: out, fullPage: a.includes('--full') });
  await browser.close(); srv.close();
  console.log('ok', out);
}
