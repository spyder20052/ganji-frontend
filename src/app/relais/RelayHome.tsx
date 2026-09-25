'use client';
import { ArrowLeft, CheckCircle2, CloudOff, Loader2, Minus, Plus, RefreshCw, Send, Siren } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AlertCard } from '@/components/AlertCard';
import { CommuneSelect } from '@/components/CommuneSelect';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { api } from '@/lib/api';
import { SYNDROMES, type CommunityReport, type HealthAlert } from '@/lib/alerts';
import { fmtDateTime } from '@/lib/format';
import { useLocale, useT } from '@/i18n/client';
import { flushQueue, readQueue, sendOrQueue, type QueuedAction } from '@/lib/offline-queue';

const PATH = '/community-reports';
const DEFAULT_COMMUNE = 'Djougou';
const COMMUNE_KEY = 'ganji-relay-commune';
/** Syndromes à notification immédiate (un seul signalement suffit). */
const IMMEDIATE = new Set(['PARALYSIE', 'FIEVRE_HEMORRAGIQUE']);

interface ReportBody { syndrome: string; cases: number; commune: string; village?: string; offline: boolean; observedAt: string }
interface ReportResult { id: string; clusterAlert: boolean; alerts: string[] }

type Step = 1 | 2 | 3 | 'done';

const STEP_TEXT: Record<1 | 2 | 3, string> = {
  1: 'Geste 1 : qu’avez-vous vu ? Touchez le dessin qui correspond.',
  2: 'Geste 2 : combien de personnes sont malades ? Touchez plus ou moins.',
  3: 'Geste 3 : où ? Écrivez le nom du village, vérifiez la commune, puis envoyez.',
};

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const up = () => setOnline(navigator.onLine);
    up();
    window.addEventListener('online', up);
    window.addEventListener('offline', up);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', up);
    };
  }, []);
  return online;
}

