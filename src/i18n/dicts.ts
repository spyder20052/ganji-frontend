import { EN_AREAS, SERVER_ORDER, type Area } from './en';
import { AREAS as BBA } from './bba';
import { AREAS as DDN } from './ddn';
import { AREAS as FON } from './fon';
import { AREAS as YO } from './yo';
import type { Locale, Messages } from './translate';

/** Dictionnaires par langue et par domaine (le français, langue des clés, n'en a pas besoin). */
export const AREAS_BY_LOCALE: Record<Exclude<Locale, 'fr'>, Record<Area, Messages>> = { en: EN_AREAS, fon: FON, yo: YO, bba: BBA, ddn: DDN };

/** Tout le dictionnaire d'une langue, pour le rendu côté serveur (jamais envoyé au navigateur ; voir SERVER_ORDER). */
const merged = (areas: Record<Area, Messages>) => Object.assign({}, ...SERVER_ORDER.map((a) => areas[a])) as Messages;
const ALL: Partial<Record<Locale, Messages>> = {};
export function allMessages(locale: Locale): Messages {
  if (locale === 'fr') return {};
  return (ALL[locale] ??= merged(AREAS_BY_LOCALE[locale]));
}
