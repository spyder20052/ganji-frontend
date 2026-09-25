import { cookies } from 'next/headers';
import { cache } from 'react';
import { AREAS_BY_LOCALE, allMessages } from './dicts';
import type { Area } from './en';
import { isLocale, LOCALE_COOKIE, translate, type Locale, type Messages, type T } from './translate';

/** Langue de l'interface : choix de la personne (Réglages), français par défaut. */
export const getLocale = cache(async (): Promise<Locale> => {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : 'fr';
});

/** Traducteur pour les composants serveur : const t = await getT(); t('Ouvrir mon carnet'). */
export async function getT(): Promise<T> {
  const messages = allMessages(await getLocale());
  return (fr, vars) => translate(messages, fr, vars);
}

/** Messages des composants clients d'un domaine ; vides en français (aucun octet de plus). */
export async function clientMessages(area: Area): Promise<Messages> {
  const locale = await getLocale();
  return locale === 'fr' ? {} : AREAS_BY_LOCALE[locale][area];
}
