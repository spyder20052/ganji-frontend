import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Check, MapPin } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { AutoRefresh } from '../../_components/AutoRefresh';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { load } from '../../_lib/load';
import { DonorRespond } from './DonorRespond';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Sang') };
}

interface DonorAlerts {
  donor: { firstName: string; bloodGroup: string; donations: number; lastDonationAt: string | null; canDonate: boolean } | null;
  alerts: { id: string; status: 'ENVOYEE' | 'ACCEPTEE' | 'REFUSEE' | string; distanceKm: number; appointment: string | null; place: string; product: string; urgency: string; neededBy: string }[];
}

const STEPS = ['Demande créée', 'Donneurs alertés', 'Donneur trouvé', 'Transfusion faite'];
const STEP_OF: Record<string, number> = { OUVERTE: 0, DONNEURS_ALERTES: 1, DONNEUR_TROUVE: 2, SERVIE: 3 };
const URGENCY: Record<string, string> = { VITALE: 'Urgence vitale', URGENTE: 'Urgente', PROGRAMMEE: 'Programmée' };
const DAY = 86_400_000;

/** Insère un élément (chiffre mis en forme) à la place de {cle} dans une phrase traduite. */
function withNode(sentence: string, key: string, node: ReactNode) {
  const [before, after = ''] = sentence.split(`{${key}}`);
  return (
    <>
      {before}
      {node}
      {after}
    </>
  );
}

