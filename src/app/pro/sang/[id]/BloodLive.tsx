'use client';
import Link from 'next/link';
import {
  BadgeCheck, Building2, Check, Droplet, ExternalLink, HandHeart, MessageSquareText, PhoneCall, RefreshCw, Smartphone, Users, Warehouse, WifiOff, type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useT } from '@/i18n/client';
import type { Locale, T } from '@/i18n/translate';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, fmtTime, relative } from '@/lib/format';
import { BLOOD_STATUS, BLOOD_URGENCY, CHANNEL_LABEL, DONOR_STATUS, PRODUCT_LABEL, km, whenFr } from '../../_lib/labels';
import type { BloodCreateMemo } from '../../_lib/types';
import { ErrorNote, OkNote, Pill } from '../../_lib/ui';
import { ServedConfirm, type ServedResult } from './ServedConfirm';
import type { AlertResult, Dispatch, LiveDonor, LiveRequest } from './types';

const POLL_MS = 3000;
const FINAL = new Set(['SERVIE', 'ANNULEE']);
/** On peut relancer tant que la demande n'est pas couverte (donneurs qui ont dit oui + poches réservées). */
const NEEDS_BLOOD = new Set(['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE']);
const CHANNEL_ICON: Record<string, LucideIcon> = { APP: Smartphone, SMS: MessageSquareText, VOICE: PhoneCall };
const DONOR_ORDER: Record<string, number> = { ACCEPTEE: 0, ENVOYEE: 1, REFUSEE: 2, EXPIREE: 3 };

