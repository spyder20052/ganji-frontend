'use client';
import { AlarmClock, BadgeCheck, Check, CalendarClock, Loader2, Moon, RefreshCw, Sun, SunDim, Sunset, Utensils, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useLocale, useT } from '@/i18n/client';
import type { T } from '@/i18n/translate';
import { api, ApiError } from '@/lib/api';
import { fmtDate, fmtTime } from '@/lib/format';
import { AskBox } from './AskBox';
import { EARLY_MS, MEAL_LABEL, momentOf, type Adherence, type Dose, type DoseStatus, type PlanRx, type Today } from './_lib/assistant';

const MOMENT_ICON = { MATIN: SunDim, MIDI: Sun, SOIR: Sunset, NUIT: Moon } as const;

const STATUS: Record<DoseStatus, { label: string; cls: string }> = {
  A_VENIR: { label: 'Prévue', cls: 'bg-[var(--bg)] text-[var(--fg-muted)]' },
  A_PRENDRE: { label: 'Maintenant', cls: 'bg-[var(--color-leaf)] text-[var(--color-ink)]' },
  EN_RETARD: { label: 'En retard', cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' },
  DECALEE: { label: 'Reportée', cls: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' },
  PRISE: { label: 'Pris', cls: 'bg-[var(--color-leaf)] text-[var(--color-ink)]' },
  OUBLIEE: { label: 'Oubliée', cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' },
};

interface Advice { medication: string; text: string; source: string }

/**
 * Tableau de bord du traitement : les prises du jour (grandes cartes, « Pris » / « Oublié »),
 * l'observance de la semaine et les ordonnances à transformer en plan de prises.
 */
export function AssistantBoard({
  initialToday,
  initialAdherence,
  initialPlans,
  patientId,
  who,
  canAsk,
}: {
  initialToday: Today;
  initialAdherence: Adherence | null;
  initialPlans: PlanRx[] | null;
  /** Personne aidée (aidant) ; absent pour soi-même. */
  patientId?: string;
  who?: string;
  /** Questions sur le traitement : il faut pouvoir lire les ordonnances (soi-même, ou délégation « ordonnances »). */
  canAsk: boolean;
}) {
  const t = useT();
  const [today, setToday] = useState(initialToday);
  const [adherence, setAdherence] = useState(initialAdherence);
  const [plans, setPlans] = useState(initialPlans);
  const q = patientId ? `?patientId=${patientId}` : '';

  const reload = useCallback(async () => {
    const [td, ad, pl] = await Promise.all([
      api<Today>(`/me/assistant/today${q}`),
      api<Adherence>(`/me/assistant/adherence${q}`).catch(() => null),
      plans ? api<PlanRx[]>(`/me/assistant/plans${q}`).catch(() => plans) : Promise.resolve(null),
    ]);
    setToday(td);
    setAdherence(ad);
    setPlans(pl);
  }, [q, plans]);

  const onDose = useCallback(
    (d: Dose) => {
      setToday((cur) => ({ ...cur, doses: cur.doses.map((x) => (x.reminderId === d.reminderId ? d : x)), done: cur.doses.filter((x) => (x.reminderId === d.reminderId ? d : x).status === 'PRISE').length }));
      api<Adherence>(`/me/assistant/adherence${q}`).then(setAdherence).catch(() => undefined);
    },
    [q],
  );

  const pendingPlan = plans?.some((p) => !p.plan.active && p.items.some((i) => i.times.length > 0));

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <div className="space-y-5">
        <TodaySection today={today} q={q} who={who} onDose={onDose} pendingPlan={!!pendingPlan} />
        {canAsk && <AskBox patientId={patientId} />}
      </div>
      <div className="space-y-5">
        {adherence && adherence.last30.due > 0 && <WeekSection adherence={adherence} />}
        {plans && <PlansSection plans={plans} q={q} onCreated={reload} t={t} />}
      </div>
    </div>
  );
}

// ─── Aujourd'hui ─────────────────────────────────────────────────────

function TodaySection({ today, q, who, onDose, pendingPlan }: { today: Today; q: string; who?: string; onDose: (d: Dose) => void; pendingPlan: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [advice, setAdvice] = useState<Record<string, Advice>>({});
  const date = fmtDate(`${today.date}T12:00:00Z`, { weekday: 'long', day: 'numeric', month: 'long' }, locale);
  const listen = today.doses.length
    ? [
        t('Aujourd’hui : {n} prises.', { n: today.doses.length }),
        ...today.doses.map((d) => t('{time} : {medication}, {dose}.', { time: d.time, medication: d.masked ? t(d.medication) : d.medication, dose: d.dose ?? '' })),
        t('Touchez « Pris » quand c’est fait.'),
      ].join(' ')
    : t('Pas de prise prévue aujourd’hui.');

  return (
    <section aria-labelledby="h-jour" className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="h-jour" className="text-xl font-semibold">{who ? t('Aujourd’hui · {who}', { who }) : t('Aujourd’hui')}</h2>
          <p className="text-base text-[var(--fg-muted)] first-letter:uppercase">{date}</p>
        </div>
        {today.doses.length > 0 && (
          <span className="num shrink-0 rounded-full bg-[var(--color-brand-100)] px-3 py-1 text-lg font-semibold text-[var(--color-brand-900)]" aria-label={t('{done} prises faites sur {n}', { done: today.done, n: today.doses.length })}>
            {today.done}/{today.doses.length}
          </span>
        )}
        <ListenButton text={listen} compact />
      </div>

      {today.doses.length === 0 ? (
        <div className="space-y-3 rounded-3xl bg-[var(--bg)] p-4">
          <p className="text-lg">{t('Pas de prise prévue aujourd’hui.')}</p>
          {pendingPlan && (
            <a href="#h-plans" className="btn btn-primary w-full sm:w-auto">
              <CalendarClock size={20} aria-hidden /> {t('Créer mon plan de prises')}
            </a>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {today.doses.map((d) => (
            <li key={d.reminderId}>
              <DoseCard dose={d} q={q} onDose={onDose} onAdvice={(a) => setAdvice((m) => ({ ...m, [d.reminderId]: a }))} advice={advice[d.reminderId]} />
            </li>
          ))}
        </ul>
      )}
      {today.tomorrow && today.doses.every((d) => d.status === 'PRISE' || d.status === 'OUBLIEE') && (
        <p className="mt-4 flex items-center gap-2 text-base text-[var(--fg-muted)]">
          <AlarmClock size={18} aria-hidden />
          {t('Prochaine prise : demain à {time}, {medication}.', { time: today.tomorrow.time, medication: today.tomorrow.masked ? t(today.tomorrow.medication) : today.tomorrow.medication })}
        </p>
      )}
    </section>
  );
}

function DoseCard({ dose: d, q, onDose, onAdvice, advice }: { dose: Dose; q: string; onDose: (d: Dose) => void; onAdvice: (a: Advice) => void; advice?: Advice }) {
  const t = useT();
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ahead = new Date(d.dueAt).getTime() - Date.now();
  const open = d.status === 'A_PRENDRE' || d.status === 'EN_RETARD' || d.status === 'DECALEE' || (d.status === 'A_VENIR' && ahead <= EARLY_MS);
  const canForget = open && ahead <= 30 * 60_000;
  const Moment = MOMENT_ICON[momentOf(d.time)];
  const done = d.status === 'PRISE';
  const s = STATUS[d.status];
  const statusLabel = d.status === 'DECALEE' ? t('Reportée à {time}', { time: d.time }) : t(s.label);
  const name = d.masked ? t(d.medication) : d.medication;

  async function mark(status: 'PRISE' | 'OUBLIEE' | 'DECALEE') {
    setBusy(status);
    setError(null);
    try {
      const r = await api<{ dose: Dose; advice: Advice | null }>(`/me/assistant/doses/${d.reminderId}${q}`, { method: 'POST', json: { status, lang: locale } });
      onDose(r.dose);
      if (r.advice) onAdvice(r.advice);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pas de réseau : réessayez dans un instant.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <article
      aria-label={t('{time}, {medication}', { time: d.time, medication: name })}
      className={`rounded-3xl p-4 ${done ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[var(--color-brand-900)] dark:text-[var(--fg)]' : 'bg-[var(--bg)]'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${done ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)] text-[var(--color-brand-700)]'}`}>
          {done ? <Check size={24} aria-hidden /> : <Moment size={24} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="display num text-[2.4rem] font-light leading-none">{d.time}</p>
            <span className={`pill ${s.cls}`}>
              {done && <BadgeCheck size={16} aria-hidden />} {statusLabel}
            </span>
          </div>
          <p className="mt-2 text-xl font-semibold leading-snug">
            {name} {d.strength && <span className="font-normal">{d.strength}</span>}
          </p>
          <p className={`flex flex-wrap items-center gap-x-2 text-base ${done ? '' : 'text-[var(--fg-muted)]'}`}>
            {d.dose && <span>{d.dose}</span>}
            {d.meal && (
              <span className="inline-flex items-center gap-1">
                <Utensils size={16} aria-hidden /> {t(MEAL_LABEL[d.meal])}
              </span>
            )}
            {done && d.loggedAt && <span>· {t('à {time}', { time: fmtTime(d.loggedAt, locale) })}</span>}
          </p>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => mark('PRISE')}>
            {busy === 'PRISE' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Check size={20} aria-hidden />} {t('Pris')}
          </button>
          {canForget ? (
            <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={() => mark('OUBLIEE')}>
              {busy === 'OUBLIEE' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <X size={20} aria-hidden />} {t('Oublié')}
            </button>
          ) : (
            <span />
          )}
          {canForget && d.status !== 'DECALEE' && (
            <button type="button" className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 text-base font-semibold text-[var(--fg-muted)] underline-offset-4 hover:underline" disabled={busy !== null} onClick={() => mark('DECALEE')}>
              <AlarmClock size={18} aria-hidden /> {t('Plus tard (dans 30 min)')}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 font-semibold text-[var(--color-ocre-700)]">{t(error)}</p>}

      {advice && d.status === 'OUBLIEE' && (
        <div role="status" className="mt-3 space-y-2 rounded-2xl bg-[var(--card)] p-3">
          <p className="text-base">
            <span className="font-semibold">{t('Que faire ?')} </span>
            {advice.text}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-[var(--fg-muted)]">{advice.source}</span>
            <ListenButton text={advice.text} />
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Ma semaine ──────────────────────────────────────────────────────

function WeekSection({ adherence }: { adherence: Adherence }) {
  const t = useT();
  const locale = useLocale();
  const rate = adherence.last7.rate;
  const R = 42;
  const C = 2 * Math.PI * R;
  const good = rate !== null && rate >= 80;
  const listen =
    rate === null
      ? t('Pas encore de prise à compter cette semaine.')
      : t('Cette semaine, {taken} prises sur {due} ont été faites : {rate} %.', { taken: adherence.last7.taken, due: adherence.last7.due, rate });

  return (
    <section aria-labelledby="h-semaine" className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="h-semaine" className="text-xl font-semibold">{t('Ma semaine')}</h2>
        <ListenButton text={listen} compact />
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0" role="img" aria-label={rate === null ? t('Pas encore de prise à compter') : t('{rate} % des prises faites sur 7 jours', { rate })}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--bg)" strokeWidth="10" />
            {rate !== null && (
              <circle cx="50" cy="50" r={R} fill="none" stroke={good ? 'var(--color-leaf)' : 'var(--color-ocre-500)'} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(C * rate) / 100} ${C}`} />
            )}
          </svg>
          <span className="display num absolute inset-0 grid place-items-center text-[1.9rem] font-light">{rate === null ? '—' : `${rate}%`}</span>
        </div>
        {/* Les 7 jours en gélules : pleines quand tout est pris. */}
        <ol className="flex flex-1 items-end justify-between gap-1" aria-label={t('Prises des 7 derniers jours')}>
          {adherence.days.map((d, i) => {
            const isToday = i === adherence.days.length - 1;
            const day = fmtDate(`${d.date}T12:00:00Z`, { weekday: 'narrow' }, locale);
            const full = fmtDate(`${d.date}T12:00:00Z`, { weekday: 'long' }, locale);
            return (
              <li key={d.date} className="flex flex-col items-center gap-1">
                <span className={`relative block h-16 w-6 overflow-hidden rounded-full ${d.due ? 'bg-[var(--bg)]' : 'border-2 border-dashed border-[var(--border)]'}`}>
                  {d.rate !== null && d.rate > 0 && (
                    <span className={`absolute inset-x-0 bottom-0 ${d.rate >= 80 ? 'bg-[var(--color-leaf)]' : 'bg-[var(--color-ocre-500)]'}`} style={{ height: `${d.rate}%` }} />
                  )}
                </span>
                <span aria-hidden className={`text-sm uppercase ${isToday ? 'font-bold' : 'text-[var(--fg-muted)]'}`}>{day}</span>
                <span className="sr-only">
                  {d.due ? t('{day} : {taken} sur {due}', { day: full, taken: d.taken, due: d.due }) : t('{day} : aucune prise', { day: full })}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {adherence.last30.rate !== null && (
        <p className="mt-4 text-base text-[var(--fg-muted)]">{t('30 jours : {rate} % ({taken} sur {due})', { rate: adherence.last30.rate, taken: adherence.last30.taken, due: adherence.last30.due })}</p>
      )}
    </section>
  );
}

// ─── Ordonnances → plan de prises ────────────────────────────────────

function PlansSection({ plans, q, onCreated, t }: { plans: PlanRx[]; q: string; onCreated: () => Promise<void>; t: T }) {
  const locale = useLocale();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  async function create(rx: PlanRx) {
    setBusy(rx.id);
    setMessage(null);
    try {
      const r = await api<{ created: number }>(`/me/assistant/plan${q}`, { method: 'POST', json: { prescriptionId: rx.id } });
      await onCreated();
      setMessage({ id: rx.id, text: t('Plan créé : {n} rappels par SMS et dans l’application.', { n: r.created }) });
    } catch (e) {
      setMessage({ id: rx.id, text: e instanceof ApiError ? e.message : 'Pas de réseau : réessayez dans un instant.', error: true });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="h-plans" className="card p-5 sm:p-6">
      <h2 id="h-plans" className="mb-4 text-xl font-semibold">{t('Mes ordonnances')}</h2>
      {plans.length === 0 ? (
        <p className="rounded-3xl bg-[var(--bg)] p-4 text-base text-[var(--fg-muted)]">{t('Aucune ordonnance en cours.')}</p>
      ) : (
        <ul className="space-y-4">
          {plans.map((rx) => {
            const plannable = rx.items.some((i) => i.times.length > 0);
            return (
              <li key={rx.id} className="space-y-3 rounded-3xl bg-[var(--bg)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-base text-[var(--fg-muted)]">
                    {rx.prescriber} · {fmtDate(rx.issuedAt, { day: 'numeric', month: 'short' }, locale)}
                  </p>
                  <span className={`pill ${rx.status === 'ACTIVE' ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'bg-[var(--card)] text-[var(--fg-muted)]'}`}>
                    {rx.status === 'ACTIVE' ? t('À retirer') : t('Délivrée')}
                  </span>
                </div>
                <ul className="space-y-3">
                  {rx.items.map((i) => (
                    <li key={i.dci}>
                      <p className="font-semibold leading-snug">
                        {i.dci} <span className="font-normal">{i.strength}</span>
                      </p>
                      <p className="text-base text-[var(--fg-muted)]">« {i.dosage} » · {i.duration}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {i.times.map((time) => {
                          const Moment = MOMENT_ICON[momentOf(time)];
                          return (
                            <span key={time} className="pill num bg-[var(--card)] text-[var(--fg)]">
                              <Moment size={16} aria-hidden /> {time}
                            </span>
                          );
                        })}
                        {i.asNeeded && <span className="pill bg-[var(--card)] text-[var(--fg)]">{t('Si besoin')}</span>}
                        {!i.understood && <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">{t('Heure à demander au pharmacien')}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
                {rx.plan.active ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="pill bg-[var(--color-leaf)] text-[var(--color-ink)]">
                      <BadgeCheck size={16} aria-hidden />
                      {rx.plan.until ? t('Plan actif · jusqu’au {date}', { date: fmtDate(rx.plan.until, { day: 'numeric', month: 'short' }, locale) }) : t('Plan actif')}
                    </span>
                    <button type="button" className="btn btn-ghost !min-h-12" disabled={busy !== null} onClick={() => create(rx)}>
                      {busy === rx.id ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <RefreshCw size={18} aria-hidden />} {t('Refaire')}
                    </button>
                  </div>
                ) : rx.plan.replacedBy ? (
                  <p className="text-base text-[var(--fg-muted)]">
                    {rx.plan.replacedBy.issuedAt
                      ? t('Remplacée par l’ordonnance du {date}.', { date: fmtDate(rx.plan.replacedBy.issuedAt, { day: 'numeric', month: 'short' }, locale) })
                      : t('Remplacée par une ordonnance plus récente.')}
                  </p>
                ) : (
                  <button type="button" className="btn btn-primary w-full !px-3" disabled={busy !== null || !plannable} onClick={() => create(rx)}>
                    {busy === rx.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <CalendarClock size={20} aria-hidden />}
                    {t('Créer mon plan de prises')}
                  </button>
                )}
                {message?.id === rx.id && (
                  <p role={message.error ? 'alert' : 'status'} className={`text-base font-semibold ${message.error ? 'text-[var(--color-ocre-700)]' : 'text-[var(--color-brand-700)]'}`}>
                    {t(message.text)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
