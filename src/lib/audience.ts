/**
 * Mesure d'audience anonyme : combien de personnes ouvrent le site, et quelles pages elles parcourent.
 *
 * Ce que l'on envoie : un identifiant aléatoire de navigateur (localStorage), un identifiant de session
 * (sessionStorage), le chemin de la page sans aucun identifiant, le type d'appareil, la langue de l'interface
 * et, à l'entrée seulement, le site de provenance. Ni cookie, ni adresse IP, ni agent utilisateur, ni donnée
 * de santé : rien qui permette de retrouver une personne. Les chiffres se lisent en local (tools/audience.mjs).
 */
import { isLocale, type Locale } from '@/i18n/translate';
import { UUID_RE } from './validate';

export const AUDIENCE_ENDPOINT = '/audience';
export const VISITOR_KEY = 'ganji-visiteur';
export const SESSION_KEY = 'ganji-session';

export type Device = 'mobile' | 'tablette' | 'ordinateur';

/** Charge utile envoyée par le navigateur (clés courtes : la requête part en balise, en 2G aussi). */
export interface Beacon {
  v: string; // identifiant de navigateur
  s: string; // identifiant de session
  p: string; // chemin de la page, déjà sans identifiant
  d: 'm' | 't' | 'd'; // appareil
  l?: string; // langue de l'interface
  r?: string; // provenance (première page de la session seulement)
}

/** Le site lui-même et ses prévisualisations : une arrivée depuis l'un d'eux n'est pas une provenance. */
const OWN_HOSTS = [/(^|\.)ganji-sante\.vercel\.app$/, /^ganji-sante-[a-z0-9-]+\.vercel\.app$/, /^ganji-[a-z0-9]+-spynels-projects\.vercel\.app$/];

const TOKEN = /^[A-Za-z0-9_-]{16,}$/;
const DIGITS = /\d{4,}/;

/**
 * Chemin sans identifiant : « /pro/patients/3f2a…/ » devient « /pro/patients/:id », « /urgence/<jeton> »
 * devient « /urgence/:id ». La requête et l'ancre sont retirées. Un chemin inattendu devient « autre ».
 */
export function cleanPath(raw: string | null | undefined): string {
  const path = String(raw ?? '/').split(/[?#]/)[0].trim();
  if (!path.startsWith('/')) return 'autre';
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((seg) => (UUID_RE.test(seg) || TOKEN.test(seg) || DIGITS.test(seg) ? ':id' : seg.toLowerCase()));
  const out = `/${parts.join('/')}`;
  return /^\/[a-z0-9/_:.()-]{0,79}$/.test(out) ? out : 'autre';
}

export function deviceClass(width: number): Beacon['d'] {
  return width < 700 ? 'm' : width < 1100 ? 't' : 'd';
}

export const DEVICE_NAME: Record<Beacon['d'], Device> = { m: 'mobile', t: 'tablette', d: 'ordinateur' };

/** Nom de domaine de la provenance, ou « direct » (arrivée directe, adresse tapée, favori, site lui-même). */
export function sourceOf(referrer: unknown): string {
  if (typeof referrer !== 'string' || !referrer) return 'direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
    if (!host || OWN_HOSTS.some((re) => re.test(host))) return 'direct';
    return /^[a-z0-9.-]{3,60}$/.test(host) ? host : 'direct';
  } catch {
    return 'direct';
  }
}

export const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{10,24}$/.test(v);

export function localeOf(v: unknown): Locale | 'autre' {
  return isLocale(v) ? v : 'autre';
}

/** Vrai en développement et pour les essais locaux : ces visites ne sont pas comptées. */
export function isLocalHost(hostname: string): boolean {
  return /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/.test(hostname) || hostname.endsWith('.local');
}

/** Identifiant aléatoire court, sans rien de personnel. */
export function newId(): string {
  const raw = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Math.random()}${Date.now()}`;
  return raw.replace(/[^a-z0-9]/gi, '').slice(0, 20).toLowerCase();
}
