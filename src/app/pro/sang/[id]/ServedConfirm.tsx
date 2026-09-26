'use client';
import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import type { LiveDonor } from './types';

export interface ServedResult {
  ok: boolean;
  already?: boolean;
  donorsRecorded?: number;
  stockUsed?: { site: string; bloodGroup: string; units: number }[];
  stockMissing?: number;
}

/**
 * « Transfusion faite » : on coche les donneurs qui sont réellement venus donner (aucun par défaut).
 * Seuls ceux-là voient leur don inscrit ; un donneur absent reste disponible pour les prochains appels.
 */
export function ServedConfirm({ requestId, donors, onDone, onCancel }: { requestId: string; donors: LiveDonor[]; onDone: (r: ServedResult) => void; onCancel: () => void }) {
  const t = useT();
  const uid = useId();
  const accepted = donors.filter((d) => d.status === 'ACCEPTEE');
  const [gave, setGave] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      onDone(await api<ServedResult>(`/blood/requests/${requestId}/served`, { method: 'POST', json: { donorAlertIds: gave } }));
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Enregistrement impossible. Réessayez.'));
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-labelledby={`${uid}-q`} className="w-full space-y-3 rounded-2xl border border-[var(--border)] p-4">
      <p id={`${uid}-q`} className="font-bold">
        {t('La transfusion est faite ?')}
      </p>
      {accepted.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm text-[var(--fg-muted)]">{t('Cochez les donneurs qui sont venus donner. Les autres restent disponibles.')}</legend>
          <ul className="space-y-2">
            {accepted.map((d) => (
              <li key={d.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-[var(--bg)] px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-[var(--color-brand-900)]"
                    checked={gave.includes(d.id)}
                    onChange={(e) => setGave((g) => (e.target.checked ? [...g, d.id] : g.filter((x) => x !== d.id)))}
                  />
                  <span>
                    <span className="font-bold">{d.firstName}</span> <span className="num text-sm text-[var(--fg-muted)]">{d.bloodGroup}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      {error && (
        <p role="alert" className="text-sm font-bold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void confirm()} disabled={busy}>
          <Check size={18} aria-hidden /> {busy ? t('Enregistrement…') : t('Oui, confirmer')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          {t('Non')}
        </button>
      </div>
    </div>
  );
}