export default async function SangPage() {
  const t = await getT();
  const locale = await getLocale();
  const [reqRes, donorRes] = await Promise.all([load<BloodRequestView[]>('/blood/requests'), load<DonorAlerts>('/blood/donor/alerts')]);
  const requests = reqRes.data ?? [];
  const donor = donorRes.data?.donor ?? null;
  const alerts = donorRes.data?.alerts ?? [];
  const pending = alerts.filter((a) => a.status === 'ENVOYEE');
  const now = Date.now();
  const upcoming = alerts.filter((a) => a.status === 'ACCEPTEE' && a.appointment && new Date(a.appointment).getTime() > now);
  const live = requests.some((r) => r.status !== 'SERVIE' && r.status !== 'ANNULEE') || pending.length > 0;

  const listen = [
    requests.length
      ? requests
          .filter((r) => r.status !== 'SERVIE' && r.status !== 'ANNULEE')
          .map(
            (r) =>
              `${t('Demande de {product} {group} : {step}.', { product: t(r.productLabel), group: r.bloodGroup, step: t(STEPS[STEP_OF[r.status] ?? 0]) })} ${
                r.counts.accepted > 1 ? t('{n} donneurs ont dit oui.', { n: r.counts.accepted }) : t('{n} donneur a dit oui.', { n: r.counts.accepted })
              }`,
          )
          .join(' ')
      : t('Aucune demande de sang vous concernant.'),
    pending.length ? t('On a besoin de votre sang à {place}. Répondez oui ou non.', { place: pending[0].place }) : '',
  ].join(' ');

  return (
    <I18nScope area="patient2">
      {live && <AutoRefresh seconds={5} />}
      <PageHead
        icon="blood"
        danger
        title={t('Sang')}
        intro={t('Suivez en direct les demandes de sang qui vous concernent, et répondez aux appels au don.')}
        listen={listen}
        audioKey="app.sang"
      />

      {pending.map((a) => (
        <section key={a.id} aria-label={t('Appel au don')} className="card space-y-4 !border-2 !border-[var(--color-danger-600)] p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white"><Pictogram name="blood" size={30} /></span>
            <div>
              <p className="text-2xl font-bold">{t('Votre sang peut sauver une vie')}</p>
              <p className="text-lg">
                {t(a.product)} · {URGENCY[a.urgency] ? t(URGENCY[a.urgency]) : a.urgency} · <MapPin size={16} aria-hidden className="inline" /> {a.place},{' '}
                {withNode(t('à {km}'), 'km', <span className="num">{Math.round(a.distanceKm)} km</span>)}
              </p>
              <p className="text-base text-[var(--fg-muted)]">{t('Besoin avant le {date}', { date: fmtDateTime(a.neededBy, locale) })}</p>
            </div>
          </div>
          <DonorRespond alertId={a.id} place={a.place} />
        </section>
      ))}

      {upcoming.map((a) => (
        <section key={a.id} aria-label={t('Rendez-vous de don')} className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white"><Pictogram name="calendar" size={28} /></span>
          <div className="min-w-0 flex-1">
            <p className="label">{t('Mon rendez-vous de don')}</p>
            <p className="text-2xl font-bold">{fmtDateTime(a.appointment as string, locale)}</p>
            <p className="text-lg">{t('{place} · service de transfusion. Venez après avoir mangé, avec une pièce d’identité.', { place: a.place })}</p>
          </div>
        </section>
      ))}

      <Section id="h-demandes" title={t('Demandes pour moi')} icon="blood">
        {reqRes.error && <ErrorNote error={reqRes.error} />}
        {reqRes.data && requests.length === 0 && <Empty>{t('Aucune demande de sang vous concernant. Si votre médecin en fait une, vous la suivrez ici en direct.')}</Empty>}
        <ul className="space-y-5">
          {requests.map((r) => {
            const step = STEP_OF[r.status] ?? 0;
            const cancelled = r.status === 'ANNULEE';
            return (
              <li key={r.id} className="rounded-3xl border border-[var(--border)] p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xl font-bold">
                    <span className="num">{r.quantity}</span>{' '}
                    {r.quantity > 1 ? t('poches de {product}', { product: t(r.productLabel) }) : t('poche de {product}', { product: t(r.productLabel) })}{' '}
                    <span className="num text-[var(--color-danger-600)]">{r.bloodGroup}</span>
                  </p>
                  <p className="text-base text-[var(--fg-muted)]">
                    {t('{facility} · demandée {when} par {who}', { facility: r.facility, when: relative(r.createdAt, locale), who: r.requester })}
                  </p>
                </div>
                {cancelled ? (
                  <p className="mt-3 pill bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">{t('Demande annulée')}</p>
                ) : (
                  <ol className="mt-4 grid gap-2 sm:grid-cols-4" aria-label={t('Étapes de la demande')}>
                    {STEPS.map((label, i) => {
                      const done = i < step || (i === step && step === 3);
                      const current = i === step && step !== 3;
                      return (
                        <li
                          key={label}
                          aria-current={current ? 'step' : undefined}
                          className={`flex items-center gap-3 rounded-2xl p-3 sm:flex-col sm:items-start ${done ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : current ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--bg)] text-[var(--fg-muted)]'}`}
                        >
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-bold ${done ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-600)] text-white' : current ? 'border-white' : 'border-[var(--border)]'}`}>
                            {done ? <Check size={18} aria-hidden /> : <span className="num">{i + 1}</span>}
                          </span>
                          <span className="font-bold">
                            {t(label)}
                            <span className="sr-only">{done ? t(' : fait') : current ? t(' : en cours') : t(' : à venir')}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[var(--bg)] p-3">
                    <dt className="text-sm font-bold text-[var(--fg-muted)]">{t('Donneurs alertés')}</dt>
                    <dd className="num text-3xl font-bold">{r.counts.alerted}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-danger-50)] p-3 text-[var(--color-danger-800)]">
                    <dt className="text-sm font-bold">{t('Ont dit oui')}</dt>
                    <dd className="num text-3xl font-bold">{r.counts.accepted}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg)] p-3">
                    <dt className="text-sm font-bold text-[var(--fg-muted)]">{t('En attente')}</dt>
                    <dd className="num text-3xl font-bold">{r.counts.waiting}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        {live && <p className="mt-3 text-sm text-[var(--fg-muted)]">{t('Mise à jour automatique toutes les 5 secondes.')}</p>}
      </Section>

      <Section id="h-donneur" title={t('Moi, donneur de sang')} icon="care" className="simple-hide">
        {donorRes.error && <ErrorNote error={donorRes.error} />}
        {donorRes.data && !donor && (
          <Notice tone="info" title={t('Pas encore donneur')}>
            {t('Un don peut sauver trois vies. Inscrivez-vous au site de transfusion le plus proche.')}
          </Notice>
        )}
        {donor && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-5 rounded-3xl bg-[var(--color-danger-50)] p-5 text-[var(--color-danger-800)]">
              <p className="num text-6xl font-bold leading-none">{donor.bloodGroup}</p>
              <div>
                <p className="text-xl font-bold">
                  {t('Vous êtes donneur {group}', { group: donor.bloodGroup })} · <span className="num">{donor.donations}</span> {donor.donations > 1 ? t('dons') : t('don')}
                </p>
                <p className="text-base">
                  {donor.canDonate
                    ? t('Vous pouvez donner dès maintenant.')
                    : donor.lastDonationAt
                      ? t('Dernier don le {last}. Prochain don possible au plus tôt le {next} (8 semaines de repos pour un homme, 12 pour une femme).', {
                          last: fmtDate(donor.lastDonationAt, { day: 'numeric', month: 'long' }, locale),
                          next: fmtDate(new Date(new Date(donor.lastDonationAt).getTime() + 56 * DAY), { day: 'numeric', month: 'long' }, locale),
                        })
                      : t('Votre corps se repose après votre dernier don.')}
                </p>
              </div>
            </div>
            {alerts.filter((a) => a.status !== 'ENVOYEE').length > 0 && (
              <ul className="space-y-2">
                {alerts
                  .filter((a) => a.status !== 'ENVOYEE')
                  .map((a) => (
                    <li key={a.id} className="rounded-2xl bg-[var(--bg)] p-3 text-base">
                      {a.status === 'ACCEPTEE' ? (
                        <>
                          <strong>{t('Rendez-vous de don')}</strong> {a.appointment ? t('le {date}', { date: fmtDateTime(a.appointment, locale) }) : ''}{' '}
                          {t('à {place}. Venez après avoir mangé, avec une pièce d’identité.', { place: a.place })}
                        </>
                      ) : a.status === 'REFUSEE' ? (
                        <>{t('Appel du {date} à {place} : vous avez répondu non.', { date: fmtDate(a.neededBy, { day: 'numeric', month: 'long' }, locale), place: a.place })}</>
                      ) : (
                        <>{t('Appel à {place} : {status}.', { place: a.place, status: t(a.status.toLowerCase()) })}</>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </I18nScope>
  );
}
