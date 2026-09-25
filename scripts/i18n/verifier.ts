/**
 * Vérifie les dictionnaires des langues : chaque phrase de l'anglais (référence des clés) est traduite,
 * les variables {x} sont conservées à l'identique, aucune traduction n'est vide.
 * Usage : npx jiti scripts/i18n/verifier.ts [fon|yo|bba|ddn] [domaine…]
 */
import { EN_AREAS, type Area } from '../../src/i18n/en';
import { AREAS_BY_LOCALE } from '../../src/i18n/dicts';

const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
const [, , only, ...areas] = process.argv;
const langs = (only ? [only] : ['fon', 'yo', 'bba', 'ddn']) as ('fon' | 'yo' | 'bba' | 'ddn')[];
let bad = 0;
for (const l of langs) {
  for (const a of (areas.length ? areas : Object.keys(EN_AREAS)) as Area[]) {
    const ref = EN_AREAS[a];
    const got = AREAS_BY_LOCALE[l][a] ?? {};
    const keys = Object.keys(ref);
    const missing = keys.filter((k) => !(k in got));
    const wrongVars = keys.filter((k) => k in got && vars(k) !== vars(got[k]));
    const empty = keys.filter((k) => k in got && !got[k].trim());
    const extra = Object.keys(got).filter((k) => !(k in ref));
    const ok = missing.length + wrongVars.length + empty.length === 0;
    if (!ok) bad++;
    console.log(`${l} ${a}: ${keys.length - missing.length}/${keys.length}${ok ? ' OK' : ''}${missing.length ? ` · manquantes ${missing.length}` : ''}${wrongVars.length ? ` · variables ${wrongVars.length} (${wrongVars.slice(0, 3).join(' | ')})` : ''}${empty.length ? ` · vides ${empty.length}` : ''}${extra.length ? ` · en trop ${extra.length}` : ''}`);
  }
}
process.exit(bad ? 1 : 0);
