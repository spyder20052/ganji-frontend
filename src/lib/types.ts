export type Role = 'PATIENT' | 'CAREGIVER' | 'PRACTITIONER' | 'NURSE' | 'PHARMACIST' | 'BLOOD_BANK' | 'RELAY' | 'MINISTRY' | 'ADMIN';

export interface Me {
  id: string;
  role: Role;
  displayName: string;
  lang: string;
  simpleMode: boolean;
  npiLast4: string | null;
  phone: string | null;
  demoPersona: string | null;
  patientId: string | null;
  facilityId: string | null;
  practitioner: { title: string; specialty: string; verifiedAt: string | null; facility: { id: string; name: string; shortName: string | null } | null } | null;
  delegations: { relation: string; scopes: string[]; patient: { id: string; firstName: string; lastName: string } }[];
}

export interface Summary {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  birthDate: string;
  sex: string;
  bloodGroup: string | null;
  allergies: string[];
  treatments: string | null;
  conditions: { id: string; code: string | null; label: string | null; since: string | null }[];
  hiddenSensitive: boolean;
  emergencyContact: { name: string; phone: string | null } | null;
  commune: string | null;
  department: string | null;
  qrToken?: string;
  nextReminders: { id: string; kind: string; title: string; dueAt: string; place: string | null }[];
  careTeam: { role: string; name: string; specialty: string; facility?: string | null }[];
  pregnancy: { id: string; edd: string } | null;
  children: { id: string; firstName: string; age: number }[];
  discreetMode: boolean;
  access: { via: string; expiresAt: string | null };
}

export interface TimelineItem {
  id: string;
  kind: string;
  date: string;
  title: string;
  place: string | null;
  author: string | null;
  detail: string | null;
}

export interface Series {
  code: string;
  label: string;
  unit: string;
  refLow?: number | null;
  refHigh?: number | null;
  points: { date: string; value: number }[];
}

export interface Facility {
  id: string;
  name: string;
  shortName: string | null;
  type: string;
  lat: number;
  lng: number;
  services: string[];
  open24h: boolean;
  onDuty: boolean;
  commune: string | { name: string; departmentCode?: string };
  distanceKm?: number;
}

export interface BloodRequestView {
  id: string;
  product: string;
  productLabel: string;
  bloodGroup: string;
  quantity: number;
  urgency: string;
  status: string;
  neededBy: string;
  createdAt: string;
  requester: string;
  facility: string;
  patient: string;
  counts: { alerted: number; accepted: number; declined: number; waiting: number };
  donors?: { id: string; firstName: string; bloodGroup: string; city: string; distanceKm: number; channel: string; status: string; appointment: string | null }[];
  stockCheck?: { compatibleGroups: string[]; nearbyUnits: number; sites: { site: string; distanceKm: number; units: number }[] };
}

export const ROLE_HOME: Record<Role, string> = {
  PATIENT: '/app',
  CAREGIVER: '/app',
  PRACTITIONER: '/pro',
  NURSE: '/pro',
  PHARMACIST: '/pharmacie',
  BLOOD_BANK: '/ants',
  RELAY: '/relais',
  MINISTRY: '/ministere',
  ADMIN: '/ministere',
};

export const ROLE_LABEL: Record<Role, string> = {
  PATIENT: 'Patient',
  CAREGIVER: 'Aidant',
  PRACTITIONER: 'Médecin',
  NURSE: 'Infirmier·ère',
  PHARMACIST: 'Pharmacien',
  BLOOD_BANK: 'Banque de sang',
  RELAY: 'Relais communautaire',
  MINISTRY: 'Ministère',
  ADMIN: 'Contrôleur',
};
