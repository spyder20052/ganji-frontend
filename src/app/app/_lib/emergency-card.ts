import type { Summary } from '@/lib/types';

/**
 * Carte d'urgence minimale gardée sur le téléphone (localStorage, en clair) :
 * uniquement ce que le patient accepte de montrer aux secours, jamais de pathologie.
 */
export interface EmergencyCard {
  firstName: string;
  lastNameInitial: string;
  age: number;
  bloodGroup: string | null;
  allergies: string[];
  treatments: string | null;
  emergencyContact: { name: string; phone: string | null } | null;
  qrToken: string | null;
  savedAt: string;
}

export const CARD_KEY = 'alafia-emergency-card';

export function cardFromSummary(s: Summary): EmergencyCard {
  return {
    firstName: s.firstName,
    lastNameInitial: s.lastName.charAt(0),
    age: s.age,
    bloodGroup: s.bloodGroup,
    allergies: s.allergies,
    treatments: s.treatments,
    emergencyContact: s.emergencyContact,
    qrToken: s.qrToken ?? null,
    savedAt: new Date().toISOString(),
  };
}

export function readCard(): EmergencyCard | null {
  try {
    const raw = localStorage.getItem(CARD_KEY);
    return raw ? (JSON.parse(raw) as EmergencyCard) : null;
  } catch {
    return null;
  }
}

export function saveCard(card: EmergencyCard) {
  try {
    localStorage.setItem(CARD_KEY, JSON.stringify(card));
    return true;
  } catch {
    return false;
  }
}
