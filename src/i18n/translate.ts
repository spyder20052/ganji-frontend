/**
 * Traduction de l'interface (français, anglais). La clé est la phrase française elle-même : le code
 * reste lisible, et une phrase sans traduction s'affiche en français plutôt que de disparaître.
 * Variables : « Bonjour {prenom} » avec { prenom: 'Koffi' }, dans les deux langues.
 */
export type Locale = 'fr' | 'en';
export type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;
export type T = (fr: string, vars?: Vars) => string;

export const LOCALE_COOKIE = 'ganji-lang';
/** Balise de langue pour Intl (dates, nombres) et la synthèse vocale. */
export const INTL: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB' };

export function translate(messages: Messages, fr: string, vars?: Vars): string {
  const s = messages[fr] ?? fr;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