export function BloodLive({ id, initial }: { id: string; initial: LiveRequest }) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [memo, setMemo] = useState<BloodCreateMemo | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(() => new Date());
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState<'alert' | null>(null);
  const [confirmServed, setConfirmServed] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const final = FINAL.has(data.status);

  // Résultat de la vérification de stock, laissé par l'écran de création.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`blood-${id}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as BloodCreateMemo | BloodCreateMemo['stockCheck'];
      setMemo('stockCheck' in parsed ? parsed : { stockCheck: parsed });
    } catch {
      /* rien à afficher */
    }
  }, [id]);

  const refresh = useCallback(async () => {
    try {
      const d = await api<LiveRequest>(`/blood/requests/${id}`);
      setData(d);
      setOnline(true);
      setUpdatedAt(new Date());
    } catch {
      setOnline(false);
    }
  }, [id]);

  // Suivi en direct : une requête toutes les 3 s, en pause quand l'onglet est caché, arrêt une fois la demande close.
  useEffect(() => {
    if (final) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === 'visible') await refresh();
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [final, refresh]);

  async function alertMore() {
    setBusy('alert');
    setError(null);
    setNote(null);
    try {
      const r = await api<AlertResult>(`/blood/requests/${id}/alert-donors`, { method: 'POST' });
      setNote(
        r.alerted
          ? `${t(r.alerted > 1 ? '{n} nouveaux donneurs alertés.' : '{n} nouveau donneur alerté.', { n: r.alerted })}${r.widened && r.radiusKm ? ` ${t('Rayon élargi à {km} km.', { km: r.radiusKm })}` : ''}`
          : t('Aucun autre donneur compatible disponible, même à 150 km. La banque de sang est prévenue : elle peut réserver des poches.'),
      );
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Relance impossible. Réessayez.'));
    } finally {
      setBusy(null);
    }
  }

  async function onServed(r: ServedResult) {
    setConfirmServed(false);
    await refresh();
    setNote(
      `${t('Transfusion inscrite dans le carnet de {name}.', { name: data.patient })}${r.donorsRecorded ? ` ${t(r.donorsRecorded > 1 ? '{n} dons inscrits.' : '{n} don inscrit.', { n: r.donorsRecorded })}` : ''}`,
    );
  }

  const donors = [...(data.donors ?? [])].sort(
    (a, b) =>
      (DONOR_ORDER[a.status] ?? 9) - (DONOR_ORDER[b.status] ?? 9) ||
      (a.appointment && b.appointment ? +new Date(a.appointment) - +new Date(b.appointment) : 0) ||
      a.distanceKm - b.distanceKm,
  );
  const accepted = donors.filter((d) => d.status === 'ACCEPTEE');
  const first = accepted[0];
  const urgency = BLOOD_URGENCY[data.urgency];
  const status = BLOOD_STATUS[data.status] ?? { label: data.status, tone: 'muted' as const };
  const dispatch = data.dispatch;
  const nearbyUnits = dispatch?.nearbyUnits ?? memo?.stockCheck.nearbyUnits ?? null;
  const stockEnough = nearbyUnits !== null ? nearbyUnits >= data.quantity : false;
  const coverage = data.coverage;
  const canAlert = NEEDS_BLOOD.has(data.status) && !coverage?.complete;

  return (
    <div className="space-y-5">
      <Link href="/pro" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        {t('← Mes patients')}
      </Link>

      {/* Résumé de la demande */}
      <section aria-labelledby="h-req" className="card grid gap-4 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-[var(--color-danger-600)] text-white">
          <span className="text-center">
            <Droplet size={22} aria-hidden className="mx-auto" />
            <span className="num block text-2xl font-bold leading-none">{data.bloodGroup}</span>
          </span>
        </span>
        <div className="min-w-0">
          <p className="label">{t('Demande de sang · {name}', { name: data.patient })}</p>
          <h1 id="h-req" className="text-2xl font-bold">
            {t(data.quantity > 1 ? '{n} poches de {product} · {group}' : '{n} poche de {product} · {group}', {
              n: data.quantity,
              product: t(PRODUCT_LABEL[data.product]?.toLowerCase() ?? data.productLabel),
              group: data.bloodGroup,
            })}
          </h1>
          <p className="text-[var(--fg-muted)]">
            {t('{facility} · demandé par {requester} {when} · nécessaire avant le {date}', {
              facility: data.facility,
              requester: data.requester,
              when: relative(data.createdAt, locale),
              date: fmtDateTime(data.neededBy, locale),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
          {urgency && <Pill tone={urgency.tone}>{t(`Urgence ${urgency.label.toLowerCase()}`)}</Pill>}
          <Pill tone={status.tone}>{t(status.label)}</Pill>
        </div>
      </section>

      {/* Bandeau de succès */}
      {data.status === 'DONNEUR_TROUVE' && first && (
        <section role="status" className="card flex flex-wrap items-center gap-4 !border-0 bg-[var(--color-brand-900)] p-5 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[var(--color-brand-900)]">
            <BadgeCheck size={32} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{t('Donneur trouvé')}</p>
            <p className="text-lg text-[var(--color-brand-100)]">
              {t('{name} ({group}, {distance}) viendra {when} à {facility}.', {
                name: first.firstName,
                group: first.bloodGroup,
                distance: km(first.distanceKm, locale),
                when: first.appointment ? whenFr(first.appointment, t, locale) : t('bientôt'),
                facility: data.facility,
              })}
              {accepted.length > 1 &&
                ` ${t(accepted.length > 2 ? '{n} autres donneurs ont aussi dit oui.' : '{n} autre donneur a aussi dit oui.', { n: accepted.length - 1 })}`}
            </p>
            {coverage && !coverage.complete && (
              <p className="mt-1 font-bold text-white">{t('{covered} poche sur {n} trouvée : la recherche continue pour la suite.', { covered: coverage.covered, n: data.quantity })}</p>
            )}
            <p className="mt-1 text-sm text-[var(--color-brand-200)]">{t('Le donneur a reçu son rendez-vous par SMS ; la famille du patient et la banque de sang sont prévenues.')}</p>
          </div>
        </section>
      )}
      {data.status === 'POCHES_RESERVEES' && data.reserved && (
        <section role="status" className="card flex flex-wrap items-center gap-4 !border-0 bg-[var(--color-brand-900)] p-5 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[var(--color-brand-900)]">
            <Warehouse size={30} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{t('Poches réservées')}</p>
            <p className="text-lg text-[var(--color-brand-100)]">
              {t(data.reserved.units > 1 ? '{n} poches mises de côté par {site} pour {name}.' : '{n} poche mise de côté par {site} pour {name}.', {
                n: data.reserved.units,
                site: data.reserved.site ?? t('la banque de sang'),
                name: data.patient,
              })}
            </p>
          </div>
        </section>
      )}
      {data.status === 'SERVIE' && (
        <section role="status" className="card flex items-center gap-4 bg-[var(--color-brand-100)] p-5 text-[var(--color-brand-900)]">
          <Check size={28} aria-hidden />
          <p className="text-lg font-bold">{t('Transfusion faite et inscrite dans le carnet de {name}. Demande clôturée.', { name: data.patient })}</p>
        </section>
      )}

      {/* Compteurs en direct */}
      <section aria-labelledby="h-live" className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-live" className="flex-1 text-xl font-bold">
            {t('Appel aux donneurs')}
          </h2>
          <LiveBadge final={final} online={online} updatedAt={updatedAt} t={t} locale={locale} />
        </div>
        <p className="sr-only" aria-live="polite">
          {t('{alerted} donneurs alertés, {accepted} ont dit oui, {declined} ont dit non, {waiting} en attente. {status}.', {
            alerted: data.counts.alerted,
            accepted: data.counts.accepted,
            declined: data.counts.declined,
            waiting: data.counts.waiting,
            status: t(status.label),
          })}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden>
          <Counter label={t('Donneurs alertés')} value={data.counts.alerted} tone="neutral" />
          <Counter label={t('Ont dit oui')} value={data.counts.accepted} tone="yes" />
          <Counter label={t('Ont dit non')} value={data.counts.declined} tone="no" />
          <Counter label={t('En attente')} value={data.counts.waiting} tone="wait" />
        </dl>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          {/* Étapes */}
          <section aria-labelledby="h-steps" className="card p-5">
            <h2 id="h-steps" className="text-xl font-bold">
              {t('Où en est la demande')}
            </h2>
            <Stepper data={data} stockEnough={stockEnough} t={t} locale={locale} />
          </section>

          {/* Qui a été prévenu : banque de sang, donneurs par canal, stocks compatibles proches */}
          {(dispatch || memo) && (
            <Notified
              dispatch={dispatch}
              memo={memo}
              quantity={data.quantity}
              group={data.bloodGroup}
              compatible={data.compatibleGroups ?? memo?.stockCheck.compatibleGroups ?? []}
              stockEnough={stockEnough}
              final={final || Boolean(coverage?.complete)}
              t={t}
              locale={locale}
            />
          )}
        </div>

        {/* Donneurs */}
        <section aria-labelledby="h-donors" className="card p-5">
          <h2 id="h-donors" className="text-xl font-bold">
            {t('Donneurs sollicités')}
          </h2>
          <p className="text-sm text-[var(--fg-muted)]">{t('Donneurs compatibles, disponibles et en état de donner, du plus proche au plus lointain : 40 km, puis 80 et 150 km si personne n’est disponible. Seul le prénom est affiché.')}</p>
          {donors.length === 0 ? (
            <p className="mt-4 text-[var(--fg-muted)]">{stockEnough ? t('Aucun donneur alerté : le stock compatible suffit.') : t('Aucun donneur alerté pour l’instant.')}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[0.95rem]">
                <caption className="sr-only">{t('Liste des donneurs alertés et leur réponse')}</caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
                    <th scope="col" className="py-2 pr-2 font-bold">{t('Prénom')}</th>
                    <th scope="col" className="py-2 pr-2 font-bold">{t('Groupe')}</th>
                    <th scope="col" className="py-2 pr-2 text-right font-bold">{t('Distance')}</th>
                    <th scope="col" className="py-2 pr-2 font-bold">{t('Canal')}</th>
                    <th scope="col" className="py-2 font-bold">{t('Réponse')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {donors.map((d) => (
                    <DonorRow key={d.id} d={d} t={t} locale={locale} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn btn-soft" onClick={alertMore} disabled={busy !== null || !canAlert}>
              <RefreshCw size={18} aria-hidden className={busy === 'alert' ? 'animate-spin' : ''} /> {busy === 'alert' ? t('Relance…') : t('Relancer d’autres donneurs')}
            </button>
            {!final &&
              (confirmServed ? (
                <ServedConfirm requestId={id} donors={donors} onDone={(r) => void onServed(r)} onCancel={() => setConfirmServed(false)} />
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setConfirmServed(true)} disabled={busy !== null}>
                  <Check size={18} aria-hidden /> {t('Transfusion faite')}
                </button>
              ))}
          </div>
          <div className="mt-3 space-y-2">
            <OkNote>{note}</OkNote>
            <ErrorNote>{error}</ErrorNote>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-3">
            <p className="min-w-0 flex-1 text-sm text-[var(--fg-muted)]">
              {t('Démonstration : répondez « 1 » comme un donneur sur un téléphone simple. Cet écran se met à jour tout seul.')}
            </p>
            <a href="/simulateur" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-11 text-base">
              {t('Ouvrir le simulateur SMS')} <ExternalLink size={16} aria-hidden />
              <span className="sr-only">{t('(nouvel onglet)')}</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function DonorRow({ d, t, locale }: { d: LiveDonor; t: T; locale: Locale }) {
  const Icon = d.volunteer ? HandHeart : (CHANNEL_ICON[d.channel] ?? Smartphone);
  const st = DONOR_STATUS[d.status] ?? { label: d.status, tone: 'muted' as const };
  return (
    <tr className={d.status === 'ACCEPTEE' ? 'bg-[var(--color-brand-50)] dark:bg-transparent' : ''}>
      <td className="py-2 pr-2">
        <span className="font-bold">{d.firstName}</span>
        {d.city && <span className="block text-sm text-[var(--fg-muted)]">{d.city}</span>}
      </td>
      <td className="num py-2 pr-2 font-bold">{d.bloodGroup}</td>
      <td className="num py-2 pr-2 text-right">{km(d.distanceKm, locale)}</td>
      <td className="py-2 pr-2">
        <span className="inline-flex items-center gap-1.5" title={CHANNEL_LABEL[d.channel] ? t(CHANNEL_LABEL[d.channel]) : undefined}>
          <Icon size={18} aria-hidden />
          <span className="text-sm">{d.volunteer ? t('S’est proposé') : CHANNEL_LABEL[d.channel] ? t(CHANNEL_LABEL[d.channel]) : d.channel}</span>
        </span>
      </td>
      <td className="py-2">
        <Pill tone={st.tone}>{t(st.label)}</Pill>
        {d.status === 'ACCEPTEE' && d.appointment && (
          <span className="mt-0.5 block text-sm font-bold text-[var(--color-brand-700)]">{t('RDV {when}', { when: whenFr(d.appointment, t, locale) })}</span>
        )}
      </td>
    </tr>
  );
}

function LiveBadge({ final, online, updatedAt, t, locale }: { final: boolean; online: boolean; updatedAt: Date; t: T; locale: Locale }) {
  if (final) return <span className="pill border border-[var(--border)] text-[var(--fg-muted)]">{t('Demande clôturée')}</span>;
  if (!online)
    return (
      <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
        <WifiOff size={14} aria-hidden /> {t('Réseau instable · nouvel essai dans 3 s')}
      </span>
    );
  return (
    <span className="pill border border-[var(--border)] text-[var(--fg-muted)]">
      <span aria-hidden className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-500)] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-brand-500)]" />
      </span>
      {t('En direct')} · <span className="num" suppressHydrationWarning>{fmtTime(updatedAt, locale)}:{String(updatedAt.getSeconds()).padStart(2, '0')}</span>
    </span>
  );
}

const COUNTER_TONE = {
  neutral: 'bg-[var(--bg)] text-[var(--fg)]',
  yes: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  no: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  wait: 'bg-[var(--bg)] text-[var(--fg-muted)]',
} as const;

/** Grand compteur : la valeur glisse vers la nouvelle (400 ms) et la tuile s'illumine brièvement. */
function Counter({ label, value, tone }: { label: string; value: number; tone: keyof typeof COUNTER_TONE }) {
  const [shown, setShown] = useState(value);
  const [flash, setFlash] = useState(false);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    from.current = value;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setShown(value);
      return;
    }
    setFlash(true);
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 400);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const off = setTimeout(() => setFlash(false), 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(off);
      setShown(value);
    };
  }, [value]);

  return (
    <div className={`rounded-2xl p-4 transition-shadow duration-500 ${COUNTER_TONE[tone]} ${flash ? 'shadow-[0_0_0_4px_var(--color-ocre-500)]' : 'shadow-none'}`}>
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="num text-5xl font-bold leading-tight">{shown}</dd>
    </div>
  );
}

type StepState = 'done' | 'current' | 'todo' | 'skipped';

function Stepper({ data, stockEnough, t, locale }: { data: LiveRequest; stockEnough: boolean; t: T; locale: Locale }) {
  const s = data.status;
  const alertedDone = data.counts.alerted > 0 || ['DONNEURS_ALERTES', 'DONNEUR_TROUVE'].includes(s);
  const foundDone = data.counts.accepted > 0 || s === 'DONNEUR_TROUVE' || s === 'POCHES_RESERVEES';
  const reservedOnly = s === 'POCHES_RESERVEES' && data.counts.accepted === 0;
  const served = s === 'SERVIE';
  const raw: { label: string; hint?: string; done: boolean; skipped?: boolean }[] = [
    { label: 'Demande créée', hint: fmtDateTime(data.createdAt, locale), done: true },
    { label: 'Stock vérifié', hint: stockEnough ? t('Stock compatible suffisant') : t('Sites à moins de 60 km'), done: true },
    {
      label: 'Donneurs alertés',
      hint: alertedDone ? t('{n} donneurs · application, SMS, voix', { n: data.counts.alerted }) : undefined,
      done: alertedDone,
      skipped: !alertedDone && (stockEnough || served || reservedOnly),
    },
    reservedOnly
      ? { label: 'Poches réservées', hint: data.reserved?.site ?? undefined, done: true }
      : { label: 'Donneur trouvé', hint: foundDone ? t('{n} oui', { n: data.counts.accepted }) : undefined, done: foundDone, skipped: !foundDone && served },
    { label: 'Transfusion faite', done: served },
  ];
  let currentSet = false;
  const steps = raw.map((st) => {
    let state: StepState = st.done ? 'done' : st.skipped ? 'skipped' : 'todo';
    if (state === 'todo' && !currentSet) {
      state = 'current';
      currentSet = true;
    }
    return { ...st, state };
  });

  return (
    <ol className="mt-4 space-y-0">
      {steps.map((st, i) => (
        <li key={st.label} className="relative flex gap-3 pb-4 last:pb-0" aria-current={st.state === 'current' ? 'step' : undefined}>
          {i < steps.length - 1 && (
            <span aria-hidden className={`absolute left-[0.9rem] top-8 h-[calc(100%-2rem)] w-0.5 ${st.state === 'done' ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--border)]'}`} />
          )}
          <span
            aria-hidden
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${
              st.state === 'done'
                ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-500)] text-white'
                : st.state === 'current'
                  ? 'border-[var(--color-ocre-500)] bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'
                  : 'border-[var(--border)] text-[var(--fg-muted)]'
            }`}
          >
            {st.state === 'done' ? <Check size={16} /> : i + 1}
          </span>
          <span className="min-w-0 pt-0.5">
            <span className={`block font-bold ${st.state === 'todo' || st.state === 'skipped' ? 'text-[var(--fg-muted)]' : ''}`}>
              {t(st.label)}
              <span className="sr-only">
                {st.state === 'done' ? t(' : fait') : st.state === 'current' ? t(' : en cours') : st.state === 'skipped' ? t(' : non nécessaire') : t(' : à venir')}
              </span>
            </span>
            {st.state === 'current' && <span className="block text-sm font-bold text-[var(--color-ocre-700)]">{t('En cours…')}</span>}
            {st.state === 'skipped' && <span className="block text-sm text-[var(--fg-muted)]">{t('Non nécessaire')}</span>}
            {st.hint && st.state === 'done' && <span className="block text-sm text-[var(--fg-muted)]">{st.hint}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Qui a été prévenu de la demande : la banque de sang (toujours), les donneurs compatibles par canal
 * et le rayon atteint, les sites de transfusion qui ont du stock compatible à moins de 60 km.
 */
function Notified({
  dispatch, memo, quantity, group, compatible, stockEnough, final, t, locale,
}: {
  dispatch?: Dispatch; memo: BloodCreateMemo | null; quantity: number; group: string; compatible: string[]; stockEnough: boolean; final: boolean; t: T; locale: Locale;
}) {
  const alerted = dispatch?.donorsAlerted ?? memo?.autoAlerted ?? 0;
  const sites = dispatch?.stockNearby.length ? dispatch.stockNearby : (memo?.stockCheck.sites ?? []).filter((s) => s.distanceKm <= 60);
  const units = dispatch?.nearbyUnits ?? memo?.stockCheck.nearbyUnits ?? 0;
  const channels = Object.entries(dispatch?.byChannel ?? {}).filter(([, n]) => n > 0);
  const noDonor = !final && !stockEnough && alerted === 0 && (dispatch?.volunteers ?? 0) === 0;
  return (
    <section aria-labelledby="h-notified" className="card p-5">
      <h2 id="h-notified" className="text-xl font-bold">
        {t('Qui a été prévenu')}
      </h2>
      <ul className="mt-3 space-y-3">
        <NotifiedRow Icon={Building2} ok={(dispatch?.antsNotified ?? 1) > 0} title={t('Banque de sang (ANTS)')}>
          {t('Prévenue dans l’application et par SMS : elle peut réserver des poches.')}
        </NotifiedRow>
        <NotifiedRow Icon={Users} ok={alerted > 0} title={alerted > 1 ? t('{n} donneurs compatibles', { n: alerted }) : alerted === 1 ? t('1 donneur compatible') : t('Aucun donneur alerté')}>
          {alerted > 0
            ? `${channels.map(([c, n]) => `${t(CHANNEL_LABEL[c] ?? c)} ${n}`).join(' · ')}${dispatch?.radiusKm ? ` · ${t('à moins de {km} km', { km: dispatch.radiusKm })}` : ''}`
            : stockEnough
              ? t('Inutile : le stock compatible suffit.')
              : t('Personne de compatible et disponible, même à 150 km.')}
        </NotifiedRow>
        {(dispatch?.volunteers ?? 0) > 0 && (
          <NotifiedRow Icon={HandHeart} ok title={dispatch!.volunteers > 1 ? t('{n} donneurs se sont proposés', { n: dispatch!.volunteers }) : t('1 donneur s’est proposé')}>
            {t('Depuis « Demandes près de chez vous ».')}
          </NotifiedRow>
        )}
        <NotifiedRow Icon={Warehouse} ok={stockEnough} title={units > 1 ? t('{n} poches compatibles à moins de 60 km', { n: units }) : units === 1 ? t('1 poche compatible à moins de 60 km') : t('Aucune poche compatible à moins de 60 km')}>
          {t('Groupes compatibles pour un receveur {group} :', { group })} {compatible.join(', ')}
        </NotifiedRow>
      </ul>
      {noDonor && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--color-danger-50)] p-3 font-bold text-[var(--color-danger-800)]">
          {t('Aucun donneur compatible disponible, même à 150 km. La banque de sang est prévenue : appelez-la pour organiser l’envoi de poches.')}
        </p>
      )}
      {sites.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">{t('Sites de transfusion ayant du stock compatible')}</caption>
          <thead>
            <tr className="text-left text-[var(--fg-muted)]">
              <th scope="col" className="py-1 font-bold">{t('Site')}</th>
              <th scope="col" className="py-1 text-right font-bold">{t('Poches')}</th>
              <th scope="col" className="py-1 text-right font-bold">{t('Distance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sites.slice(0, 5).map((s) => (
              <tr key={s.site}>
                <td className="py-1.5">{s.site}</td>
                <td className="num py-1.5 text-right font-bold">{s.units}</td>
                <td className="num py-1.5 text-right">{km(s.distanceKm, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="sr-only">{t('Demande de {n} poches.', { n: quantity })}</p>
    </section>
  );
}

function NotifiedRow({ Icon, ok, title, children }: { Icon: LucideIcon; ok: boolean; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${ok ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--bg)] text-[var(--fg-muted)]'}`}>
        <Icon size={20} />
      </span>
      <span className="min-w-0 pt-0.5">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-[var(--fg-muted)]">{children}</span>
      </span>
    </li>
  );
}
