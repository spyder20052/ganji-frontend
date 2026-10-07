/** Formes de réponse de l'API propres au don de sang (espace patient et aidant). */

export interface DonorView {
  id: string;
  firstName: string;
  bloodGroup: string;
  sex: 'F' | 'M' | string;
  city: string;
  communeId: string | null;
  available: boolean;
  hasSmartphone: boolean;
  lang: string;
  donations: number;
  lastDonationAt: string | null;
  since: string;
  eligible: boolean;
  reason: 'REST' | 'TOO_YOUNG' | 'TOO_OLD' | 'WEIGHT' | 'PREGNANCY' | 'CONDITION' | null;
  nextDate: string | null;
  age: number | null;
}

/** GET /blood/donor/me */
export interface DonorMe {
  donor: DonorView | null;
  prefill: {
    bloodGroup: string | null;
    communeId: string | null;
    commune: string | null;
    sex: string | null;
    age: number | null;
    hasProfile: boolean;
    hasPhone: boolean;
    lang: string;
    contraindication: 'PREGNANCY' | 'CONDITION' | null;
  };
  rules: { restDays: Record<string, number>; minAge: number; maxAge: number; nearbyKm: number };
}

/** GET /blood/nearby : demandes anonymes (aucune identité de patient). */
export interface NearbyRequest {
  id: string;
  facility: string;
  product: string;
  productLabel: string;
  bloodGroup: string;
  urgency: string;
  neededBy: string;
  distanceKm: number;
  missing: number;
}

export interface DonorAlerts {
  donor: { firstName: string; bloodGroup: string; donations: number; lastDonationAt: string | null; canDonate: boolean; nextDate: string | null; available: boolean } | null;
  alerts: {
    id: string;
    status: 'ENVOYEE' | 'ACCEPTEE' | 'REFUSEE' | 'EXPIREE' | string;
    volunteer: boolean;
    distanceKm: number;
    appointment: string | null;
    place: string;
    product: string;
    urgency: string;
    neededBy: string;
    requestStatus: string;
  }[];
}

/** Départements et communes (GET /geo/departments), pour choisir sa commune. */
export interface Department {
  code: string;
  name: string;
  communes: { id: string; name: string }[];
}

export interface VolunteerResult {
  status: string;
  appointment?: string | null;
  place?: string;
}
