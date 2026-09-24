import { fmtDate, fmtTime } from '@/lib/format';

/** Ce que l'on peut partager avec un soignant (M1). */
export const SCOPE_LABEL: Record<string, string> = {
  summary: 'Fiche vitale',
  timeline: 'Chronologie des soins',
  observations: 'Résultats d’analyses',
  documents: 'Documents',
  prescriptions: 'Ordonnances',
  sensitive: 'Données très sensibles',
  reminders: 'Rappels',
  blood: 'Demandes de sang',
  all: 'Tout (sauf données très sensibles)',
};

export const REMINDER_ICON: Record<string, string> = {
  MEDICATION: 'pill',
  APPOINTMENT: 'calendar',
  LAB: 'stethoscope',
  CPN: 'pregnant',
  VACCINE: 'vaccine',
  DONATION: 'blood',
};

export const TIMELINE_ICON: Record<string, string> = {
  CONSULTATION: 'stethoscope',
  HOSPITALISATION: 'hospital',
  TRANSFUSION: 'blood',
  CHIMIOTHERAPIE: 'heart',
  URGENCE: 'emergency',
  CPN: 'pregnant',
  VACCINATION: 'vaccine',
  TELE_EXPERTISE: 'chat',
  ORDONNANCE: 'pill',
};

/** « 12/10 à 14 h 05 » : lisible à voix haute. */
export function dayAndHour(d: string | Date) {
  const [h, m] = fmtTime(d).split(':');
  return `${fmtDate(d, { day: '2-digit', month: '2-digit' })} à ${Number(h)} h${m && m !== '00' ? ` ${m}` : ''}`;
}

export function hourOnly(d: string | Date) {
  const [h, m] = fmtTime(d).split(':');
  return `${Number(h)} h ${m}`;
}

/** Ressource du journal → groupe nominal lisible (« vos résultats d'analyses »). */
const RESOURCE_PHRASE: Record<string, string> = {
  'Fiche vitale': 'votre fiche vitale',
  'Chronologie de soins': 'votre chronologie de soins',
  'Résultats d\'analyses': 'vos résultats d’analyses',
  Documents: 'vos documents',
  'Ouverture de document': 'un de vos documents',
  Ordonnances: 'vos ordonnances',
  'Plan de soins': 'votre plan de soins',
  'Suivi de grossesse': 'votre suivi de grossesse',
  Enfants: 'le carnet de vos enfants',
  'Carnet de vaccination': 'un carnet de vaccination',
  "Journal d'accès": 'votre journal d’accès',
  "Carte d'urgence": 'votre carte d’urgence',
  'Dossier (accès en urgence)': 'votre dossier',
};

export function resourcePhrase(r: string) {
  return RESOURCE_PHRASE[r] ?? `« ${r.charAt(0).toLowerCase()}${r.slice(1)} »`;
}

export interface AccessLogEntry {
  id: string;
  at: string;
  who: string;
  role: string | null;
  action: string;
  resource: string;
  reason: string | null;
  allowed: boolean;
}

export type LogTone = 'normal' | 'denied' | 'breakglass' | 'self';

/** Transforme une ligne du journal d'audit en phrase simple, au présent du patient. */
export function logSentence(e: AccessLogEntry, myName: string): { text: string; tone: LogTone } {
  const who = e.who === myName ? 'Vous' : e.who;
  const when = dayAndHour(e.at);
  const what = resourcePhrase(e.resource);
  switch (e.action) {
    case 'READ':
      return { text: `${who} a consulté ${what} le ${when}.`, tone: 'normal' };
    case 'READ_BREAK_GLASS':
      return { text: `${who} a consulté ${what} le ${when}, en accès d’urgence.`, tone: 'breakglass' };
    case 'BREAK_GLASS':
      return { text: `Accès d’urgence : ${who} a ouvert votre dossier le ${when}.${e.reason ? ` Motif donné : « ${e.reason} ».` : ''}`, tone: 'breakglass' };
    case 'DENIED':
      return { text: `Tentative refusée : ${who} n’avait pas votre accord (${what}), le ${when}.`, tone: 'denied' };
    case 'WRITE':
      return { text: `${who} a ajouté à votre carnet : ${e.resource.charAt(0).toLowerCase()}${e.resource.slice(1)}, le ${when}.`, tone: who === 'Vous' ? 'self' : 'normal' };
    case 'CONSENT_OFFER':
      return { text: `Vous avez préparé un QR de partage le ${when}${e.reason ? ` (${e.reason})` : ''}.`, tone: 'self' };
    case 'CONSENT_GRANT':
      return e.role === 'PATIENT' || who === 'Vous'
        ? { text: `Vous avez donné un accès le ${when} : ${e.resource}.`, tone: 'self' }
        : { text: `${who} a scanné votre QR le ${when}${e.reason ? ` : ${e.reason.toLowerCase()}` : ''}.`, tone: 'normal' };
    case 'CONSENT_REVOKE':
      return { text: `${who === 'Vous' ? 'Vous avez' : `${who} a`} retiré un accès le ${when} (${e.resource}).`, tone: 'self' };
    case 'EMERGENCY_CARD':
      return { text: `Votre carte d’urgence a été scannée le ${when}${e.who !== 'Système' ? ` par ${who}` : ''}.`, tone: 'normal' };
    case 'SOS':
      return { text: `Alerte SOS envoyée le ${when}${e.reason ? ` : ${e.reason}` : ''}.`, tone: 'self' };
    case 'SYMPTOM_ALERT':
      return { text: `Signe d’alerte transmis à votre équipe le ${when}.`, tone: 'self' };
    case 'DONOR_FOUND':
      return { text: `Un donneur de sang a répondu oui le ${when}.`, tone: 'normal' };
    case 'PROOF_CHECK':
      return { text: `Une preuve de vaccination a été vérifiée le ${when}.`, tone: 'normal' };
    default:
      return { text: `${who} · ${e.resource} · ${when}`, tone: 'normal' };
  }
}
