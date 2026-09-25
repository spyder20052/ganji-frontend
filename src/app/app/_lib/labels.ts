import { translate, type Locale, type T } from '@/i18n/translate';
import { fmtDate, fmtTime } from '@/lib/format';

/** Traducteur par défaut : le français tel quel. */
const FR: T = (fr, vars) => translate({}, fr, vars);

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

/** « 12/10 à 14 h 05 » : lisible à voix haute (en anglais : « 12/10 at 14:05 »). */
export function dayAndHour(d: string | Date, t: T = FR, locale: Locale = 'fr') {
  const [h, m] = fmtTime(d).split(':');
  const time = locale === 'fr' ? `${Number(h)} h${m && m !== '00' ? ` ${m}` : ''}` : fmtTime(d, locale);
  return t('{date} à {time}', { date: fmtDate(d, { day: '2-digit', month: '2-digit' }, locale), time });
}

export function hourOnly(d: string | Date, locale: Locale = 'fr') {
  if (locale !== 'fr') return fmtTime(d, locale);
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

export function resourcePhrase(r: string, t: T = FR) {
  if (RESOURCE_PHRASE[r]) return t(RESOURCE_PHRASE[r]);
  const label = t(r);
  return t('« {label} »', { label: `${label.charAt(0).toLowerCase()}${label.slice(1)}` });
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
export function logSentence(e: AccessLogEntry, myName: string, t: T = FR, locale: Locale = 'fr'): { text: string; tone: LogTone } {
  const self = e.who === myName || e.who === 'Vous';
  const who = e.who === myName ? t('Vous') : e.who;
  const when = dayAndHour(e.at, t, locale);
  const what = resourcePhrase(e.resource, t);
  const resource = t(e.resource);
  switch (e.action) {
    case 'READ':
      return { text: t('{who} a consulté {what} le {when}.', { who, what, when }), tone: 'normal' };
    case 'READ_BREAK_GLASS':
      return { text: t('{who} a consulté {what} le {when}, en accès d’urgence.', { who, what, when }), tone: 'breakglass' };
    case 'BREAK_GLASS':
      return {
        text: `${t('Accès d’urgence : {who} a ouvert votre dossier le {when}.', { who, when })}${e.reason ? ` ${t('Motif donné : « {reason} ».', { reason: e.reason })}` : ''}`,
        tone: 'breakglass',
      };
    case 'DENIED':
      return { text: t('Tentative refusée : {who} n’avait pas votre accord ({what}), le {when}.', { who, what, when }), tone: 'denied' };
    case 'WRITE':
      return { text: t('{who} a ajouté à votre carnet : {what}, le {when}.', { who, what: `${resource.charAt(0).toLowerCase()}${resource.slice(1)}`, when }), tone: self ? 'self' : 'normal' };
    case 'CONSENT_OFFER':
      return {
        text: e.reason
          ? t('Vous avez préparé un QR de partage le {when} ({reason}).', { when, reason: e.reason })
          : t('Vous avez préparé un QR de partage le {when}.', { when }),
        tone: 'self',
      };
    case 'CONSENT_GRANT':
      return e.role === 'PATIENT' || self
        ? { text: t('Vous avez donné un accès le {when} : {what}.', { when, what: resource }), tone: 'self' }
        : {
            text: e.reason
              ? t('{who} a scanné votre QR le {when} : {reason}.', { who, when, reason: e.reason.toLowerCase() })
              : t('{who} a scanné votre QR le {when}.', { who, when }),
            tone: 'normal',
          };
    case 'CONSENT_REVOKE':
      return {
        text: self ? t('Vous avez retiré un accès le {when} ({what}).', { when, what: resource }) : t('{who} a retiré un accès le {when} ({what}).', { who, when, what: resource }),
        tone: 'self',
      };
    case 'EMERGENCY_CARD':
      return {
        text: e.who !== 'Système' ? t('Votre carte d’urgence a été scannée le {when} par {who}.', { when, who }) : t('Votre carte d’urgence a été scannée le {when}.', { when }),
        tone: 'normal',
      };
    case 'SOS':
      return { text: e.reason ? t('Alerte SOS envoyée le {when} : {reason}.', { when, reason: e.reason }) : t('Alerte SOS envoyée le {when}.', { when }), tone: 'self' };
    case 'SYMPTOM_ALERT':
      return { text: t('Signe d’alerte transmis à votre équipe le {when}.', { when }), tone: 'self' };
    case 'DONOR_FOUND':
      return { text: t('Un donneur de sang a répondu oui le {when}.', { when }), tone: 'normal' };
    case 'PROOF_CHECK':
      return { text: t('Une preuve de vaccination a été vérifiée le {when}.', { when }), tone: 'normal' };
    default:
      return { text: `${who} · ${resource} · ${when}`, tone: 'normal' };
  }
}