export function RelayHome() {
  const t = useT();
  const locale = useLocale();
  const online = useOnline();
  const [step, setStep] = useState<Step>(1);
  const [syndrome, setSyndrome] = useState<string | null>(null);
  const [cases, setCases] = useState(1);
  const [village, setVillage] = useState('');
  const [commune, setCommune] = useState(DEFAULT_COMMUNE);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ queued: boolean; result?: ReportResult } | null>(null);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [flushed, setFlushed] = useState(0);
  const [reports, setReports] = useState<CommunityReport[] | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[] | null>(null);
  const [activityError, setActivityError] = useState(false);

  // Commune de travail du relais, retenue sur le téléphone.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COMMUNE_KEY);
      if (saved) setCommune(saved);
    } catch {}
  }, []);

  const loadActivity = useCallback(() => {
    if (!navigator.onLine) return;
    setActivityError(false);
    Promise.all([api<CommunityReport[]>(`${PATH}?days=14`), api<HealthAlert[]>(`/alerts?commune=${encodeURIComponent(commune)}`)])
      .then(([r, a]) => {
        setReports(r);
        setAlerts(a);
      })
      .catch(() => setActivityError(true));
  }, [commune]);

  const flush = useCallback(async () => {
    const n = await flushQueue();
    if (n > 0) {
      setFlushed((x) => x + n);
      loadActivity();
    }
  }, [loadActivity]);

  // File hors ligne : compteur à jour, envoi au montage, au retour du réseau et sur demande du service worker.
  useEffect(() => {
    const sync = () => setQueue(readQueue());
    sync();
    void flush();
    const onOnline = () => void flush();
    const onSw = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === 'ganji-sync') void flush();
    };
    window.addEventListener('ganji-queue', sync);
    window.addEventListener('online', onOnline);
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => {
      window.removeEventListener('ganji-queue', sync);
      window.removeEventListener('online', onOnline);
      navigator.serviceWorker?.removeEventListener('message', onSw);
    };
  }, [flush]);

  useEffect(loadActivity, [loadActivity]);

  const chosen = SYNDROMES.find((s) => s.code === syndrome) ?? null;
  const pending = queue.filter((q) => q.path === PATH);

  function reset() {
    setStep(1);
    setSyndrome(null);
    setCases(1);
    setVillage('');
    setOutcome(null);
    setError(null);
  }

  async function send() {
    if (!chosen) return;
    setSending(true);
    setError(null);
    const body: ReportBody = {
      syndrome: chosen.code,
      cases,
      commune,
      ...(village.trim() ? { village: village.trim().slice(0, 60) } : {}),
      offline: !navigator.onLine,
      observedAt: new Date().toISOString(),
    };
    try {
      const r = await sendOrQueue<ReportResult>({
        path: PATH,
        method: 'POST',
        body,
        label: t('Signalement : {syndrome}, {n} cas, {place}', { syndrome: t(chosen.label).toLowerCase(), n: cases, place: village.trim() || commune }),
      });
      setOutcome(r);
      setStep('done');
      try {
        localStorage.setItem(COMMUNE_KEY, commune);
      } catch {}
      if (!r.queued) loadActivity();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const stepNum = step === 'done' ? 3 : step;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">{t('Relais communautaire · surveillance')}</p>
          <h1 className="mt-1 text-3xl font-bold">{t('Signaler en 3 gestes')}</h1>
        </div>
        {pending.length > 0 && (
          <button type="button" onClick={() => void flush()} className="pill !py-2 bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]" disabled={!online}>
            <CloudOff size={16} aria-hidden /> {t('{n} en attente d’envoi', { n: pending.length })} {online && <RefreshCw size={14} aria-hidden />}
          </button>
        )}
      </div>

      {!online && (
        <p className="flex items-start gap-3 rounded-2xl bg-[var(--color-ocre-100)] p-4 font-bold text-[var(--color-ocre-700)]" role="status">
          <CloudOff size={22} className="mt-0.5 shrink-0" aria-hidden />
          {t('Hors ligne : vos signalements sont gardés sur le téléphone et partiront au retour du réseau.')}
        </p>
      )}
      {flushed > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-[var(--color-brand-100)] p-4 font-bold text-[var(--color-brand-900)]" role="status">
          <CheckCircle2 size={22} aria-hidden /> {flushed > 1 ? t('Réseau revenu : {n} signalements envoyés.', { n: flushed }) : t('Réseau revenu : {n} signalement envoyé.', { n: flushed })}
        </p>
      )}

      <section aria-labelledby="h-step" className="card space-y-5 p-5 sm:p-6">
        <ol className="grid grid-cols-3 gap-2" aria-label={t('Étapes')}>
          {[1, 2, 3].map((n) => (
            <li key={n} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${n <= stepNum ? 'bg-[var(--color-brand-900)] text-white' : 'bg-[var(--bg)] text-[var(--fg-muted)]'}`} aria-current={n === step ? 'step' : undefined}>
              <span className="num">{n}</span> {n === 1 ? t('Quoi') : n === 2 ? t('Combien') : t('Où')}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-step" className="text-2xl font-bold">{t('Qu’avez-vous vu ?')}</h2>
              <ListenButton text={`${t(STEP_TEXT[1])} ${SYNDROMES.map((s) => t(s.label)).join(', ')}.`} audioKey="relay.step1" />
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SYNDROMES.map((s) => (
                <li key={s.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setSyndrome(s.code);
                      setStep(2);
                    }}
                    aria-pressed={syndrome === s.code}
                    className={`flex min-h-32 w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 p-4 text-center ${syndrome === s.code ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-100)] text-[var(--color-brand-950)]' : 'border-[var(--border)] bg-[var(--bg)]'}`}
                  >
                    <Pictogram name={s.icon} size={44} className="text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]" />
                    <span className="text-lg font-bold leading-tight">{t(s.label)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 2 && chosen && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-step" className="text-2xl font-bold">{t('Combien de personnes malades ?')}</h2>
              <ListenButton text={t(STEP_TEXT[2])} audioKey="relay.step2" />
            </div>
            <Chosen icon={chosen.icon} label={t(chosen.label)} />
            <div className="flex items-center justify-center gap-6 py-2">
              <button type="button" onClick={() => setCases((n) => Math.max(1, n - 1))} disabled={cases <= 1} className="grid h-20 w-20 place-items-center rounded-full border-2 border-[var(--border)] bg-[var(--card)] disabled:opacity-40" aria-label={t('Une personne de moins')}>
                <Minus size={36} aria-hidden />
              </button>
              <output className="num w-28 text-center text-7xl font-bold" aria-live="polite" aria-label={cases > 1 ? t('{n} personnes', { n: cases }) : t('{n} personne', { n: cases })}>{cases}</output>
              <button type="button" onClick={() => setCases((n) => Math.min(200, n + 1))} className="grid h-20 w-20 place-items-center rounded-full bg-[var(--color-brand-900)] text-white" aria-label={t('Une personne de plus')}>
                <Plus size={36} aria-hidden />
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2" aria-label={t('Raccourcis')}>
              {[1, 2, 5, 10].map((n) => (
                <button key={n} type="button" onClick={() => setCases(n)} className={`btn !min-h-11 !px-5 ${cases === n ? 'btn-soft' : 'btn-ghost'}`}>{n}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={20} aria-hidden /> {t('Retour')}</button>
              <button type="button" className="btn btn-primary flex-1" onClick={() => setStep(3)}>{t('Suivant')}</button>
            </div>
          </>
        )}

        {step === 3 && chosen && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-step" className="text-2xl font-bold">{t('Où ?')}</h2>
              <ListenButton text={t(STEP_TEXT[3])} audioKey="relay.step3" />
            </div>
            <Chosen icon={chosen.icon} label={`${t(chosen.label)} · ${cases > 1 ? t('{n} personnes', { n: cases }) : t('{n} personne', { n: cases })}`} />
            <label className="block">
              <span className="label mb-1.5 block">{t('Village ou quartier')}</span>
              <input className="input !min-h-14 text-lg" value={village} maxLength={60} onChange={(e) => setVillage(e.target.value)} placeholder={t('Ex. Kolokondé')} autoComplete="off" />
            </label>
            <CommuneSelect id="relay-commune" value={commune} onChange={(n) => n && setCommune(n)} label={t('Commune')} allowEmpty={false} />
            {IMMEDIATE.has(chosen.code) && (
              <p className="flex items-start gap-2 rounded-2xl bg-[var(--color-danger-50)] p-3 font-bold text-[var(--color-danger-800)]">
                <Siren size={20} className="mt-0.5 shrink-0" aria-hidden /> {t('Signe à déclarer tout de suite : l’équipe de la zone sanitaire sera prévenue dès l’envoi.')}
              </p>
            )}
            {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={20} aria-hidden /> {t('Retour')}</button>
              <button type="button" className="btn btn-primary !min-h-14 flex-1 text-lg" onClick={send} disabled={sending || !commune}>
                {sending ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Send size={22} aria-hidden />} {t('Envoyer le signalement')}
              </button>
            </div>
          </>
        )}

        {step === 'done' && outcome && (
          <div className="space-y-4" aria-live="polite">
            <h2 id="h-step" className="sr-only">{t('Résultat')}</h2>
            {outcome.queued ? (
              <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-ocre-100)] p-5 text-[var(--color-ocre-700)]">
                <CloudOff size={30} className="shrink-0" aria-hidden />
                <div>
                  <p className="text-xl font-bold">{t('Signalement gardé sur le téléphone')}</p>
                  <p className="font-bold">{t('Il sera envoyé au retour du réseau, avec la date et l’heure d’aujourd’hui.')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-brand-100)] p-5 text-[var(--color-brand-900)]">
                <CheckCircle2 size={30} className="shrink-0" aria-hidden />
                <div>
                  <p className="text-xl font-bold">{t('Signalement envoyé. Merci !')}</p>
                  <p>{t('L’équipe de la zone sanitaire le voit tout de suite.')}</p>
                </div>
              </div>
            )}
            {outcome.result?.clusterAlert && (
              <div className="space-y-2 rounded-2xl border-2 border-[var(--color-ocre-500)] p-5" role="alert">
                <p className="flex items-center gap-2 text-xl font-bold"><Siren size={24} aria-hidden /> {t('Alerte envoyée au médecin chef de zone')}</p>
                <p>{t('Plusieurs signalements du même type dans votre commune : une investigation est demandée.')}</p>
                <ul className="list-inside list-disc text-base">
                  {outcome.result.alerts.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            )}
            <ListenButton
              text={
                outcome.queued
                  ? t('Signalement gardé sur le téléphone. Il partira au retour du réseau.')
                  : `${t('Signalement envoyé. Merci.')}${outcome.result?.clusterAlert ? ` ${t('Alerte envoyée au médecin chef de zone.')}` : ''}`
              }
              audioKey={outcome.queued ? 'relay.queued' : 'relay.sent'}
            />
            <button type="button" className="btn btn-primary w-full" onClick={reset}>{t('Nouveau signalement')}</button>
          </div>
        )}
      </section>

      <section id="activite" aria-labelledby="h-activity" className="scroll-mt-24 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="h-activity" className="text-xl font-bold">{t('À {commune}', { commune })} <span className="text-base font-normal text-[var(--fg-muted)]">· {t('14 derniers jours')}</span></h2>
          <button type="button" className="chip-round" onClick={loadActivity} aria-label={t('Actualiser')} disabled={!online}><RefreshCw size={18} aria-hidden /></button>
        </div>

        {pending.length > 0 && (
          <ul className="space-y-2">
            {pending.map((q) => (
              <li key={q.id} className="card flex items-center gap-3 border-dashed p-4">
                <CloudOff size={20} className="shrink-0 text-[var(--color-ocre-700)]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{q.label}</span>
                  <span className="block text-sm text-[var(--fg-muted)]">{t('Saisi {date} · en attente de réseau', { date: fmtDateTime(q.createdAt, locale) })}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {activityError && <p className="text-[var(--fg-muted)]">{t('Historique indisponible pour le moment.')}</p>}
        {!reports && !activityError && online && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
        {reports && <ReportList reports={reports.filter((r) => r.commune === commune)} />}

        {alerts && alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold">{t('Alertes pour {commune}', { commune })}</h3>
            {alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        )}
      </section>
    </>
  );
}

function Chosen({ icon, label }: { icon: string; label: string }) {
  return (
    <p className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-3 font-bold">
      <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={icon} size={22} /></span>
      {label}
    </p>
  );
}

function ReportList({ reports }: { reports: CommunityReport[] }) {
  const t = useT();
  const locale = useLocale();
  if (!reports.length) return <p className="text-[var(--fg-muted)]">{t('Aucun signalement récent dans cette commune.')}</p>;
  const icon = (code: string) => SYNDROMES.find((s) => s.code === code)?.icon ?? 'other';
  return (
    <ul className="space-y-2">
      {reports.slice(0, 20).map((r) => (
        <li key={r.id} className="card flex items-center gap-3 p-4">
          <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={icon(r.syndrome)} size={22} /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{t(r.label)} · <span className="num">{r.cases}</span> {t('cas')}</span>
            <span className="block text-sm text-[var(--fg-muted)]">{r.village ? `${r.village} · ` : ''}{fmtDateTime(r.at, locale)}{r.relay ? ` · ${r.relay}` : ''}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
