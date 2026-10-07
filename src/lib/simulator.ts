'use client';
/**
 * Simulateur de téléphone (démo). L'API ne montre les SMS d'un vrai carnet qu'au navigateur qui l'a créé :
 * la clé remise à l'inscription est gardée ici, par numéro, et envoyée dans l'en-tête `x-ganji-simulator`.
 * Les téléphones de démonstration (personas, donneurs simulés) n'en ont pas besoin.
 */
export const SIMULATOR_HEADER = 'x-ganji-simulator';
const PREFIX = 'ganji-sim:';

/** Même normalisation que l'API : chiffres seuls, sans l'indicatif 229, « 01 » devant un numéro à 8 chiffres. */
export function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  const local = digits.startsWith('229') ? digits.slice(3) : digits;
  return local.length === 8 ? `01${local}` : local;
}

export function rememberSimulatorKey(phone: string, key: string) {
  try { localStorage.setItem(PREFIX + normalizePhone(phone), key); } catch {}
}

export function simulatorKeyFor(phone: string): string | null {
  try { return localStorage.getItem(PREFIX + normalizePhone(phone)); } catch { return null; }
}

/** En-têtes à joindre aux appels du simulateur pour ce numéro (vide pour un téléphone de démonstration). */
export function simulatorHeaders(phone: string): Record<string, string> {
  const key = simulatorKeyFor(phone);
  return key ? { [SIMULATOR_HEADER]: key } : {};
}
