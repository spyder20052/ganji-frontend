import Link from 'next/link';
import { CalendarPlus, ChevronRight, UserRound } from 'lucide-react';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, relative } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { DateTile, PARTS, serviceOf, STATUS, timeOf, type MyAppointment } from './rendez-vous/shared';

/**
 * Carte « Prochain rendez-vous » de l'accueil : le rendez-vous confirmé le plus proche, sinon la
 * demande en attente (signalée comme telle). Jamais un rappel de médicament. Vide : un gros bouton.
 */
export function NextAppointmentCard({ next, discreet, t, locale }: { next: MyAppointment | null; discreet: boolean; t: T; locale: Locale }) {
  const shell = 'relative -mt-20 rounded-[var(--radius-card)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]';
  if (!next) {
    return (
      <section aria-labelledby="h-rdv" className={`${shell} space-y-3`}>
        <div>
          <h2 id="h-rdv" className="text-sm font-normal text-[var(--fg-muted)]">
            {t('Prochain rendez-vous')}
          </h2>
          <p className="text-lg">{t('Aucun rendez-vous')}</p>
        </div>
        <Link href="/app/rendez-vous/nouveau" className="btn btn-primary w-full !min-h-14 text-lg">
          <CalendarPlus size={22} aria-hidden /> {t('Prendre rendez-vous')}
        </Link>
      </section>
    );
  }

  const confirmed = next.status === 'CONFIRME' && next.scheduledAt;
  const date = confirmed ? next.scheduledAt! : next.preferredAt;
  const svc = serviceOf(next.specialty);
  const part = PARTS.find((p) => p.key === next.part);
  const title = discreet ? t('Rendez-vous de santé') : t(svc.label);
  const who = next.own ? '' : ` · ${next.patient.firstName}`;
  return (
    <section aria-labelledby="h-rdv" className={shell}>
      <Link href="/app/rendez-vous" className="flex items-center gap-4">
        <DateTile date={date} locale={locale} size="lg" tone={confirmed ? 'brand' : 'ocre'} />
        <div className="min-w-0 flex-1">
          <h2 id="h-rdv" className="text-sm font-normal text-[var(--fg-muted)]">
            {confirmed ? t('Prochain rendez-vous · {when}', { when: relative(date, locale) }) : t('Demande de rendez-vous')}
            {who}
          </h2>
          <span className="flex items-center gap-2 font-display text-lg leading-snug font-semibold text-[var(--color-brand-900)] dark:text-[var(--fg)]">
            {!discreet && <svc.icon size={18} aria-hidden className={svc.blood ? 'shrink-0 text-[var(--color-danger-600)]' : 'shrink-0'} />}
            {title}
          </span>
          <span className="block text-base text-[var(--fg-muted)]">
            {confirmed ? (
              <span className="num">{timeOf(next.scheduledAt!, locale)}</span>
            ) : (
              `${fmtDate(next.preferredAt, { weekday: 'short', day: 'numeric', month: 'short' }, locale)}${part ? `, ${t(part.label).toLowerCase()}` : ''}`
            )}
            {!discreet ? ` · ${next.facility.name}` : ''}
          </span>
          {!confirmed && (
            <span className={`pill mt-1 ${STATUS.DEMANDE.tone}`}>
              <STATUS.DEMANDE.icon size={14} aria-hidden /> {t(STATUS.DEMANDE.label)}
            </span>
          )}
        </div>
        <ChevronRight size={22} aria-hidden className="shrink-0 opacity-60" />
      </Link>
    </section>
  );
}

/** Ce qui manque au profil pour l'urgence (groupe, personne à prévenir, commune). */
export function missingVitals(s: Summary | null): string[] {
  if (!s) return [];
  return [!s.bloodGroup && 'Groupe sanguin', !s.emergencyContact && 'Personne à prévenir', !s.commune && 'Commune'].filter(Boolean) as string[];
}

/** Bandeau « Complétez votre profil » : tant que l'accueil n'est pas fini ou qu'une information d'urgence manque. */
export function ProfileBanner({ missing, t }: { missing: string[]; t: T }) {
  return (
    <Link href="/app/profil" className="flex items-center gap-3 rounded-[var(--radius-card)] bg-[var(--color-leaf)] p-4 text-[var(--color-ink)]">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-900)] text-white">
        <UserRound size={24} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-tight font-semibold">{t('Complétez votre profil')}</span>
        {missing.length > 0 && <span className="block text-base">{missing.map((m) => t(m)).join(' · ')}</span>}
      </span>
      <ChevronRight size={22} aria-hidden className="shrink-0" />
    </Link>
  );
}
