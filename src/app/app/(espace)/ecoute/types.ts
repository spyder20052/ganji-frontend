/** Types de l'écoute psychologique (réponses de /me/listen et /listen). */
export type Author = 'PERSONNE' | 'ECOUTANT' | 'SYSTEME';
/** Nature d'un message automatique : « safety » = consigne de sécurité (mots de détresse détectés par l'API). */
export type SystemKind = 'welcome' | 'safety' | 'joined' | 'callback' | 'closedByPerson' | 'closedByCounselor' | 'info';

export interface ListenMessage {
  id: string;
  author: Author;
  body: string;
  at: string;
  system?: SystemKind;
}

export interface ListenThread {
  id: string;
  status: 'OUVERT' | 'EN_COURS' | 'CLOS';
  anonymous: boolean;
  urgent: boolean;
  counselorName: string | null;
  callback: { at: string; phone: string | null } | null;
  createdAt: string;
  updatedAt: string;
  messages: ListenMessage[];
}

export interface ListenThreadSummary {
  id: string;
  status: ListenThread['status'];
  anonymous: boolean;
  counselorName: string | null;
  createdAt: string;
  updatedAt: string;
  last: { author: Author; body: string; at: string } | null;
}

/** Vue de l'écoutante : « name » vaut null pour une personne anonyme. */
export interface CounselorThread extends ListenThread {
  name: string | null;
  mine: boolean;
}

export interface QueueItem {
  id: string;
  status: ListenThread['status'];
  urgent: boolean;
  anonymous: boolean;
  name: string | null;
  mine: boolean;
  createdAt: string;
  updatedAt: string;
  waiting: boolean;
  last: { author: Author; body: string; at: string } | null;
  callback: { at: string; phone: string | null } | null;
}

export interface ListenQueue {
  counselor: string;
  counts: { urgent: number; open: number; mine: number };
  items: QueueItem[];
}

/** Moments proposés pour être rappelé, calculés à l'heure du Bénin (UTC+1, sans heure d'été). */
export function callbackMoments(now = new Date()): { key: string; label: string; at: Date }[] {
  const H = 3_600_000;
  const local = new Date(now.getTime() + H);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - H;
  const evening = new Date(day + 18 * H);
  const tomorrow = new Date(day + 24 * H + 9 * H);
  return [
    { key: 'now', label: 'Dès que possible', at: now },
    ...(evening.getTime() > now.getTime() + H ? [{ key: 'evening', label: 'Ce soir, 18 h', at: evening }] : []),
    { key: 'tomorrow', label: 'Demain matin, 9 h', at: tomorrow },
  ];
}
