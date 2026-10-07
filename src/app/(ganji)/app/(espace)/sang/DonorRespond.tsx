'use client';
import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';

interface RespondResult { status: string; appointment?: string | null; place?: string }

export function DonorRespond({ alertId, place }: { alertId: string; place: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
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
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Vous pouvez aussi répondre par SMS : 1 pour oui, 2 pour non.'));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <p role="status" className="rounded-2xl bg-[var(--color-brand-100)] p-4 text-lg font-bold text-[var(--color-brand-900)]">
        {result.status === 'ACCEPTEE'
          ? result.appointment
            ? t('Merci ! Rendez-vous {date} à {place}. Venez après avoir mangé, avec une pièce d’identité.', { date: fmtDateTime(result.appointment, locale), place: result.place ?? place })
            : t('Merci ! Rendez-vous bientôt à {place}. Venez après avoir mangé, avec une pièce d’identité.', { place: result.place ?? place })
          : t('Merci de votre réponse. Nous vous solliciterons une autre fois.')}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-lg font-bold">{t('Pouvez-vous venir donner ?')}</p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-danger !min-h-16 text-xl" disabled={busy} onClick={() => void respond(true)}>
          <Check size={26} aria-hidden /> {t('Oui')}
        </button>
        <button type="button" className="btn btn-ghost !min-h-16 text-xl" disabled={busy} onClick={() => void respond(false)}>
          <X size={26} aria-hidden /> {t('Non')}
        </button>
      </div>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
    </div>
  );
}
