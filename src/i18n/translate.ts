/**
 * Traduction de l'interface : français, anglais et quatre langues nationales du Bénin (fon, yoruba,
 * bariba, dendi). La clé est la phrase française elle-même : le code reste lisible, et une phrase sans
 * traduction s'affiche en français (langue officielle) plutôt que de disparaître.
 * Variables : « Bonjour {prenom} » avec { prenom: 'Koffi' }, dans toutes les langues.
 */
export const LOCALES = ['fr', 'en', 'fon', 'yo', 'bba', 'ddn'] as const;
export type Locale = (typeof LOCALES)[number];
export type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;
export type T = (fr: string, vars?: Vars) => string;

export const LOCALE_COOKIE = 'ganji-lang';
export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/** Nom de chaque langue, écrit dans la langue elle-même (on la reconnaît sans lire celle affichée). */
export const LOCALE_NAMES: Record<Locale, string> = { fr: 'Français', en: 'English', fon: 'Fɔngbè', yo: 'Yorùbá', bba: 'Baatɔnum', ddn: 'Dendi' };
/** Langues nationales : traduction à faire valider par des locuteurs natifs (docs/LANGUES.md). */
export const NATIONAL: readonly Locale[] = ['fon', 'yo', 'bba', 'ddn'];

/** Balise de langue pour Intl (dates, nombres). Fon, bariba, dendi : pas de données Intl, dates à la française. */
export const INTL: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', fon: 'fr-FR', yo: 'yo-NG', bba: 'fr-FR', ddn: 'fr-FR' };
/** Attribut lang de la page (lecteurs d'écran, césure). */
export const HTML_LANG: Record<Locale, string> = { fr: 'fr', en: 'en', fon: 'fon', yo: 'yo', bba: 'bba', ddn: 'ddn' };
/** Dossier des messages vocaux (public/audio/<voix>) et langue enregistrée côté API. */
export const VOICE_OF: Record<Locale, string> = { fr: 'fr', en: 'en', fon: 'fon', yo: 'yoruba', bba: 'bariba', ddn: 'dendi' };
/** Heures et distances à la française (« 14 h 05 ») pour toutes les langues sans usage anglais. */
export const frenchStyle = (l: Locale) => INTL[l].startsWith('fr');

export function translate(messages: Messages, fr: string, vars?: Vars): string {
  const s = messages[fr] ?? fr;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
