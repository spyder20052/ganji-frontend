import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Check, Clock, MapPin, PauseCircle } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, fmtDateTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { AutoRefresh } from '../../_components/AutoRefresh';
import { Empty, ErrorNote, Notice, PageHead, Section } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { AvailabilityToggle, VolunteerButton } from './DonorActions';
import { DonorRespond } from './DonorRespond';
import { DonorSignup } from './DonorSignup';
import type { Department, DonorAlerts, DonorMe, DonorView, NearbyRequest } from './types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Sang') };
}

/** Demande vue par le patient ou son aidant (champs ajoutés par l'API : couverture, poches réservées). */
type MyRequest = BloodRequestView & { patientId: string; coverage?: { covered: number; missing: number }; reserved?: { units: number; site: string | null } | null };

const OPEN = new Set(['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE', 'POCHES_RESERVEES']);
const STEPS = ['Demande créée', 'Donneurs alertés', 'Donneur trouvé', 'Transfusion faite'];
const STEP_OF: Record<string, number> = { OUVERTE: 0, DONNEURS_ALERTES: 1, DONNEUR_TROUVE: 2, POCHES_RESERVEES: 2, SERVIE: 3 };
const URGENCY: Record<string, string> = { VITALE: 'Urgence vitale', URGENTE: 'Urgente', PROGRAMMEE: 'Programmée' };
const PRODUCT: Record<string, string> = { CGR: 'Globules rouges', PLAQUETTES: 'Plaquettes', PLASMA: 'Plasma' };

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
  const [t, locale, me] = await Promise.all([getT(), getLocale(), getMe()]);
  const [reqRes, alertsRes, donorRes, nearbyRes] = await Promise.all([
    load<MyRequest[]>('/blood/requests'),
    load<DonorAlerts>('/blood/donor/alerts'),
    load<DonorMe>('/blood/donor/me'),
    load<{ registered: boolean; requests: NearbyRequest[] }>('/blood/nearby'),
  ]);
  const requests = reqRes.data ?? [];
  const openRequests = requests.filter((r) => OPEN.has(r.status));
  const pastRequests = requests.filter((r) => !OPEN.has(r.status));
  const alerts = alertsRes.data?.alerts ?? [];
  const pending = alerts.filter((a) => a.status === 'ENVOYEE');
  const now = Date.now();
  // Rendez-vous à venir, tant que la demande n'est pas close (servie : le don est déjà inscrit).
  const upcoming = alerts.filter((a) => a.status === 'ACCEPTEE' && a.appointment && new Date(a.appointment).getTime() > now && OPEN.has(a.requestStatus));
  const history = alerts.filter((a) => a.status !== 'ENVOYEE');
  const live = openRequests.length > 0 || pending.length > 0;

  const donorMe = donorRes.data;
  const donor = donorMe?.donor ?? null;
  const prefill = donorMe?.prefill;
  const rules = donorMe?.rules;
  const tooOld = !donor && prefill?.age != null && rules ? prefill.age > rules.maxAge : false;
  const tooYoung = !donor && prefill?.age != null && rules ? prefill.age < rules.minAge : false;
  const canSignUp = Boolean(donorMe && !donor && !prefill?.contraindication && !tooOld && !tooYoung);
  const departments = canSignUp ? ((await load<Department[]>('/geo/departments')).data ?? []) : [];
  const nearby = nearbyRes.data?.requests ?? [];
  // Qui ne peut pas donner (receveur, grossesse, âge) voit d'abord ses demandes.
  const requestsFirst = openRequests.length > 0 || !(donor || canSignUp);

  const listen = [
    pending.length ? t('On a besoin de votre sang à {place}. Répondez oui ou non.', { place: pending[0].place }) : '',
    ...openRequests.map((r) =>
      t('Demande de {product} {group} : {step}.', { product: t(r.productLabel), group: r.bloodGroup, step: t(stepLabel(r, STEP_OF[r.status] ?? 0)) }),
    ),
    donor
      ? donor.eligible
        ? t('Vous êtes donneur {group}. Vous pouvez donner. Touchez « Je peux donner » sur une demande proche.', { group: donor.bloodGroup })
        : t('Vous êtes donneur {group}. Votre corps se repose : huit semaines après un don pour un homme, douze semaines pour une femme.', { group: donor.bloodGroup })
      : canSignUp
        ? t('Devenez donneur : votre groupe, votre commune, votre téléphone. On vous appelle seulement quand un hôpital proche a besoin de vous.')
        : '',
  ]
    .filter(Boolean)
    .join(' ');

  const requestsBlock = (
    <Section id="h-demandes" title={openRequests.length ? t('Demandes en cours') : t('Demandes pour moi')} icon="blood">
      {reqRes.error && <ErrorNote error={reqRes.error} />}
      {reqRes.data && openRequests.length === 0 && <Empty>{t('Aucune demande de sang en cours pour vous ou vos proches.')}</Empty>}
      <ul className="space-y-5">
        {openRequests.map((r) => (
          <RequestCard key={r.id} r={r} forOther={r.patientId !== me.patientId} t={t} locale={locale} />
        ))}
      </ul>
      {pastRequests.length > 0 && (
        <details className="group mt-4">
          <summary className="btn btn-soft w-full cursor-pointer list-none">
            <span className="group-open:hidden">{t('Anciennes demandes ({n})', { n: pastRequests.length })}</span>
            <span className="hidden group-open:inline">{t('Masquer')}</span>
          </summary>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {pastRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-3 text-base">
                <span>
                  <span className="num font-bold">{r.quantity}</span> × {t(PRODUCT[r.product] ?? r.productLabel)} <span className="num font-bold text-[var(--color-danger-600)]">{r.bloodGroup}</span> · {r.facility}
                </span>
                <span className="text-[var(--fg-muted)]">
                  {r.status === 'SERVIE' ? t('Transfusion faite') : t('Demande annulée')} · {fmtDate(r.createdAt, { day: 'numeric', month: 'short' }, locale)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {live && <p className="mt-3 text-sm text-[var(--fg-muted)]">{t('Mise à jour automatique toutes les 5 secondes.')}</p>}
    </Section>
  );

  return (
    <I18nScope area="patient2">
      <I18nScope area="sangPartage">
        {live && <AutoRefresh seconds={5} />}
        <PageHead
          icon="blood"
          danger
          title={t('Sang')}
          intro={t('Suivez en direct les demandes de sang qui vous concernent, et répondez aux appels au don.')}
          listen={listen || t('Aucune demande de sang vous concernant.')}
          audioKey="app.sang"
        />

        {pending.map((a) => (
          <section key={a.id} aria-label={t('Appel au don')} className="card space-y-4 !border-2 !border-[var(--color-danger-600)] p-5">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white">
                <Pictogram name="blood" size={30} />
              </span>
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
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] text-white">
              <Pictogram name="calendar" size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="label">{t('Mon rendez-vous de don')}</p>
              <p className="text-2xl font-bold">{fmtDateTime(a.appointment as string, locale)}</p>
              <p className="text-lg">{t('{place} · service de transfusion. Venez après avoir mangé, avec une pièce d’identité.', { place: a.place })}</p>
            </div>
          </section>
        ))}

        {requestsFirst && requestsBlock}

        <Section id="h-donneur" title={t('Moi, donneur de sang')} icon="care">
          {donorRes.error && <ErrorNote error={donorRes.error} />}
          {donor && (
            <div className="space-y-3">
              <DonorCard d={donor} t={t} locale={locale} />
              <AvailabilityToggle available={donor.available} />
            </div>
          )}
          {prefill?.contraindication && !donor && (
            <Notice tone="info" title={prefill.contraindication === 'PREGNANCY' ? t('Pas de don pendant la grossesse') : t('Le don n’est pas possible pour vous')}>
              {t('Vos proches peuvent donner pour vous : ils s’inscrivent depuis leur propre téléphone.')}
            </Notice>
          )}
          {(tooOld || tooYoung) && (
            <Notice tone="info" title={tooOld ? t('Au-delà de 60 ans, le don n’est plus possible') : t('Le don est possible à partir de 18 ans')}>
              {t('Vos proches peuvent donner : ils s’inscrivent depuis leur propre téléphone.')}
            </Notice>
          )}
          {canSignUp && prefill && <DonorSignup prefill={prefill} departments={departments} />}
        </Section>

        {donor && donor.eligible && (
          <Section id="h-proches" title={t('Près de chez vous')} icon="map">
            {nearbyRes.error && <ErrorNote error={nearbyRes.error} />}
            {nearbyRes.data && nearby.length === 0 && <Empty>{t('Aucune demande compatible près de chez vous. Merci d’être prêt !')}</Empty>}
            <ul className="space-y-3">
              {nearby.map((n) => (
                <li key={n.id} className="space-y-3 rounded-3xl border border-[var(--border)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="num grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-danger-50)] text-xl font-bold text-[var(--color-danger-800)]">{n.bloodGroup}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold">
                        {n.facility} · <span className="num">{Math.round(n.distanceKm)} km</span>
                      </p>
                      <p className="text-base">
                        {t(PRODUCT[n.product] ?? n.productLabel)} · {URGENCY[n.urgency] ? t(URGENCY[n.urgency]) : n.urgency}
                      </p>
                      <p className="flex items-center gap-1.5 text-base text-[var(--fg-muted)]">
                        <Clock size={16} aria-hidden /> {t('Avant {date}', { date: fmtDateTime(n.neededBy, locale) })}
                      </p>
                    </div>
                  </div>
                  <VolunteerButton requestId={n.id} place={n.facility} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {!requestsFirst && requestsBlock}

        {history.length > 0 && (
          <Section id="h-historique" title={t('Mes réponses')} icon="calendar" className="simple-hide">
            <ul className="space-y-2">
              {history.map((a) => (
                <li key={a.id} className="rounded-2xl bg-[var(--bg)] p-3 text-base">
                  {a.status === 'ACCEPTEE' ? (
                    <>
                      <strong>{a.volunteer ? t('Vous vous êtes proposé') : t('Rendez-vous de don')}</strong> {a.appointment ? t('le {date}', { date: fmtDateTime(a.appointment, locale) }) : ''}{' '}
                      {t('à {place}.', { place: a.place })}
                    </>
                  ) : a.status === 'REFUSEE' ? (
                    <>{t('Appel du {date} à {place} : vous avez répondu non.', { date: fmtDate(a.neededBy, { day: 'numeric', month: 'long' }, locale), place: a.place })}</>
                  ) : (
                    <>{t('Appel à {place} : besoin couvert avant votre réponse, merci.', { place: a.place })}</>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </I18nScope>
    </I18nScope>
  );
}

function stepLabel(r: MyRequest, i: number) {
  if (i === 2 && r.status === 'POCHES_RESERVEES') return 'Poches réservées';
  return STEPS[i];
}

function RequestCard({ r, forOther, t, locale }: { r: MyRequest; forOther: boolean; t: T; locale: Locale }) {
  const step = STEP_OF[r.status] ?? 0;
  return (
    <li className="rounded-3xl border border-[var(--border)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xl font-bold">
          <span className="num">{r.quantity}</span>{' '}
          {r.quantity > 1 ? t('poches de {product}', { product: t(r.productLabel) }) : t('poche de {product}', { product: t(r.productLabel) })}{' '}
          <span className="num text-[var(--color-danger-600)]">{r.bloodGroup}</span>
        </p>
        <p className="text-base text-[var(--fg-muted)]">
          {forOther && <span className="font-bold text-[var(--fg)]">{t('Pour {name}', { name: r.patient })} · </span>}
          {t('{facility} · demandée {when} par {who}', { facility: r.facility, when: relative(r.createdAt, locale), who: r.requester })}
        </p>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-4" aria-label={t('Étapes de la demande')}>
        {STEPS.map((_, i) => {
          const label = stepLabel(r, i);
          const done = i < step || (i === step && step >= 2);
          const current = i === step && step < 2;
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
          <dt className="text-sm font-bold text-[var(--fg-muted)]">{t('Poches trouvées')}</dt>
          <dd className="num text-3xl font-bold">
            {r.coverage?.covered ?? r.counts.accepted}
            <span className="text-lg font-normal text-[var(--fg-muted)]">/{r.quantity}</span>
          </dd>
        </div>
      </dl>
      {r.reserved && (
        <p className="mt-3 rounded-2xl bg-[var(--bg)] p-3 text-base">
          {r.reserved.units > 1
            ? t('{n} poches mises de côté par {site}.', { n: r.reserved.units, site: r.reserved.site ?? t('la banque de sang') })
            : t('{n} poche mise de côté par {site}.', { n: r.reserved.units, site: r.reserved.site ?? t('la banque de sang') })}
        </p>
      )}
    </li>
  );
}

function DonorCard({ d, t, locale }: { d: DonorView; t: T; locale: Locale }) {
  const status = !d.available
    ? { Icon: PauseCircle, text: t('En pause') }
    : d.eligible
      ? { Icon: Check, text: t('Prêt à donner') }
      : d.reason === 'REST' && d.nextDate
        ? { Icon: Clock, text: t('Repos jusqu’au {date}', { date: fmtDate(d.nextDate, { day: 'numeric', month: 'long' }, locale) }) }
        : d.reason === 'TOO_OLD'
          ? { Icon: Check, text: t('Merci pour vos dons !') }
          : d.reason === 'PREGNANCY'
            ? { Icon: PauseCircle, text: t('Pas de don pendant la grossesse') }
            : d.reason === 'CONDITION'
              ? { Icon: PauseCircle, text: t('Le don n’est pas possible pour vous') }
              : { Icon: Clock, text: t('Pas encore possible') };
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-[var(--color-danger-600)] p-5 text-white shadow-[0_18px_40px_-24px_rgb(142_27_27/0.8)] sm:p-6">
      {/* Grande goutte en filigrane : la carte que le donneur garde sur lui, version téléphone. */}
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute -right-10 -top-8 h-56 w-56 text-white/10" fill="currentColor">
        <path d="M12 2.4c-.3 0-.6.2-.8.4C9.4 5 5.5 10 5.5 14.3a6.5 6.5 0 0 0 13 0C18.5 10 14.6 5 12.8 2.8a1 1 0 0 0-.8-.4Z" />
      </svg>
      <p className="relative text-sm font-medium text-white/90">{t('Carte de donneur')}</p>
      <div className="relative mt-1 flex items-end justify-between gap-4">
        <p className="num font-display text-[4.5rem] leading-none font-light tracking-tight" aria-label={t('Groupe {group}', { group: d.bloodGroup })}>
          {d.bloodGroup}
        </p>
        <p className="text-right">
          <span className="num block text-4xl leading-none font-light">{d.donations}</span>
          <span className="text-sm text-white/90">{d.donations > 1 ? t('dons') : t('don')}</span>
        </p>
      </div>
      <p className="relative mt-4 text-lg font-bold">
        {d.firstName} · {d.city}
      </p>
      <p className="relative mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-base font-bold text-[#8e1b1b]">
        <status.Icon size={18} aria-hidden /> {status.text}
      </p>
    </div>
  );
}
