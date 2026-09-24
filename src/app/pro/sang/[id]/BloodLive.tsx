'use client';
import Link from 'next/link';
import {
  BadgeCheck, Check, Droplet, ExternalLink, MessageSquareText, PhoneCall, RefreshCw, Smartphone, Warehouse, WifiOff, type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, fmtTime, relative } from '@/lib/format';
import type { BloodRequestView } from '@/lib/types';
import { BLOOD_STATUS, BLOOD_URGENCY, CHANNEL_LABEL, DONOR_STATUS, PRODUCT_LABEL, km, whenFr } from '../../_lib/labels';
import type { BloodCreateMemo } from '../../_lib/types';
import { ErrorNote, OkNote, Pill } from '../../_lib/ui';

const POLL_MS = 3000;
const FINAL = new Set(['SERVIE', 'ANNULEE']);
const CAN_ALERT = new Set(['OUVERTE', 'DONNEURS_ALERTES']);
const CHANNEL_ICON: Record<string, LucideIcon> = { APP: Smartphone, SMS: MessageSquareText, VOICE: PhoneCall };
const DONOR_ORDER: Record<string, number> = { ACCEPTEE: 0, ENVOYEE: 1, REFUSEE: 2, EXPIREE: 3 };

type Donor = NonNullable<BloodRequestView['donors']>[number];

