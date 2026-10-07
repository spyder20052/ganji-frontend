'use client';
import { ArrowLeft, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { useT } from '@/i18n/client';
import { ApiError } from '@/lib/api';
import { sendOrQueue } from '@/lib/offline-queue';

const SYMPTOMS = [
  { key: 'fever', label: 'Fièvre' },
  { key: 'pain', label: 'Douleur' },
  { key: 'bleeding', label: 'Saignement' },
  { key: 'fatigue', label: 'Grande fatigue' },
  { key: 'vomiting', label: 'Vomissements' },
  { key: 'breath', label: 'Essoufflement' },
  { key: 'bruise', label: 'Bleus inhabituels' },
] as const;

const LEVELS = [
  { v: 1, label: 'Un peu', bars: 1 },
  { v: 2, label: 'Moyen', bars: 2 },
  { v: 3, label: 'Fort', bars: 3 },
] as const;

interface Result { alert: boolean; notified: number; advice: string[] }

export function SymptomForm({ patientId }: { patientId?: string }) {
  const router = useRouter();
  const t = useT();
  const [symptom, setSymptom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(Result & { queued?: false }) | { queued: true } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(severity: number) {
    if (!symptom) return;
    setBusy(true);
    setError(null);
    try {
      const label = SYMPTOMS.find((s) => s.key === symptom)?.label ?? symptom;
      const r = await sendOrQueue<Result>({ path: '/care/symptoms', method: 'POST', body: { symptom, severity, ...(patientId ? { patientId } : {}) }, label: t('Symptôme : {label}', { label: t(label) }) });
      setResult(r.queued ? { queued: true } : { ...(r.result as Result), queued: false });
      if (!r.queued) router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Envoi impossible. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  const reset = () => { setResult(null); setSymptom(null); };

  if (result) {
    if (result.queued) {
      return (
        <div role="status" className="space-y-3 rounded-3xl bg-[var(--color-ocre-100)] p-5 text-[var(--color-ocre-700)]">
          <p className="text-xl font-bold">{t('Pas de réseau : c’est noté sur le téléphone.')}</p>
          <p>{t('L’envoi à votre équipe se fera tout seul au retour du réseau. Si c’est grave, n’attendez pas : allez aux urgences ou appelez le 118.')}</p>
          <button type="button" className="btn btn-ghost" onClick={reset}>{t('Noter autre chose')}</button>
        </div>
      );
    }
    return (
      <div role="alert" className="space-y-4">
        <div className={`rounded-3xl p-5 ${result.alert ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
          <p className="text-2xl font-bold">{result.alert ? t('Signe d’alerte : votre équipe est prévenue') : t('C’est noté dans votre carnet')}</p>
          {result.alert && result.notified > 0 && <p className="mt-1 text-lg">{result.notified > 1 ? t('{n} soignants de votre équipe ont reçu un message.', { n: result.notified }) : t('{n} soignant de votre équipe ont reçu un message.', { n: result.notified })}</p>}
        </div>
        <ul className="list-disc space-y-1 pl-6 text-lg">
          {result.advice.map((a) => <li key={a}>{t(a)}</li>)}
        </ul>
        <div className="flex flex-wrap gap-3">
          {result.alert && <a href="tel:118" className="btn btn-danger"><Phone size={20} aria-hidden /> {t('Appeler le 118')}</a>}
          {result.alert && <Link href="/app/carte-urgence" className="btn btn-ghost">{t('Ma carte d’urgence')}</Link>}
          <button type="button" className="btn btn-soft" onClick={reset}>{t('Noter autre chose')}</button>
        </div>
      </div>
    );
  }

  if (!symptom) {
    return (
      <fieldset>
        <legend className="mb-3 text-lg font-bold">{t('1. Qu’est-ce que vous ressentez ?')}</legend>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SYMPTOMS.map((s) => (
            <li key={s.key}>
              <button type="button" onClick={() => setSymptom(s.key)} className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-[var(--border)] bg-[var(--card)] p-3 font-bold hover:border-[var(--color-brand-500)]">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name={s.key} size={28} /></span>
                <span className="text-lg">{t(s.label)}</span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>
    );
  }

  const chosen = SYMPTOMS.find((s) => s.key === symptom);
  return (
    <fieldset className="space-y-4" disabled={busy}>
      <legend className="mb-3 flex items-center gap-3 text-lg font-bold">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name={symptom} size={24} /></span>
        {t('2. {symptom} : c’est fort comment ?', { symptom: chosen ? t(chosen.label) : '' })}
      </legend>
      <div className="grid grid-cols-3 gap-3">
        {LEVELS.map((l) => (
          <button key={l.v} type="button" onClick={() => void send(l.v)} className={`flex min-h-32 flex-col items-center justify-center gap-3 rounded-3xl border-2 p-3 text-xl font-bold ${l.v === 3 ? 'border-[var(--color-danger-600)]/50' : 'border-[var(--border)]'} bg-[var(--card)]`}>
            <span aria-hidden className="flex h-10 items-end gap-1">
              {[1, 2, 3].map((b) => (
                <span key={b} className={`w-3 rounded-full ${b <= l.bars ? (l.v === 3 ? 'bg-[var(--color-danger-600)]' : 'bg-[var(--color-brand-700)]') : 'bg-[var(--border)]'}`} style={{ height: `${b * 33}%` }} />
              ))}
            </span>
            {t(l.label)}
          </button>
        ))}
      </div>
      {busy && <p role="status">{t('Envoi…')}</p>}
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
      <button type="button" className="btn btn-ghost" onClick={() => setSymptom(null)}>
        <ArrowLeft size={20} aria-hidden /> {t('Changer de symptôme')}
      </button>
    </fieldset>
  );
}
