import { api } from '@/lib/api';
import type { Summary } from '@/lib/types';
import { LOCALE_COOKIE, type Locale } from '@/i18n/translate';
import { cardFromSummary, saveCard } from './emergency-card';

/** Profil de la personne connectée (GET /me/profile). */
export interface Profile {
  account: { displayName: string; phone: string | null; lang: Locale; role: string };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    sex: 'F' | 'M';
    commune: string | null;
    department: string | null;
    quartier: string;
    repere: string;
    bloodGroup: string | null;
    bloodGroupSource: 'DECLARE' | 'VERIFIE' | null;
    allergies: string[];
    treatments: string;
    conditions: { id: string; label: string; sensitive: boolean; declared: boolean }[];
    emergencyName: string;
    emergencyPhone: string;
    profileDoneAt: string | null;
    missing: ('bloodGroup' | 'emergencyContact' | 'commune' | 'allergies')[];
  } | null;
}

export type ProfilePatch = Partial<{
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: 'F' | 'M';
  commune: string | null;
  quartier: string;
  repere: string;
  lang: Locale;
  bloodGroup: string | null;
  allergies: string[];
  treatments: string;
  emergencyName: string;
  emergencyPhone: string;
  conditionsAdd: string[];
  conditionsRemove: string[];
}>;

/**
 * Enregistre un bloc du profil, puis met à jour la carte d'urgence gardée sur le téléphone :
 * elle montre tout de suite le nouveau groupe, les allergies et la personne à prévenir, même hors ligne.
 */
export async function saveProfile(patch: ProfilePatch): Promise<Profile> {
  const p = await api<Profile>('/me/profile', { method: 'PATCH', json: patch });
  if (p.patient) {
    api<Summary>('/me/summary')
      .then((s) => saveCard(cardFromSummary(s)))
      .catch(() => undefined);
  }
  return p;
}

/** Langue de l'interface (cookie lu par le serveur) et des SMS (compte). Recharger la page pour l'appliquer. */
export async function saveLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  await api('/me/lang', { method: 'POST', json: { lang: l } }).catch(() => undefined);
}

/** Langue de la voix (bouton Écouter) : même réglage que le menu d'affichage (ganji-prefs). */
export const VOICES = [
  { value: '', label: 'Comme l’interface' },
  { value: 'fon', label: 'Fon (Fɔngbè)' },
  { value: 'yoruba', label: 'Yoruba' },
  { value: 'bariba', label: 'Bariba (Baatonum)' },
  { value: 'dendi', label: 'Dendi' },
] as const;

export function readVoice(): string {
  try {
    return (JSON.parse(localStorage.getItem('ganji-prefs') || '{}') as { voice?: string }).voice ?? '';
  } catch {
    return '';
  }
}

export function saveVoice(voice: string) {
  try {
    const prefs = JSON.parse(localStorage.getItem('ganji-prefs') || '{}') as Record<string, unknown>;
    if (voice) prefs.voice = voice;
    else delete prefs.voice;
    localStorage.setItem('ganji-prefs', JSON.stringify(prefs));
  } catch {
    /* stockage indisponible : la voix suit l'interface */
  }
  if (voice) document.documentElement.dataset.voice = voice;
  else delete document.documentElement.dataset.voice;
  window.dispatchEvent(new Event('ganji-prefs'));
}

/** Suggestions (un toucher suffit), en français : traduites à l'affichage, enregistrées telles quelles. */
export const ALLERGY_SUGGESTIONS = ['Pénicilline', 'Aspirine', 'Arachide', 'Fruits de mer', 'Sulfamides', 'Iode'];
export const CONDITION_SUGGESTIONS = ['Hypertension', 'Diabète', 'Drépanocytose', 'Asthme', 'Épilepsie'];
export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
