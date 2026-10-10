// Percorre a página do museu em "fotos" de tela inteira (revisão visual).
//   node tools/museu-tour.mjs <pasta-saida> [largura] [altura] [passo em telas]
import { mkdirSync } from 'node:fs';
import { serve, launch } from './museu-shot.mjs';
const [out, w = '1440', h = '900', step = '.9'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const srv = await serve(); const b = await launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto(`http://localhost:${srv.address().port}/${process.env.PAGE || 'index.html?shot'}`);
await p.waitForTimeout(3500);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
let i = 0;
for (let y = 0; y < H; y += Math.round(+h * +step)) {
  await p.evaluate(y => window.scrollTo(0, y), y);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/t${String(i++).padStart(2, '0')}.png` });
}
console.log('altura', H, 'capturas', i);
await b.close(); srv.close();
