import type { Metadata } from 'next';
import { Check, MapPin } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { AutoRefresh } from '../../_components/AutoRefresh';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { load } from '../../_lib/load';
import { DonorRespond } from './DonorRespond';

export const metadata: Metadata = { title: 'Sang' };

interface DonorAlerts {
  donor: { firstName: string; bloodGroup: string; donations: number; lastDonationAt: string | null; canDonate: boolean } | null;
  alerts: { id: string; status: 'ENVOYEE' | 'ACCEPTEE' | 'REFUSEE' | string; distanceKm: number; appointment: string | null; place: string; product: string; urgency: string; neededBy: string }[];
}

const STEPS = ['Demande créée', 'Donneurs alertés', 'Donneur trouvé', 'Transfusion faite'];
const STEP_OF: Record<string, number> = { OUVERTE: 0, DONNEURS_ALERTES: 1, DONNEUR_TROUVE: 2, SERVIE: 3 };
const URGENCY: Record<string, string> = { VITALE: 'Urgence vitale', URGENTE: 'Urgente', PROGRAMMEE: 'Programmée' };
const DAY = 86_400_000;

export default async function SangPage() {
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
          .map((r) => `Demande de ${r.productLabel} ${r.bloodGroup} : ${STEPS[STEP_OF[r.status] ?? 0]}. ${r.counts.accepted} donneur${r.counts.accepted > 1 ? 's ont' : ' a'} dit oui.`)
          .join(' ')
      : 'Aucune demande de sang vous concernant.',
    pending.length ? `On a besoin de votre sang à ${pending[0].place}. Répondez oui ou non.` : '',
  ].join(' ');

  return (
    <>
      {live && <AutoRefresh seconds={5} />}
      <PageHead
        icon="blood"
        danger
        title="Sang"
        intro="Suivez en direct les demandes de sang qui vous concernent, et répondez aux appels au don."
        listen={listen}
        audioKey="app.sang"
      />

      {pending.map((a) => (
        <section key={a.id} aria-label="Appel au don" className="card space-y-4 !border-2 !border-[var(--color-danger-600)] p-5">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white"><Pictogram name="blood" size={30} /></span>
            <div>
              <p className="text-2xl font-bold">Votre sang peut sauver une vie</p>
              <p className="text-lg">
                {a.product} · {URGENCY[a.urgency] ?? a.urgency} · <MapPin size={16} aria-hidden className="inline" /> {a.place}, à <span className="num">{Math.round(a.distanceKm)} km</span>
              </p>
              <p className="text-base text-[var(--fg-muted)]">Besoin avant le {fmtDateTime(a.neededBy)}</p>
            </div>
          </div>
          <DonorRespond alertId={a.id} place={a.place} />
        </section>
      ))}

      {upcoming.map((a) => (
        <section key={a.id} aria-label="Rendez-vous de don" className="card flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white"><Pictogram name="calendar" size={28} /></span>
          <div className="min-w-0 flex-1">
            <p className="label">Mon rendez-vous de don</p>
            <p className="text-2xl font-bold">{fmtDateTime(a.appointment as string)}</p>
            <p className="text-lg">{a.place} · service de transfusion. Venez après avoir mangé, avec une pièce d’identité.</p>
          </div>
        </section>
      ))}

      <Section id="h-demandes" title="Demandes pour moi" icon="blood">
        {reqRes.error && <ErrorNote error={reqRes.error} />}
        {reqRes.data && requests.length === 0 && <Empty>Aucune demande de sang vous concernant. Si votre médecin en fait une, vous la suivrez ici en direct.</Empty>}
        <ul className="space-y-5">
          {requests.map((r) => {
            const step = STEP_OF[r.status] ?? 0;
            const cancelled = r.status === 'ANNULEE';
            return (
              <li key={r.id} className="rounded-3xl border border-[var(--border)] p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xl font-bold">
                    <span className="num">{r.quantity}</span> poche{r.quantity > 1 ? 's' : ''} de {r.productLabel} <span className="num text-[var(--color-danger-600)]">{r.bloodGroup}</span>
                  </p>
                  <p className="text-base text-[var(--fg-muted)]">
                    {r.facility} · demandée {relative(r.createdAt)} par {r.requester}
                  </p>
                </div>
                {cancelled ? (
                  <p className="mt-3 pill bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">Demande annulée</p>
                ) : (
                  <ol className="mt-4 grid gap-2 sm:grid-cols-4" aria-label="Étapes de la demande">
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
                            {label}
                            <span className="sr-only">{done ? ' : fait' : current ? ' : en cours' : ' : à venir'}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-[var(--bg)] p-3">
                    <dt className="text-sm font-bold text-[var(--fg-muted)]">Donneurs alertés</dt>
                    <dd className="num text-3xl font-bold">{r.counts.alerted}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--color-danger-50)] p-3 text-[var(--color-danger-800)]">
                    <dt className="text-sm font-bold">Ont dit oui</dt>
                    <dd className="num text-3xl font-bold">{r.counts.accepted}</dd>
                  </div>
                  <div className="rounded-2xl bg-[var(--bg)] p-3">
                    <dt className="text-sm font-bold text-[var(--fg-muted)]">En attente</dt>
                    <dd className="num text-3xl font-bold">{r.counts.waiting}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        {live && <p className="mt-3 text-sm text-[var(--fg-muted)]">Mise à jour automatique toutes les 5 secondes.</p>}
      </Section>

      <Section id="h-donneur" title="Moi, donneur de sang" icon="care" className="simple-hide">
        {donorRes.error && <ErrorNote error={donorRes.error} />}
        {donorRes.data && !donor && (
          <Notice tone="info" title="Vous n’êtes pas encore inscrit comme donneur">
            Un don dure environ 45 minutes et peut sauver jusqu’à trois vies. Inscrivez-vous au site de transfusion le plus proche : vous serez ensuite appelé seulement quand votre groupe manque près de chez vous.
          </Notice>
        )}
        {donor && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-5 rounded-3xl bg-[var(--color-danger-50)] p-5 text-[var(--color-danger-800)]">
              <p className="num text-6xl font-bold leading-none">{donor.bloodGroup}</p>
              <div>
                <p className="text-xl font-bold">
                  Vous êtes donneur {donor.bloodGroup} · <span className="num">{donor.donations}</span> don{donor.donations > 1 ? 's' : ''}
                </p>
                <p className="text-base">
                  {donor.canDonate
                    ? 'Vous pouvez donner dès maintenant.'
                    : donor.lastDonationAt
                      ? `Dernier don le ${fmtDate(donor.lastDonationAt, { day: 'numeric', month: 'long' })}. Prochain don possible au plus tôt le ${fmtDate(new Date(new Date(donor.lastDonationAt).getTime() + 56 * DAY), { day: 'numeric', month: 'long' })} (8 semaines de repos pour un homme, 12 pour une femme).`
                      : 'Votre corps se repose après votre dernier don.'}
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
                          <strong>Rendez-vous de don</strong> {a.appointment ? `le ${fmtDateTime(a.appointment)}` : ''} à {a.place}. Venez après avoir mangé, avec une pièce d’identité.
                        </>
                      ) : a.status === 'REFUSEE' ? (
                        <>Appel du {fmtDate(a.neededBy, { day: 'numeric', month: 'long' })} à {a.place} : vous avez répondu non.</>
                      ) : (
                        <>Appel à {a.place} : {a.status.toLowerCase()}.</>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
