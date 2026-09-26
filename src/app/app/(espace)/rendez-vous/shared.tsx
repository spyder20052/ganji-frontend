import { Baby, CalendarCheck, CalendarX, Droplet, Hand, HeartPulse, Hourglass, Ribbon, Stethoscope, Sun, Sunrise, Venus, type LucideIcon } from 'lucide-react';
import type { Locale } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';

/** Services proposés à la prise de rendez-vous : un mot et une image chacun (codes de l'API). */
export type ServiceCode = 'GENERALE' | 'PEDIATRIE' | 'GYNECOLOGIE' | 'CARDIOLOGIE' | 'HEMATOLOGIE' | 'DERMATOLOGIE' | 'ONCOLOGIE';

/** `label` : le mot du patient ; `pro` : le nom de la spécialité pour l'établissement. */
export const SERVICES: { code: ServiceCode; label: string; pro: string; icon: LucideIcon; blood?: boolean }[] = [
  { code: 'GENERALE', label: 'Consultation', pro: 'Consultation générale', icon: Stethoscope },
  { code: 'PEDIATRIE', label: 'Enfant', pro: 'Pédiatrie', icon: Baby },
  { code: 'GYNECOLOGIE', label: 'Femme et grossesse', pro: 'Gynécologie, maternité', icon: Venus },
  { code: 'CARDIOLOGIE', label: 'Cœur', pro: 'Cardiologie', icon: HeartPulse },
  { code: 'HEMATOLOGIE', label: 'Sang', pro: 'Hématologie', icon: Droplet, blood: true },
  { code: 'DERMATOLOGIE', label: 'Peau', pro: 'Dermatologie', icon: Hand },
  { code: 'ONCOLOGIE', label: 'Cancer', pro: 'Oncologie', icon: Ribbon },
];

export const serviceOf = (code: string) => SERVICES.find((s) => s.code === code) ?? SERVICES[0];

export type Part = 'MATIN' | 'APRES_MIDI';
export const PARTS: { key: Part; label: string; icon: LucideIcon; hour: number }[] = [
  { key: 'MATIN', label: 'Matin', icon: Sunrise, hour: 9 },
  { key: 'APRES_MIDI', label: 'Après-midi', icon: Sun, hour: 15 },
];

export type Status = 'DEMANDE' | 'CONFIRME' | 'REFUSE' | 'ANNULE' | 'FAIT';
export const STATUS: Record<Status, { label: string; icon: LucideIcon; tone: string }> = {
  DEMANDE: { label: 'En attente de réponse', icon: Hourglass, tone: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' },
  CONFIRME: { label: 'Confirmé', icon: CalendarCheck, tone: 'bg-[var(--color-leaf)] text-[var(--color-ink)]' },
  REFUSE: { label: 'Pas possible', icon: CalendarX, tone: 'bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border)]' },
  ANNULE: { label: 'Annulé', icon: CalendarX, tone: 'bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border)]' },
  FAIT: { label: 'Fait', icon: CalendarCheck, tone: 'bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border)]' },
};

/** Rendez-vous vu par la personne (GET /me/appointments). */
export interface MyAppointment {
  id: string;
  status: Status;
  specialty: ServiceCode;
  facility: { id: string; name: string };
  reason: string | null;
  preferredAt: string;
  part: Part;
  scheduledAt: string | null;
  answer: string | null;
  answeredByName: string | null;
  createdAt: string;
  patient: { id: string; firstName: string };
  own: boolean;
  canCancel: boolean;
}

/** Le prochain rendez-vous à montrer : le confirmé le plus proche, sinon la demande en attente la plus proche. */
export function nextAppointment(list: MyAppointment[], now = Date.now()): MyAppointment | null {
  const soon = (a: MyAppointment) => a.status === 'CONFIRME' && a.scheduledAt && new Date(a.scheduledAt).getTime() >= now - 3 * 3600_000;
  const confirmed = list.filter(soon).sort((a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!));
  if (confirmed[0]) return confirmed[0];
  const waiting = list.filter((a) => a.status === 'DEMANDE').sort((a, b) => +new Date(a.preferredAt) - +new Date(b.preferredAt));
  return waiting[0] ?? null;
}

/** Heure du Bénin, « 10 h 00 » (ou « 10:00 » en anglais). */
export function timeOf(d: string, locale: Locale) {
  const s = new Date(d).toLocaleTimeString(locale === 'en' ? 'en-GB' : 'fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' });
  if (locale === 'en') return s;
  const [h, m] = s.split(':');
  return `${Number(h)} h ${m}`;
}

/** Pavé de date : jour de la semaine, grand chiffre, mois. */
export function DateTile({ date, locale, tone = 'brand', size = 'md' }: { date: string; locale: Locale; tone?: 'brand' | 'muted' | 'ocre'; size?: 'md' | 'lg' }) {
  const bg =
    tone === 'brand'
      ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'
      : tone === 'ocre'
        ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'
        : 'bg-[var(--bg)] text-[var(--fg-muted)]';
  const box = size === 'lg' ? 'h-20 w-20' : 'h-16 w-16';
  return (
    <span aria-hidden className={`grid ${box} shrink-0 place-items-center rounded-2xl text-center ${bg}`}>
      <span className="leading-none">
        <span className="block text-xs font-semibold uppercase">{fmtDate(date, { weekday: 'short' }, locale).replace('.', '')}</span>
        <span className={`display block ${size === 'lg' ? 'text-[2rem]' : 'text-[1.6rem]'}`}>{fmtDate(date, { day: 'numeric' }, locale)}</span>
        <span className="block text-xs">{fmtDate(date, { month: 'short' }, locale).replace('.', '')}</span>
      </span>
    </span>
  );
}
