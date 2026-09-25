// Budget de poids de la première page (cahier des charges §7 et §12), mesuré sur le build.
//
// - Critère d'acceptation : première page < 200 Ko transférés (HTML, CSS, JavaScript et polices,
//   compressés). Bloquant.
// - Cible : JavaScript initial < 100 Ko. React 19 et le runtime de Next.js pèsent à eux seuls
//   environ 100 Ko compressés : la cible est affichée, et seul un dépassement de 120 Ko
//   (régression du code de l'application) bloque.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT = '.next';
const PAGE_BUDGET = 200 * 1024;
const JS_TARGET = 100 * 1024;
const JS_GUARD = 120 * 1024;

const manifestPath = join(NEXT, 'app-build-manifest.json');
const htmlPath = join(NEXT, 'server/app/index.html');
if (!existsSync(manifestPath)) {
  console.error('Lancer `npm run build` avant ce contrôle.');
  process.exit(1);
}

const gz = (file) => gzipSync(readFileSync(file)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} Ko`;

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const assets = [...new Set([...(manifest.pages['/page'] ?? []), ...(manifest.pages['/layout'] ?? [])])];
const js = assets.filter((f) => f.endsWith('.js')).reduce((n, f) => n + gz(join(NEXT, f)), 0);
const css = assets.filter((f) => f.endsWith('.css')).reduce((n, f) => n + gz(join(NEXT, f)), 0);
// Page rendue à la demande (la langue de l'interface vient d'un cookie) : on la demande au serveur
// de production, en français, la langue par défaut. Page statique : on lit le fichier généré.
async function firstPageHtml() {
  if (existsSync(htmlPath)) return readFileSync(htmlPath, 'utf8');
  const port = 3999;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 120; i++) {
      try {
        const res = await fetch(`http://localhost:${port}/`);
        if (res.ok) return await res.text();
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Serveur de production injoignable pour mesurer la première page.');
  } finally {
    server.kill();
  }
}
const html = await firstPageHtml();
const fonts = [...new Set(html.match(/\/_next\/static\/media\/[\w.-]+\.woff2/g) ?? [])];
// Les polices woff2 sont déjà compressées : on compte leur taille brute.
const fontBytes = fonts.reduce((n, f) => n + readFileSync(join(NEXT, f.replace('/_next/', ''))).length, 0);
const page = gzipSync(html).length + css + js + fontBytes;

console.log(`Première page : ${kb(page)} (HTML ${kb(gzipSync(html).length)}, CSS ${kb(css)}, JS ${kb(js)}, polices ${kb(fontBytes)}) · budget ${kb(PAGE_BUDGET)}`);
console.log(`JavaScript initial : ${kb(js)} · cible ${kb(JS_TARGET)}, plancher React + Next ≈ 100 Ko`);

let failed = false;
if (page > PAGE_BUDGET) {
  console.error('Budget de la première page dépassé.');
  failed = true;
}
if (js > JS_GUARD) {
  console.error(`JavaScript initial au-delà du garde-fou de ${kb(JS_GUARD)} : régression du code de l'application.`);
  failed = true;
} else if (js > JS_TARGET) {
  console.warn('Avertissement : JavaScript initial au-dessus de la cible de 100 Ko (plancher du framework).');
}
process.exit(failed ? 1 : 0);
