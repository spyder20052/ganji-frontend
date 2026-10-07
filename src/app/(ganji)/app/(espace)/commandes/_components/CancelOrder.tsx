'use client';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';

/** Annuler tant que la pharmacie n'a pas accepté : deux gestes (demander, confirmer). */
export function CancelOrder({ id, paid }: { id: string; paid: boolean }) {
  const t = useT();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/orders/${id}/cancel`, { method: 'POST' });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Annulation impossible pour le moment. Réessayez.'));
      setBusy(false);
      setConfirm(false);
    }
  }

  if (!confirm) {
    return (
      <>
        <button type="button" className="btn btn-ghost w-full" onClick={() => setConfirm(true)}>
          <X size={20} aria-hidden /> {t('Annuler la commande')}
        </button>
        {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">{t(error)}</p>}
      </>
    );
  }
  return (
    <div role="group" aria-label={t('Annuler la commande')} className="space-y-3 rounded-3xl bg-[var(--bg)] p-4">
      <p className="font-bold">{paid ? t('Annuler ? Vous serez remboursé.') : t('Annuler la commande ?')}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)} disabled={busy}>{t('Non')}</button>
        <button type="button" className="btn btn-primary" onClick={cancel} disabled={busy}>{busy ? t('Annulation…') : t('Oui, annuler')}</button>
      </div>
    </div>
  );
}
