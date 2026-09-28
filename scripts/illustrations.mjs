// Prépare les illustrations de la landing : `npm run illustrations` après avoir déposé un PNG dans illustrations/.
//
// Chaque PNG source devient des fichiers statiques public/illustrations/<nom>-<largeur>.avif et .webp, servis
// tels quels par le CDN : plus de conversion à la volée (lente au premier affichage, sur téléphone surtout).
// Le manifeste src/app/_landing/illustrations.json garde les dimensions et un aperçu flou de 10 px (≈ 100 octets)
// affiché pendant le chargement (images opaques seulement).
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'illustrations';
const OUT = 'public/illustrations';
/** Doit rester égal à WIDTHS dans src/app/_landing/image-url.ts. */
const WIDTHS = [160, 384, 640, 960, 1250];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const manifest = {};
let total = 0;
for (const file of readdirSync(SRC).filter((f) => f.endsWith('.png')).sort()) {
  const name = file.replace(/\.png$/, '');
  const src = sharp(join(SRC, file));
  const { width, height } = await src.metadata();
  for (const w of WIDTHS) {
    const img = src.clone().resize({ width: Math.min(w, width) });
    const avif = await img.clone().avif({ quality: 50, effort: 6 }).toBuffer();
    const webp = await img.clone().webp({ quality: 72, effort: 6, smartSubsample: true }).toBuffer();
    writeFileSync(join(OUT, `${name}-${w}.avif`), avif);
    writeFileSync(join(OUT, `${name}-${w}.webp`), webp);
    total += avif.length + webp.length;
  }
  // Pas d'aperçu flou sous une image transparente : il resterait visible derrière elle.
  const { isOpaque } = await src.stats();
  const lqip = isOpaque ? await src.clone().resize({ width: 10 }).webp({ quality: 40 }).toBuffer() : null;
  manifest[name] = { w: width, h: height, ...(lqip ? { lqip: `data:image/webp;base64,${lqip.toString('base64')}` } : {}) };
  console.log(`${name} ${width}×${height}`);
}
writeFileSync('src/app/_landing/illustrations.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} illustrations, ${(total / 1024 / 1024).toFixed(1)} Mo générés dans ${OUT}/`);
