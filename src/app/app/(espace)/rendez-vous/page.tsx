import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, MessageSquareText } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { ErrorNote, PageHead } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { CancelAppointment } from './CancelAppointment';
import { DateTile, PARTS, serviceOf, STATUS, timeOf, type MyAppointment } from './shared';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mes rendez-vous') };
}

export default async function RendezVousPage() {
  const [me, t, locale] = await Promise.all([getMe(), getT(), getLocale()]);
  const res = await load<MyAppointment[]>('/me/appointments');
  const list = res.data ?? [];
  const now = Date.now();
  const upcoming = list.filter((a) => a.status === 'CONFIRME' && a.scheduledAt && +new Date(a.scheduledAt) >= now - 3 * 3600_000);
  const waiting = list.filter((a) => a.status === 'DEMANDE');
  const past = list.filter((a) => !upcoming.includes(a) && !waiting.includes(a));
  const canBook = Boolean(me.patientId) || me.delegations.some((d) => d.scopes.includes('appointments') || d.scopes.includes('all'));

  const listen = [
    t('Vos rendez-vous.'),
    upcoming.length ? t('{n} rendez-vous confirmé(s).', { n: upcoming.length }) : '',
    waiting.length ? t('{n} demande(s) en attente de réponse.', { n: waiting.length }) : '',
    t('Pour en demander un, touchez « Prendre rendez-vous » : choisissez le service, le lieu et le jour. L’établissement vous répond par SMS.'),
  ].join(' ');

  return (
    <I18nScope area="compte">
      <PageHead icon="calendar" title={t('Rendez-vous')} listen={listen} audioKey="app.rendez-vous" />

      {canBook ? (
        <Link href="/app/rendez-vous/nouveau" className="btn btn-primary w-full !min-h-16 text-xl sm:w-auto">
          <CalendarPlus size={24} aria-hidden /> {t('Prendre rendez-vous')}
        </Link>
      ) : (
        <p className="rounded-3xl bg-[var(--card)] p-4 text-base">
          {t('Les rendez-vous se prennent pour soi, ou pour une personne qui vous l’a permis dans « Mes aidants ».')}
        </p>
      )}

      {res.error && <ErrorNote what={t('Mes rendez-vous')} error={res.error} />}

      {!res.error && list.length === 0 && (
        <section className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
            <CalendarPlus size={30} aria-hidden />
          </span>
          <p className="text-xl font-semibold">{t('Aucun rendez-vous')}</p>
        </section>
      )}

      {upcoming.length > 0 && (
        <Group id="h-avenir" title={t('À venir')}>
          {upcoming.map((a) => (
            <Card key={a.id} a={a} t={t} locale={locale} />
          ))}
        </Group>
      )}
      {waiting.length > 0 && (
        <Group id="h-attente" title={t('En attente')}>
          {waiting.map((a) => (
            <Card key={a.id} a={a} t={t} locale={locale} />
          ))}
        </Group>
      )}
      {past.length > 0 && (
        <details className="group">
          <summary className="btn btn-ghost w-full cursor-pointer list-none">
            <span className="group-open:hidden">{t('Voir les anciens ({n})', { n: past.length })}</span>
            <span className="hidden group-open:inline">{t('Masquer les anciens')}</span>
          </summary>
          <ul className="mt-3 space-y-3">
            {past.map((a) => (
              <Card key={a.id} a={a} t={t} locale={locale} />
            ))}
          </ul>
        </details>
      )}
    </I18nScope>
  );
}

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="px-1 text-lg font-semibold text-[var(--fg-muted)]">
        {title}
      </h2>
      <ul className="space-y-3">{children}</ul>
    </section>
  );
}

function Card({ a, t, locale }: { a: MyAppointment; t: T; locale: Locale }) {
  const svc = serviceOf(a.specialty);
  const st = STATUS[a.status];
  const part = PARTS.find((p) => p.key === a.part);
  const confirmed = a.status === 'CONFIRME' && a.scheduledAt;
  const date = confirmed ? a.scheduledAt! : a.preferredAt;
  const closed = a.status === 'ANNULE' || a.status === 'REFUSE' || a.status === 'FAIT';
  return (
    <li className={`card space-y-3 p-4 ${closed ? 'opacity-90' : ''}`}>
      <div className="flex items-start gap-4">
        <DateTile date={date} locale={locale} tone={confirmed ? 'brand' : a.status === 'DEMANDE' ? 'ocre' : 'muted'} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className={`pill ${st.tone}`}>
              <st.icon size={16} aria-hidden /> {t(st.label)}
            </span>
            {!a.own && <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">{t('Pour {prenom}', { prenom: a.patient.firstName })}</span>}
          </p>
          <p className="flex items-center gap-2 text-lg leading-snug font-semibold">
            <svc.icon size={20} aria-hidden className={svc.blood ? 'shrink-0 text-[var(--color-danger-600)]' : 'shrink-0 text-[var(--color-brand-700)] dark:text-[var(--color-leaf)]'} />
            {t(svc.label)}
          </p>
          <p className="text-base text-[var(--fg-muted)]">
            {a.facility.name} ·{' '}
            {confirmed ? (
              <span className="num font-semibold text-[var(--fg)]">{timeOf(a.scheduledAt!, locale)}</span>
            ) : (
              <>
                {fmtDate(a.preferredAt, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}
                {part ? `, ${t(part.label).toLowerCase()}` : ''}
              </>
            )}
          </p>
        </div>
      </div>
      {a.answer && (
        <p className="flex items-start gap-2 rounded-2xl bg-[var(--bg)] p-3 text-base">
          <MessageSquareText size={18} aria-hidden className="mt-1 shrink-0 text-[var(--fg-muted)]" />
          <span>
            {a.answer}
            {a.answeredByName && <span className="block text-sm text-[var(--fg-muted)]">{a.answeredByName}</span>}
          </span>
        </p>
      )}
      {a.status === 'REFUSE' && (
        <Link href={`/app/rendez-vous/nouveau?service=${a.specialty}${a.own ? '' : `&patient=${a.patient.id}`}`} className="btn btn-soft w-full">
          {t('Demander une autre date')}
        </Link>
      )}
      {a.canCancel && <CancelAppointment id={a.id} />}
    </li>
  );
}
