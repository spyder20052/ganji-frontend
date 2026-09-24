// Vérifie le budget de poids : JavaScript initial de l'accueil < 100 Ko compressé (cahier des charges §7).
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const manifestPath = '.next/app-build-manifest.json';
if (!existsSync(manifestPath)) {
  console.error('Lancer `npm run build` avant ce contrôle.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const files = new Set([...(manifest.pages['/page'] ?? []), ...(manifest.pages['/layout'] ?? [])].filter((f) => f.endsWith('.js')));
let total = 0;
for (const f of files) total += gzipSync(readFileSync(join('.next', f))).length;
const kb = (total / 1024).toFixed(1);
console.log(`JavaScript initial de l'accueil : ${kb} Ko (gzip), ${files.size} fichiers`);
if (total > 100 * 1024) {
  console.error('Budget dépassé (100 Ko).');
  process.exit(1);
}
