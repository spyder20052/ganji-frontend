'use client';
import { HandHeart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import type { VolunteerResult } from './types';

/** « Je peux être appelé » : le donneur se met en pause (voyage, maladie) ou redevient joignable. */
export function AvailabilityToggle({ available }: { available: boolean }) {
  const t = useT();
  const router = useRouter();
  const [on, setOn] = useState(available);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setError(null);
    setOn(next);
    try {
      await api('/blood/donor/me', { method: 'PUT', json: { available: next } });
      router.refresh();
    } catch (e) {
      setOn(!next);
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez dans un instant.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => void toggle()}
        disabled={busy}
        className="flex min-h-14 w-full items-center gap-4 rounded-2xl bg-[var(--bg)] px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t('On peut m’appeler')}</span>
          <span className="block text-base text-[var(--fg-muted)]">{on ? t('Vous recevez les appels au don.') : t('En pause : aucun appel.')}</span>
        </span>
        <span aria-hidden className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-[var(--color-brand-900)]' : 'bg-[var(--border)]'}`}>
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${on ? 'left-7' : 'left-1'}`} />
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-base font-bold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** « Je peux donner » sur une demande proche : rendez-vous proposé tout de suite. */
export function VolunteerButton({ requestId, place }: { requestId: string; place: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VolunteerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<VolunteerResult>(`/blood/requests/${requestId}/volunteer`, { method: 'POST' });
      setResult(r);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez dans un instant.'));
    } finally {
      setBusy(false);
    }
  }

  if (result?.status === 'ACCEPTEE') {
    return (
      <p role="status" className="rounded-2xl bg-[var(--color-brand-100)] p-3 text-base font-bold text-[var(--color-brand-900)]">
        {result.appointment
          ? t('Merci ! Rendez-vous {date} à {place}. Venez après avoir mangé, avec une pièce d’identité.', { date: fmtDateTime(result.appointment, locale), place: result.place ?? place })
          : t('Merci ! Rendez-vous bientôt à {place}. Venez après avoir mangé, avec une pièce d’identité.', { place: result.place ?? place })}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-danger w-full !min-h-14 text-lg" onClick={() => void go()} disabled={busy}>
        <HandHeart size={22} aria-hidden /> {busy ? t('Envoi…') : t('Je peux donner')}
      </button>
      {error && (
        <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
    </div>
  );
}
