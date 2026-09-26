import type { BloodRequestView } from '@/lib/types';

/** Qui a été prévenu d'une demande (GET /blood/requests/:id → dispatch). */
export interface Dispatch {
  donorsAlerted: number;
  byChannel: Record<string, number>;
  volunteers: number;
  radiusKm: number | null;
  antsNotified: number;
  stockNearby: { site: string; distanceKm: number; units: number }[];
  nearbyUnits: number | null;
  /** Seulement à la création : donneurs alertés à l'instant, rayon élargi ou non. */
  donorsJustAlerted?: number;
  widened?: boolean;
}

export type LiveDonor = NonNullable<BloodRequestView['donors']>[number] & { volunteer?: boolean; phone?: string };

/** Demande suivie en direct, avec la couverture (donneurs + poches réservées) et les destinataires. */
export type LiveRequest = Omit<BloodRequestView, 'donors' | 'counts'> & {
  counts: BloodRequestView['counts'] & { volunteers?: number };
  donors?: LiveDonor[];
  compatibleGroups?: string[];
  coverage?: { quantity: number; accepted: number; reserved: number; covered: number; missing: number; complete: boolean };
  reserved?: { units: number; site: string | null } | null;
  dispatch?: Dispatch;
};

/** Réponse de POST /blood/requests/:id/alert-donors. */
export interface AlertResult {
  alerted: number;
  radiusKm: number | null;
  widened: boolean;
  byChannel: Record<string, number>;
}
