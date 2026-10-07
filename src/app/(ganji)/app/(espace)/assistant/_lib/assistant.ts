/** Types propres à l'assistant de traitement (réponses de /me/assistant/*). */

export type DoseStatus = 'PRISE' | 'OUBLIEE' | 'DECALEE' | 'A_PRENDRE' | 'EN_RETARD' | 'A_VENIR';
export type Meal = 'AVANT' | 'PENDANT' | 'APRES' | 'A_JEUN';

export interface Dose {
  reminderId: string;
  prescriptionId: string | null;
  dueAt: string;
  time: string;
  /** Sans accès aux ordonnances (aidant « rappels » seul) : « Prise de traitement », sans nom ni dosage. */
  masked: boolean;
  medication: string;
  strength: string | null;
  form: string | null;
  dose: string | null;
  meal: Meal | null;
  status: DoseStatus;
  loggedAt: string | null;
}

export interface Today {
  date: string;
  doses: Dose[];
  done: number;
  tomorrow: Dose | null;
}

export interface Rate {
  due: number;
  taken: number;
  rate: number | null;
}

export interface Adherence {
  last7: Rate;
  last30: Rate;
  days: (Rate & { date: string })[];
}

export interface PlanItem {
  dci: string;
  strength: string;
  form: string;
  dosage: string;
  duration: string;
  times: string[];
  perDay: number;
  everyDays: number;
  dose: string | null;
  meal: Meal | null;
  asNeeded: boolean;
  understood: boolean;
  until: string | null;
}

export interface PlanRx {
  id: string;
  prescriber: string;
  issuedAt: string;
  status: 'ACTIVE' | 'DISPENSED';
  items: PlanItem[];
  plan: { active: boolean; upcoming: number; until: string | null; replacedBy: { id: string; issuedAt: string | null } | null };
}

export interface AskAnswer {
  question: string;
  intent: string;
  urgent: boolean;
  lines: { medication?: string; text: string }[];
  answer: string;
  sources: { kind: 'ORDONNANCE' | 'FICHE' | 'CONSIGNE'; label: string }[];
  safety: string;
}

/** Repas, en mots de tous les jours (clés de traduction). */
export const MEAL_LABEL: Record<Meal, string> = {
  AVANT: 'avant le repas',
  PENDANT: 'pendant le repas',
  APRES: 'après le repas',
  A_JEUN: 'à jeun',
};

/** Moment de la journée d'une heure « HH:MM » : pictogramme soleil, couchant ou lune. */
export function momentOf(time: string): 'MATIN' | 'MIDI' | 'SOIR' | 'NUIT' {
  const h = Number(time.slice(0, 2));
  if (h >= 5 && h < 11) return 'MATIN';
  if (h >= 11 && h < 17) return 'MIDI';
  if (h >= 17 && h < 21) return 'SOIR';
  return 'NUIT';
}

/** Une prise se renseigne jusqu'à 3 h avant l'heure prévue (règle de l'API). */
export const EARLY_MS = 3 * 3600_000;
