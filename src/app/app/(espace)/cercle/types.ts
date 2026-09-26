/** Réponse de GET /me/circle. */
export type Channel = 'APP' | 'SMS';

export type CircleMember =
  | { type: 'CAREGIVER'; id: string; name: string; relation: string; escalations: boolean; fullAccess: boolean; channels: Channel[] }
  | { type: 'RELAY'; id: string; name: string; local: boolean; channels: Channel[] }
  | { type: 'CARE_TEAM'; id: string; name: string; role: string; facility: string | null; channels: Channel[] };

export type ReminderState = 'FAIT' | 'SANS_REPONSE' | 'A_FAIRE' | 'A_VENIR';

export interface TodayReminder {
  id: string;
  kind: string;
  title: string;
  place: string | null;
  dueAt: string;
  confirmedAt: string | null;
  escalation: number;
  state: ReminderState;
  canConfirm: boolean;
}

export interface CircleEvent {
  id: string;
  type: 'CONFIRMED' | 'MISSED' | 'VISIT_PLANNED' | 'VISIT_DONE' | 'VISIT_CANCELLED';
  at: string;
  title?: string;
  kind?: string;
  people?: { name: string; channels: Channel[] }[];
  relayName?: string | null;
  dueAt?: string;
  note?: string | null;
}

export interface Circle {
  patient: { id: string; firstName: string; commune: string | null };
  viewer: 'OWNER' | 'CAREGIVER';
  canEdit: boolean;
  patientChannels: Channel[];
  rules: { caregiversAfterHours: number; relayAfterHours: number };
  members: CircleMember[];
  today: TodayReminder[];
  events: CircleEvent[];
}
