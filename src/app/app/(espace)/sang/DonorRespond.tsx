'use client';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

interface RespondResult { status: string; appointment?: string | null; place?: string }

export function DonorRespond({ alertId, place }: { alertId: string; place: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RespondResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<RespondResult>(`/blood/donor/alerts/${alertId}/respond`, { method: 'POST', json: { accept } });
      setResult(r);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pas de réseau. Vous pouvez aussi répondre par SMS : 1 pour oui, 2 pour non.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <p role="status" className="rounded-2xl bg-[var(--color-brand-100)] p-4 text-lg font-bold text-[var(--color-brand-900)]">
        {result.status === 'ACCEPTEE'
          ? `Merci ! Rendez-vous ${result.appointment ? fmtDateTime(result.appointment) : 'bientôt'} à ${result.place ?? place}. Venez après avoir mangé, avec une pièce d’identité.`
          : 'Merci de votre réponse. Nous vous solliciterons une autre fois.'}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-lg font-bold">Pouvez-vous venir donner ?</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-danger !min-h-16 text-xl" disabled={busy} onClick={() => void respond(true)}>
          <Check size={26} aria-hidden /> Oui
        </button>
        <button type="button" className="btn btn-ghost !min-h-16 text-xl" disabled={busy} onClick={() => void respond(false)}>
          <X size={26} aria-hidden /> Non
        </button>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
    </div>
  );
}
