'use client';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';

/** « C'est fait » : confirme le rappel (patient ou aidant) ; le cercle prévenu l'apprend aussitôt. */
export function DoneButton({ reminderId, title }: { reminderId: string; title: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/reminders/${reminderId}/confirm`, { method: 'POST' });
      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Vous pouvez aussi répondre 1 au SMS de rappel.'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-[var(--color-brand-100)] px-5 font-bold text-[var(--color-brand-900)]">
        <Check size={22} aria-hidden /> {t('Fait')}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void confirm()} disabled={busy} className="btn btn-primary !min-h-14 w-full text-lg" aria-label={t('C’est fait : {title}', { title })}>
        {busy ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Check size={22} aria-hidden />} {t('C’est fait')}
      </button>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">{error}</p>}
    </div>
  );
}

/** Le patient choisit si un aidant reçoit les rappels et est prévenu quand un rappel reste sans réponse. */
export function EscalationSwitch({ delegationId, name, on }: { delegationId: string; name: string; on: boolean }) {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState(on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !value;
    setValue(next);
    setBusy(true);
    setError(null);
    try {
      await api('/me/circle/settings', { method: 'PATCH', json: { delegationId, escalations: next } });
      router.refresh();
    } catch (e) {
      setValue(!next);
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez dans un instant.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={t('Prévenir {name}', { name })}
        disabled={busy}
        onClick={() => void toggle()}
        className="grid min-h-12 place-items-center px-1"
      >
        <span aria-hidden className={`relative block h-8 w-14 rounded-full transition-colors ${value ? 'bg-[var(--color-brand-900)]' : 'bg-[var(--border)]'}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${value ? 'left-7' : 'left-1'}`} />
        </span>
      </button>
      {error && <span role="alert" className="text-sm font-bold text-[var(--color-ocre-700)]">{error}</span>}
    </span>
  );
}
