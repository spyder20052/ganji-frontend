// Budget de poids de la première page (cahier des charges §7 et §12), mesuré sur le build.
//
// - Critère d'acceptation : première page < 200 Ko transférés (HTML, CSS, JavaScript et polices,
//   compressés). Bloquant.
// - Cible : JavaScript initial < 100 Ko. React 19 et le runtime de Next.js pèsent à eux seuls
//   environ 100 Ko compressés : la cible est affichée, et seul un dépassement de 120 Ko
//   (régression du code de l'application) bloque.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const NEXT = '.next';
const PAGE_BUDGET = 200 * 1024;
const JS_TARGET = 100 * 1024;
const JS_GUARD = 120 * 1024;

const manifestPath = join(NEXT, 'app-build-manifest.json');
const htmlPath = join(NEXT, 'server/app/index.html');
if (!existsSync(manifestPath) || !existsSync(htmlPath)) {
  console.error('Lancer `npm run build` avant ce contrôle.');
  process.exit(1);
}

const gz = (file) => gzipSync(readFileSync(file)).length;
const kb = (n) => `${(n / 1024).toFixed(1)} Ko`;

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const assets = [...new Set([...(manifest.pages['/page'] ?? []), ...(manifest.pages['/layout'] ?? [])])];
const js = assets.filter((f) => f.endsWith('.js')).reduce((n, f) => n + gz(join(NEXT, f)), 0);
const css = assets.filter((f) => f.endsWith('.css')).reduce((n, f) => n + gz(join(NEXT, f)), 0);
const html = readFileSync(htmlPath, 'utf8');
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