export function BloodLive({ id, initial }: { id: string; initial: BloodRequestView }) {
  const [data, setData] = useState(initial);
  const [memo, setMemo] = useState<BloodCreateMemo | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date>(() => new Date());
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState<'alert' | 'served' | null>(null);
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
      const d = await api<BloodRequestView>(`/blood/requests/${id}`);
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
      const r = await api<{ alerted: number }>(`/blood/requests/${id}/alert-donors`, { method: 'POST' });
      setNote(r.alerted ? `${r.alerted} nouveau${r.alerted > 1 ? 'x' : ''} donneur${r.alerted > 1 ? 's' : ''} alerté${r.alerted > 1 ? 's' : ''}.` : 'Aucun autre donneur compatible disponible à moins de 40 km pour le moment. La banque de sang est informée.');
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Relance impossible. Réessayez.');
    } finally {
      setBusy(null);
    }
  }

  async function markServed() {
    setBusy('served');
    setError(null);
    setNote(null);
    try {
      await api(`/blood/requests/${id}/served`, { method: 'POST' });
      setConfirmServed(false);
      await refresh();
      setNote(`Transfusion inscrite dans le carnet de ${data.patient}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Enregistrement impossible. Réessayez.');
    } finally {
      setBusy(null);
    }
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
  const stockEnough = memo ? memo.stockCheck.nearbyUnits >= data.quantity : false;

  return (
    <div className="space-y-5">
      <Link href="/pro" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← Mes patients
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
          <p className="label">Demande de sang · {data.patient}</p>
          <h1 id="h-req" className="text-2xl font-bold">
            {data.quantity} poche{data.quantity > 1 ? 's' : ''} de {PRODUCT_LABEL[data.product]?.toLowerCase() ?? data.productLabel} · {data.bloodGroup}
          </h1>
          <p className="text-[var(--fg-muted)]">
            {data.facility} · demandé par {data.requester} {relative(data.createdAt)} · nécessaire avant le {fmtDateTime(data.neededBy)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
          {urgency && <Pill tone={urgency.tone}>Urgence {urgency.label.toLowerCase()}</Pill>}
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
      </section>

      {/* Bandeau de succès */}
      {data.status === 'DONNEUR_TROUVE' && first && (
        <section role="status" className="card flex flex-wrap items-center gap-4 !border-0 bg-[var(--color-brand-900)] p-5 text-white">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white text-[var(--color-brand-900)]">
            <BadgeCheck size={32} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">Donneur trouvé</p>
            <p className="text-lg text-[var(--color-brand-100)]">
              {first.firstName} ({first.bloodGroup}, {km(first.distanceKm)}) viendra {first.appointment ? whenFr(first.appointment) : 'bientôt'} à {data.facility}.
              {accepted.length > 1 && ` ${accepted.length - 1} autre${accepted.length > 2 ? 's' : ''} donneur${accepted.length > 2 ? 's ont' : ' a'} aussi dit oui.`}
            </p>
            <p className="mt-1 text-sm text-[var(--color-brand-200)]">Le donneur a reçu son rendez-vous par SMS ; la famille du patient est prévenue dans sa langue.</p>
          </div>
        </section>
      )}
      {data.status === 'SERVIE' && (
        <section role="status" className="card flex items-center gap-4 bg-[var(--color-brand-100)] p-5 text-[var(--color-brand-900)]">
          <Check size={28} aria-hidden />
          <p className="text-lg font-bold">Transfusion faite et inscrite dans le carnet de {data.patient}. Demande clôturée.</p>
        </section>
      )}

      {/* Compteurs en direct */}
      <section aria-labelledby="h-live" className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="h-live" className="flex-1 text-xl font-bold">
            Appel aux donneurs
          </h2>
          <LiveBadge final={final} online={online} updatedAt={updatedAt} />
        </div>
        <p className="sr-only" aria-live="polite">
          {data.counts.alerted} donneurs alertés, {data.counts.accepted} ont dit oui, {data.counts.declined} ont dit non, {data.counts.waiting} en attente. {status.label}.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" aria-hidden>
          <Counter label="Donneurs alertés" value={data.counts.alerted} tone="neutral" />
          <Counter label="Ont dit oui" value={data.counts.accepted} tone="yes" />
          <Counter label="Ont dit non" value={data.counts.declined} tone="no" />
          <Counter label="En attente" value={data.counts.waiting} tone="wait" />
        </dl>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-5">
          {/* Étapes */}
          <section aria-labelledby="h-steps" className="card p-5">
            <h2 id="h-steps" className="text-xl font-bold">
              Où en est la demande
            </h2>
            <Stepper data={data} stockEnough={stockEnough} />
          </section>

          {/* Vérification de stock */}
          {memo && (
            <section aria-labelledby="h-stock" className="card p-5">
              <h2 id="h-stock" className="flex items-center gap-2 text-xl font-bold">
                <Warehouse size={20} aria-hidden /> Stocks vérifiés
              </h2>
              <p className={`mt-3 rounded-2xl p-3 font-bold ${stockEnough ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]'}`}>
                {stockEnough
                  ? `Stock suffisant à moins de 60 km : ${memo.stockCheck.nearbyUnits} poche${memo.stockCheck.nearbyUnits > 1 ? 's' : ''} compatible${memo.stockCheck.nearbyUnits > 1 ? 's' : ''}.`
                  : `Stock insuffisant à moins de 60 km${memo.stockCheck.nearbyUnits ? ` (${memo.stockCheck.nearbyUnits} poche${memo.stockCheck.nearbyUnits > 1 ? 's' : ''})` : ''} : ${memo.autoAlerted ?? data.counts.alerted} donneurs compatibles alertés.`}
              </p>
              <p className="mt-3 text-sm text-[var(--fg-muted)]">
                Groupes compatibles pour un receveur {data.bloodGroup} :{' '}
                {memo.stockCheck.compatibleGroups.map((g) => (
                  <span key={g} className="pill mr-1 border border-[var(--border)] !px-2 !text-xs">
                    {g}
                  </span>
                ))}
              </p>
              {memo.stockCheck.sites.length > 0 ? (
                <table className="mt-3 w-full text-sm">
                  <caption className="sr-only">Sites de transfusion ayant du stock compatible</caption>
                  <thead>
                    <tr className="text-left text-[var(--fg-muted)]">
                      <th scope="col" className="py-1 font-bold">Site</th>
                      <th scope="col" className="py-1 text-right font-bold">Poches</th>
                      <th scope="col" className="py-1 text-right font-bold">Distance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {memo.stockCheck.sites.slice(0, 6).map((s) => (
                      <tr key={s.site} className={s.distanceKm > 60 ? 'text-[var(--fg-muted)]' : ''}>
                        <td className="py-1.5">{s.site}</td>
                        <td className="num py-1.5 text-right font-bold">{s.units}</td>
                        <td className="num py-1.5 text-right">{km(s.distanceKm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-3 text-sm">Aucun stock compatible déclaré dans le pays.</p>
              )}
            </section>
          )}
        </div>

        {/* Donneurs */}
        <section aria-labelledby="h-donors" className="card p-5">
          <h2 id="h-donors" className="text-xl font-bold">
            Donneurs sollicités
          </h2>
          <p className="text-sm text-[var(--fg-muted)]">Donneurs compatibles, disponibles et en âge de donner, du plus proche au plus lointain (40 km au plus). Seul le prénom est affiché.</p>
          {donors.length === 0 ? (
            <p className="mt-4 text-[var(--fg-muted)]">{stockEnough ? 'Aucun donneur alerté : le stock compatible suffit.' : 'Aucun donneur alerté pour l’instant.'}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[0.95rem]">
                <caption className="sr-only">Liste des donneurs alertés et leur réponse</caption>
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
                    <th scope="col" className="py-2 pr-2 font-bold">Prénom</th>
                    <th scope="col" className="py-2 pr-2 font-bold">Groupe</th>
                    <th scope="col" className="py-2 pr-2 text-right font-bold">Distance</th>
                    <th scope="col" className="py-2 pr-2 font-bold">Canal</th>
                    <th scope="col" className="py-2 font-bold">Réponse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {donors.map((d) => (
                    <DonorRow key={d.id} d={d} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className="btn btn-soft" onClick={alertMore} disabled={busy !== null || !CAN_ALERT.has(data.status)}>
              <RefreshCw size={18} aria-hidden className={busy === 'alert' ? 'animate-spin' : ''} /> {busy === 'alert' ? 'Relance…' : 'Relancer d’autres donneurs'}
            </button>
            {!final &&
              (confirmServed ? (
                <span className="flex flex-wrap items-center gap-2 rounded-full border border-[var(--border)] p-1 pl-4">
                  <span className="font-bold">La transfusion est faite ?</span>
                  <button type="button" className="btn btn-primary" onClick={markServed} disabled={busy !== null}>
                    {busy === 'served' ? 'Enregistrement…' : 'Oui, confirmer'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setConfirmServed(false)} disabled={busy !== null}>
                    Non
                  </button>
                </span>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setConfirmServed(true)} disabled={busy !== null}>
                  <Check size={18} aria-hidden /> Transfusion faite
                </button>
              ))}
          </div>
          <div className="mt-3 space-y-2">
            <OkNote>{note}</OkNote>
            <ErrorNote>{error}</ErrorNote>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-3">
            <p className="min-w-0 flex-1 text-sm text-[var(--fg-muted)]">
              Démonstration : répondez « 1 » comme un donneur sur un téléphone simple. Cet écran se met à jour tout seul.
            </p>
            <a href="/simulateur" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-11 text-base">
              Ouvrir le simulateur SMS <ExternalLink size={16} aria-hidden />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

function DonorRow({ d }: { d: Donor }) {
  const Icon = CHANNEL_ICON[d.channel] ?? Smartphone;
  const st = DONOR_STATUS[d.status] ?? { label: d.status, tone: 'muted' as const };
  return (
    <tr className={d.status === 'ACCEPTEE' ? 'bg-[var(--color-brand-50)] dark:bg-transparent' : ''}>
      <td className="py-2 pr-2">
        <span className="font-bold">{d.firstName}</span>
        {d.city && <span className="block text-sm text-[var(--fg-muted)]">{d.city}</span>}
      </td>
      <td className="num py-2 pr-2 font-bold">{d.bloodGroup}</td>
      <td className="num py-2 pr-2 text-right">{km(d.distanceKm)}</td>
      <td className="py-2 pr-2">
        <span className="inline-flex items-center gap-1.5" title={CHANNEL_LABEL[d.channel]}>
          <Icon size={18} aria-hidden />
          <span className="text-sm">{CHANNEL_LABEL[d.channel] ?? d.channel}</span>
        </span>
      </td>
      <td className="py-2">
        <Pill tone={st.tone}>{st.label}</Pill>
        {d.status === 'ACCEPTEE' && d.appointment && <span className="mt-0.5 block text-sm font-bold text-[var(--color-brand-700)]">RDV {whenFr(d.appointment)}</span>}
      </td>
    </tr>
  );
}

function LiveBadge({ final, online, updatedAt }: { final: boolean; online: boolean; updatedAt: Date }) {
  if (final) return <span className="pill border border-[var(--border)] text-[var(--fg-muted)]">Demande clôturée</span>;
  if (!online)
    return (
      <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
        <WifiOff size={14} aria-hidden /> Réseau instable · nouvel essai dans 3 s
      </span>
    );
  return (
    <span className="pill border border-[var(--border)] text-[var(--fg-muted)]">
      <span aria-hidden className="relative inline-flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-500)] opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-brand-500)]" />
      </span>
      En direct · <span className="num" suppressHydrationWarning>{fmtTime(updatedAt)}:{String(updatedAt.getSeconds()).padStart(2, '0')}</span>
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

function Stepper({ data, stockEnough }: { data: BloodRequestView; stockEnough: boolean }) {
  const s = data.status;
  const alertedDone = data.counts.alerted > 0 || ['DONNEURS_ALERTES', 'DONNEUR_TROUVE'].includes(s);
  const foundDone = data.counts.accepted > 0 || s === 'DONNEUR_TROUVE';
  const served = s === 'SERVIE';
  const raw: { label: string; hint?: string; done: boolean; skipped?: boolean }[] = [
    { label: 'Demande créée', hint: fmtDateTime(data.createdAt), done: true },
    { label: 'Stock vérifié', hint: stockEnough ? 'Stock compatible suffisant' : 'Sites à moins de 60 km', done: true },
    { label: 'Donneurs alertés', hint: alertedDone ? `${data.counts.alerted} donneurs · application, SMS, voix` : undefined, done: alertedDone, skipped: !alertedDone && (stockEnough || served) },
    { label: 'Donneur trouvé', hint: foundDone ? `${data.counts.accepted} oui` : undefined, done: foundDone, skipped: !foundDone && served },
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
              {st.label}
              <span className="sr-only">
                {st.state === 'done' ? ' : fait' : st.state === 'current' ? ' : en cours' : st.state === 'skipped' ? ' : non nécessaire' : ' : à venir'}
              </span>
            </span>
            {st.state === 'current' && <span className="block text-sm font-bold text-[var(--color-ocre-700)]">En cours…</span>}
            {st.state === 'skipped' && <span className="block text-sm text-[var(--fg-muted)]">Non nécessaire</span>}
            {st.hint && st.state === 'done' && <span className="block text-sm text-[var(--fg-muted)]">{st.hint}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
