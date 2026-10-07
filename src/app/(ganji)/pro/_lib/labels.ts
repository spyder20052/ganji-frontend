/**
 * Libellés et tons partagés par les espaces soignant, pharmacie et banque de sang.
 * Ils restent en français ici : les écrans les traduisent à l'affichage avec t(libellé).
 */
import { INTL, translate, type Locale, type T, frenchStyle } from '@/i18n/translate';

/** Traducteur neutre (français) : valeur par défaut des aides ci-dessous. */
const FR: T = (fr, vars) => translate({}, fr, vars);

export type Tone = 'brand' | 'ocre' | 'danger' | 'muted';

export const TONE_CLASS: Record<Tone, string> = {
  brand: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  ocre: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  danger: 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]',
  muted: 'bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border)]',
};

export const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as const;

export const BLOOD_PRODUCTS = [
  { value: 'CGR', label: 'Globules rouges', short: 'CGR', hint: 'Anémie, hémorragie' },
  { value: 'PLAQUETTES', label: 'Plaquettes', short: 'Plaquettes', hint: 'Saignement, plaquettes très basses' },
  { value: 'PLASMA', label: 'Plasma', short: 'Plasma', hint: 'Troubles de la coagulation, brûlures' },
] as const;

export const PRODUCT_LABEL: Record<string, string> = { CGR: 'Globules rouges (CGR)', PLAQUETTES: 'Plaquettes', PLASMA: 'Plasma' };

export const BLOOD_URGENCY: Record<string, { label: string; hint: string; tone: Tone; hours: number }> = {
  VITALE: { label: 'Vitale', hint: 'Pronostic vital engagé, dans les 2 h', tone: 'danger', hours: 2 },
  URGENTE: { label: 'Urgente', hint: 'Dans les 24 h', tone: 'ocre', hours: 24 },
  PROGRAMMEE: { label: 'Programmée', hint: 'Transfusion prévue dans 3 jours', tone: 'muted', hours: 72 },
};

export const BLOOD_STATUS: Record<string, { label: string; tone: Tone }> = {
  OUVERTE: { label: 'Demande créée', tone: 'muted' },
  DONNEURS_ALERTES: { label: 'Donneurs alertés', tone: 'ocre' },
  DONNEUR_TROUVE: { label: 'Donneur trouvé', tone: 'brand' },
  POCHES_RESERVEES: { label: 'Poches réservées', tone: 'brand' },
  SERVIE: { label: 'Transfusion faite', tone: 'brand' },
  ANNULEE: { label: 'Annulée', tone: 'muted' },
};

export const DONOR_STATUS: Record<string, { label: string; tone: Tone }> = {
  ENVOYEE: { label: 'En attente', tone: 'muted' },
  ACCEPTEE: { label: 'A dit oui', tone: 'brand' },
  REFUSEE: { label: 'A dit non', tone: 'ocre' },
  EXPIREE: { label: 'Sans réponse', tone: 'muted' },
};

export const CHANNEL_LABEL: Record<string, string> = { APP: 'Application', SMS: 'SMS', VOICE: 'Appel vocal' };

export const ACCESS_VIA: Record<string, { label: string; tone: Tone }> = {
  CARE_TEAM: { label: 'Équipe de soins', tone: 'brand' },
  CONSENT: { label: 'Consentement', tone: 'brand' },
  BREAK_GLASS: { label: 'Bris de glace', tone: 'ocre' },
  OWNER: { label: 'Titulaire', tone: 'muted' },
  PARENT: { label: 'Parent', tone: 'muted' },
  DELEGATION: { label: 'Aidant', tone: 'muted' },
};

export const SPECIALTY_LABEL: Record<string, string> = {
  HEMATOLOGIE: 'Hématologie',
  ONCOLOGIE: 'Oncologie',
  PEDIATRIE: 'Pédiatrie',
  GYNECOLOGIE: 'Gynécologie-obstétrique',
  CARDIOLOGIE: 'Cardiologie',
  DERMATOLOGIE: 'Dermatologie',
  MEDECINE_INTERNE: 'Médecine interne',
  SOINS_INFIRMIERS: 'Soins infirmiers',
  SAGE_FEMME: 'Maïeutique',
  PHARMACIE: 'Pharmacie',
  TRANSFUSION: 'Transfusion',
};

/** Disciplines qu'on peut solliciter en télé-expertise (contrat de l'API). */
export const TELE_SPECIALTIES = ['HEMATOLOGIE', 'ONCOLOGIE', 'PEDIATRIE', 'GYNECOLOGIE', 'CARDIOLOGIE', 'DERMATOLOGIE', 'MEDECINE_INTERNE'] as const;

export const ENCOUNTER_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'HOSPITALISATION', label: 'Hospitalisation' },
  { value: 'TRANSFUSION', label: 'Transfusion' },
  { value: 'CHIMIOTHERAPIE', label: 'Chimiothérapie' },
  { value: 'URGENCE', label: 'Passage aux urgences' },
] as const;

export const OBSERVATION_CODES = [
  { value: 'PLT', label: 'Plaquettes', unit: 'G/L' },
  { value: 'HB', label: 'Hémoglobine', unit: 'g/dL' },
  { value: 'WBC', label: 'Globules blancs', unit: 'G/L' },
  { value: 'GLY', label: 'Glycémie à jeun', unit: 'g/L' },
  { value: 'TA_SYS', label: 'Tension systolique', unit: 'mmHg' },
  { value: 'TA_DIA', label: 'Tension diastolique', unit: 'mmHg' },
  { value: 'WEIGHT', label: 'Poids', unit: 'kg' },
  { value: 'HEIGHT', label: 'Taille', unit: 'cm' },
] as const;

const TZ = 'Africa/Porto-Novo';

/** « 1,2 km » (« 1.2 km » en anglais). */
export function km(n: number, locale: Locale = 'fr') {
  return `${n.toLocaleString(INTL[locale], { maximumFractionDigits: n < 10 ? 1 : 0 })} km`;
}

/** « 8 h » ou « 8 h 30 », à l'heure de Cotonou (« 08:30 » en anglais). */
export function hourFr(d: string | Date, locale: Locale = 'fr') {
  if (!frenchStyle(locale)) return new Date(d).toLocaleTimeString(INTL[locale], { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(d));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return m === '00' ? `${h} h` : `${h} h ${m}`;
}

function dayKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/**
 * « aujourd'hui à 8 h », « demain à 8 h », « jeudi 25 septembre à 8 h ».
 * Traduit si l'appelant fournit son traducteur `t` et sa langue (français sinon).
 */
export function whenFr(d: string | Date, t: T = FR, locale: Locale = 'fr') {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const day =
    dayKey(date) === dayKey(today)
      ? t("aujourd'hui")
      : dayKey(date) === dayKey(tomorrow)
        ? t('demain')
        : date.toLocaleDateString(INTL[locale], { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  return t('{day} à {hour}', { day, hour: hourFr(date, locale) });
}

/** Durée écoulée lisible : « 3 h », « 2 j » (traduite si l'appelant fournit `t`). */
export function waited(hours: number, t: T = FR) {
  if (hours < 1) return t('moins d’1 h');
  if (hours < 48) return t('{n} h', { n: hours });
  return t('{n} j', { n: Math.round(hours / 24) });
}
