import type { Metadata } from 'next';
import { CalendarCheck, Hourglass, MessageSquareText, UserRound } from 'lucide-react';
import { PageHead } from '@/app/app/_components/ui';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { serverApi, ServerApiError } from '@/lib/server-api';
import { DateTile, PARTS, serviceOf, STATUS, timeOf, type Part, type ServiceCode, type Status } from '../../app/(espace)/rendez-vous/shared';
import { ErrorNote } from '../_lib/ui';
import { RequestActions } from './RequestActions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Rendez-vous') };
}

interface Req {
  id: string;
  status: Status;
  specialty: ServiceCode;
  reason: string | null;
  preferredAt: string;
  part: Part;
  scheduledAt: string | null;
  answer: string | null;
  answeredByName: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { name: string; age: number; sex: 'F' | 'M'; commune: string | null };
  requestedBy: string | null;
}
interface Inbox {
  facility: { id: string; name: string } | null;
  pending: Req[];
  upcoming: Req[];
  recent: Req[];
}

/** Demandes de rendez-vous de l'établissement : à traiter d'abord, puis l'agenda confirmé. */
export default async function ProRendezVous() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  let inbox: Inbox | null = null;
  let error: string | null = null;
  try {
    inbox = await serverApi<Inbox>('/appointments/requests');
  } catch (e) {
    if (!(e instanceof ServerApiError)) throw e;
    error = e.message;
  }

  return (
    <I18nScope area="compte">
      <div className="space-y-6">
        <PageHead
          icon="calendar"
          title={t('Rendez-vous')}
          listen={[
            inbox?.facility ? t('Demandes de rendez-vous de {lieu}.', { lieu: inbox.facility.name }) : t('Demandes de rendez-vous de votre établissement.'),
            inbox ? t('{n} à traiter, {m} confirmés à venir.', { n: inbox.pending.length, m: inbox.upcoming.length }) : '',
            t('Confirmer envoie un SMS au patient et programme un rappel la veille.'),
          ].join(' ')}
        />
        {error && <ErrorNote>{t(error)}</ErrorNote>}

        {inbox && (
          <>
            <section aria-labelledby="h-traiter" className="space-y-3">
              <h2 id="h-traiter" className="flex items-center gap-2 text-xl font-bold">
                <Hourglass size={20} aria-hidden className="text-[var(--color-ocre-700)]" />
                {t('À traiter')} <span className="num text-[var(--fg-muted)]">({inbox.pending.length})</span>
              </h2>
              {inbox.pending.length === 0 ? (
                <p className="card p-4 text-[var(--fg-muted)]">{t('Aucune demande en attente.')}</p>
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {inbox.pending.map((r) => (
                    <RequestCard key={r.id} r={r} t={t} locale={locale} />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="h-agenda" className="space-y-3">
              <h2 id="h-agenda" className="flex items-center gap-2 text-xl font-bold">
                <CalendarCheck size={20} aria-hidden className="text-[var(--color-brand-700)] dark:text-[var(--color-leaf)]" />
                {t('Agenda confirmé')} <span className="num text-[var(--fg-muted)]">({inbox.upcoming.length})</span>
              </h2>
              {inbox.upcoming.length === 0 ? (
                <p className="card p-4 text-[var(--fg-muted)]">{t('Aucun rendez-vous confirmé à venir.')}</p>
              ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {inbox.upcoming.map((r) => (
                    <RequestCard key={r.id} r={r} t={t} locale={locale} />
                  ))}
                </ul>
              )}
            </section>

            {inbox.recent.length > 0 && (
              <section aria-labelledby="h-recent" className="space-y-3">
                <h2 id="h-recent" className="text-xl font-bold">
                  {t('Réponses des 7 derniers jours')}
                </h2>
                <ul className="card divide-y divide-[var(--border)] px-4">
                  {inbox.recent.map((r) => {
                    const st = STATUS[r.status];
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                        <span className={`pill ${st.tone}`}>
                          <st.icon size={14} aria-hidden /> {t(st.label)}
                        </span>
                        <span className="font-semibold">{r.patient.name}</span>
                        <span className="text-[var(--fg-muted)]">
                          {t(serviceOf(r.specialty).pro)} · {fmtDate(r.scheduledAt ?? r.preferredAt, { day: 'numeric', month: 'short' }, locale)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </I18nScope>
  );
}

function RequestCard({ r, t, locale }: { r: Req; t: T; locale: Locale }) {
  const svc = serviceOf(r.specialty);
  const part = PARTS.find((p) => p.key === r.part);
  const confirmed = r.status === 'CONFIRME' && r.scheduledAt;
  return (
    <li className="card space-y-3 p-4">
      <div className="flex items-start gap-4">
        <DateTile date={confirmed ? r.scheduledAt! : r.preferredAt} locale={locale} tone={confirmed ? 'brand' : 'ocre'} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="flex items-center gap-2 text-lg font-bold">
            <UserRound size={18} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
            {r.patient.name}
          </p>
          <p className="text-[var(--fg-muted)]">
            {t('{age} ans', { age: r.patient.age })} · {r.patient.sex === 'F' ? t('femme') : t('homme')}
            {r.patient.commune ? ` · ${r.patient.commune}` : ''}
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]">
              <svc.icon size={14} aria-hidden /> {t(svc.pro)}
            </span>
            <span className="font-semibold">
              {confirmed ? (
                <span className="num">{timeOf(r.scheduledAt!, locale)}</span>
              ) : (
                <>
                  {t('Souhaité')}
                  {part ? ` · ${t(part.label).toLowerCase()}` : ''}
                </>
              )}
            </span>
          </p>
        </div>
      </div>
      {r.reason && (
        <p className="flex items-start gap-2 rounded-2xl bg-[var(--bg)] p-3">
          <MessageSquareText size={18} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
          {r.reason}
        </p>
      )}
      {r.requestedBy && <p className="text-sm text-[var(--fg-muted)]">{t('Demandé par {nom} (aidant)', { nom: r.requestedBy })}</p>}
      {r.answer && confirmed && <p className="text-sm text-[var(--fg-muted)]">{t('Message envoyé : « {texte} »', { texte: r.answer })}</p>}
      <RequestActions id={r.id} mode={confirmed ? 'upcoming' : 'pending'} at={confirmed ? r.scheduledAt! : r.preferredAt} part={r.part} />
    </li>
  );
}
