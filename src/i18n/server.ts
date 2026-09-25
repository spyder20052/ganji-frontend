import { cookies } from 'next/headers';
import { cache } from 'react';
import { EN, EN_AREAS, type Area } from './en';
import { LOCALE_COOKIE, translate, type Locale, type Messages, type T } from './translate';

/** Langue de l'interface : choix de la personne (Réglages), français par défaut. */
export const getLocale = cache(async (): Promise<Locale> => ((await cookies()).get(LOCALE_COOKIE)?.value === 'en' ? 'en' : 'fr'));

/** Traducteur pour les composants serveur : const t = await getT(); t('Ouvrir mon carnet'). */
export async function getT(): Promise<T> {
  const messages: Messages = (await getLocale()) === 'en' ? EN : {};
  return (fr, vars) => translate(messages, fr, vars);
}

/** Messages des composants clients d'un domaine ; vides en français (aucun octet de plus). */
export async function clientMessages(area: Area): Promise<Messages> {
  return (await getLocale()) === 'en' ? EN_AREAS[area] : {};
}
