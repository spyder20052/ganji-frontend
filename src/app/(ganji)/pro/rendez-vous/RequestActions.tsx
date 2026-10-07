'use client';
import { CalendarCheck, CalendarClock, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ErrorNote } from '../_lib/ui';

type Mode = 'pending' | 'upcoming';
type Panel = 'confirm' | 'refuse' | null;

/** Créneaux proposés : de 7 h 30 à 17 h 30, toutes les 30 minutes. */
const SLOTS = Array.from({ length: 21 }, (_, i) => {
  const m = 7 * 60 + 30 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

/** Motifs de refus fréquents : un toucher, puis on peut compléter. */
const REASONS = [
  'Complet ce jour-là : merci de choisir un autre jour.',
  'Ce service ne consulte pas ce jour-là : choisissez un autre jour.',
  'Consultez d’abord un médecin généraliste, qui vous orientera.',
];

function beninParts(iso: string) {
  const d = new Date(iso);
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return { ymd, hm };
}

export function RequestActions({ id, mode, at, part }: { id: string; mode: Mode; at: string; part: 'MATIN' | 'APRES_MIDI' }) {
  const t = useT();
  const router = useRouter();
  const uid = useId();
  const initial = beninParts(at);
  const [panel, setPanel] = useState<Panel>(null);
  const [day, setDay] = useState(initial.ymd < beninParts(new Date().toISOString()).ymd ? beninParts(new Date(Date.now() + 86_400_000).toISOString()).ymd : initial.ymd);
  const [time, setTime] = useState(mode === 'upcoming' ? initial.hm : part === 'MATIN' ? '09:00' : '15:00');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPanel(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Enregistrement impossible. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  const confirm = () =>
    run(() =>
      api(`/appointments/${id}/confirm`, {
        method: 'POST',
        json: { scheduledAt: new Date(`${day}T${time}:00+01:00`).toISOString(), ...(message.trim() ? { answer: message.trim() } : {}) },
      }),
    );
  const refuse = () => run(() => api(`/appointments/${id}/refuse`, { method: 'POST', json: { answer: message.trim() } }));
  const done = () => run(() => api(`/appointments/${id}/done`, { method: 'POST' }));

  if (!panel) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {mode === 'pending' ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setPanel('confirm')}>
                <CalendarCheck size={20} aria-hidden /> {t('Confirmer')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => (setPanel('refuse'), setMessage(''))}>
                <X size={20} aria-hidden /> {t('Refuser')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void done()}>
                <Check size={20} aria-hidden /> {t('Patient reçu')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPanel('confirm')}>
                <CalendarClock size={20} aria-hidden /> {t('Changer l’heure')}
              </button>
            </>
          )}
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  }

  if (panel === 'confirm') {
    return (
      <form
        className="space-y-3 rounded-2xl bg-[var(--bg)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void confirm();
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${uid}-d`} className="block">
            <span className="label mb-1 block">{t('Jour')}</span>
            <input id={`${uid}-d`} type="date" className="input" value={day} min={beninParts(new Date().toISOString()).ymd} onChange={(e) => setDay(e.target.value)} required />
          </label>
          <label htmlFor={`${uid}-h`} className="block">
            <span className="label mb-1 block">{t('Heure')}</span>
            <select id={`${uid}-h`} className="input num" value={time} onChange={(e) => setTime(e.target.value)}>
              {[...new Set([...SLOTS, time])].sort().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label htmlFor={`${uid}-m`} className="block">
          <span className="label mb-1 block">{t('Message au patient (facultatif)')}</span>
          <input id={`${uid}-m`} className="input" value={message} maxLength={300} onChange={(e) => setMessage(e.target.value)} placeholder={t('Ex. : venez à jeun, avec votre carnet.')} />
        </label>
        <p className="text-sm text-[var(--fg-muted)]">{t('Le patient reçoit un SMS et un rappel la veille.')}</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy || !day}>
            {busy ? t('Envoi…') : t('Confirmer ce créneau')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setPanel(null)}>
            {t('Annuler')}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl bg-[var(--bg)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void refuse();
      }}
    >
      <fieldset>
        <legend className="label mb-1">{t('Motif, envoyé au patient')}</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button key={r} type="button" className={`pill min-h-11 text-left !text-base ${message === t(r) ? 'bg-[var(--color-brand-900)] text-white' : 'border border-[var(--border)] bg-[var(--card)]'}`} onClick={() => setMessage(t(r))}>
              {t(r)}
            </button>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${uid}-r`} className="sr-only">
        {t('Motif, envoyé au patient')}
      </label>
      <textarea id={`${uid}-r`} className="input min-h-20 py-2" value={message} maxLength={300} minLength={3} onChange={(e) => setMessage(e.target.value)} required />
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy || message.trim().length < 3}>
          {busy ? t('Envoi…') : t('Envoyer la réponse')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setPanel(null)}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  );
}
