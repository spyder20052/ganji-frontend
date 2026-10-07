'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';

/** Annuler : une confirmation d'un geste, pour éviter l'erreur de doigt. */
export function CancelAppointment({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/appointments/${id}/cancel`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez.'));
      setBusy(false);
    }
  }

  if (!ask) {
    return (
      <button type="button" className="btn btn-ghost w-full" onClick={() => setAsk(true)}>
        {t('Annuler ce rendez-vous')}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-[var(--bg)] p-3" role="group" aria-label={t('Annuler ce rendez-vous')}>
      <p className="font-semibold">{t('Annuler ce rendez-vous ?')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setAsk(false)} disabled={busy}>
          {t('Non')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void cancel()} disabled={busy} autoFocus>
          {busy ? '…' : t('Oui, annuler')}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-semibold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
    </div>
  );
}
