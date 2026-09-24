'use client';
import { Moon } from 'lucide-react';
import { useId, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ErrorNote } from '../pro/_lib/ui';

/** Garde de nuit et de week-end : la pharmacie apparaît aussitôt sur la carte publique. */
export function OnDutyToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labelId = useId();

  async function toggle() {
    const next = !on;
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ onDuty: boolean }>('/pharmacy/on-duty', { method: 'POST', json: { onDuty: next } });
      setOn(r.onDuty);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Changement non enregistré. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={labelId} className="card space-y-3 p-5">
      <div className="flex items-center gap-3">
        <span className={`chip-round shrink-0 ${on ? '!border-0 bg-[var(--color-brand-900)] text-white' : 'text-[var(--fg-muted)]'}`}>
          <Moon size={22} aria-hidden />
        </span>
        <h2 id={labelId} className="flex-1 text-xl font-bold">
          Pharmacie de garde
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={labelId}
          onClick={toggle}
          disabled={busy}
          className={`relative inline-flex h-11 w-20 shrink-0 items-center rounded-full border-2 transition-colors disabled:opacity-60 ${on ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-900)]' : 'border-[var(--border)] bg-[var(--bg)]'}`}
        >
          <span aria-hidden className={`inline-block h-8 w-8 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-10' : 'translate-x-1'}`} />
        </button>
      </div>
      <p role="status" className={on ? 'font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]' : 'text-[var(--fg-muted)]'}>
        {on ? 'De garde : vous apparaissez en tête sur la carte et dans « Trouver un médicament ».' : 'Hors garde : activez la garde quand votre tour commence.'}
      </p>
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}
