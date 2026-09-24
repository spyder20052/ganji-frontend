/** Formes de réponse de l'API propres aux espaces professionnels. */

export interface MyPatient {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  bloodGroup: string | null;
  age: number;
  commune: string | null;
  via: 'CARE_TEAM' | 'CONSENT' | 'BREAK_GLASS';
  expiresAt: string | null;
}

export interface TeleItem {
  id: string;
  patientId: string;
  patient: string;
  specialty: string;
  question: string;
  urgency: 'NORMALE' | 'URGENTE';
  status: 'EN_ATTENTE' | 'REPONDUE';
  requester: string;
  site: string | null;
  attachments: number;
  answer: string | null;
  answeredBy: string | null;
  createdAt: string;
  answeredAt: string | null;
  mine: boolean;
  hoursWaiting: number;
}

export interface TeleDetail {
  id: string;
  patientId: string;
  requesterId: string;
  requesterName: string;
  requesterSite: string | null;
  specialty: string;
  question: string;
  attachments: string[];
  urgency: string;
  status: string;
  answer: string | null;
  answeredByName: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export interface StockCheck {
  compatibleGroups: string[];
  nearbyUnits: number;
  sites: { site: string; distanceKm: number; units: number; groups?: string[] }[];
}

/** Ce que l'écran de création laisse à l'écran de suivi (sessionStorage `blood-<id>`). */
export interface BloodCreateMemo {
  stockCheck: StockCheck;
  autoAlerted?: number;
}

export interface MedicationHit {
  id: string;
  dci: string;
  form: string;
  strength: string;
  category: string | null;
  pharmaciesInStock: number;
  minPriceFcfa: number | null;
}

export interface PrescriptionItem {
  medicationId: string;
  dci: string;
  form: string;
  strength: string;
  dosage: string;
  duration: string;
  quantity: number;
}

export interface PrescriptionView {
  id: string;
  status: string;
  statusLabel: string;
  items: PrescriptionItem[];
  prescriber: string;
  issuedAt: string;
  expiresAt: string;
  qrPayload?: string;
}
