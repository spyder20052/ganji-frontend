'use client';
import { Siren } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ErrorNote } from '../../_lib/ui';

const MIN = 20;

/** Accès d'urgence justifié : 12 h, motif au journal, patient, proches et contrôleur prévenus. */
export function BreakGlassForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const len = reason.trim().length;

  if (!open) {
    return (
      <button type="button" className="btn btn-danger w-full" onClick={() => setOpen(true)} aria-expanded={false}>
        <Siren size={20} aria-hidden /> {t('Accès d’urgence (bris de glace)')}
      </button>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (len < MIN) return;
        setBusy(true);
        setError(null);
        try {
          await api('/emergency/break-glass', { method: 'POST', json: { patientId, reason: reason.trim() } });
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? t(err.message) : t('Accès impossible. Réessayez.'));
          setBusy(false);
        }
      }}
    >
      <div className="rounded-2xl border border-[var(--color-danger-600)]/30 bg-[var(--color-danger-50)] p-3 text-sm text-[var(--color-danger-800)]">
        <p className="font-bold">{t('Accès contrôlé, à réserver à l’urgence vitale.')}</p>
        <ul className="mt-1 list-disc pl-5">
          <li>{t('Ouvert 12 h, en lecture et pour les soins urgents.')}</li>
          <li>{t('Le patient et ses proches sont prévenus par SMS immédiatement.')}</li>
          <li>{t('Le contrôleur reçoit une alerte et vérifie votre motif a posteriori.')}</li>
        </ul>
      </div>
      <label htmlFor={id} className="block font-bold">
        {t('Motif de l’accès d’urgence')}
      </label>
      <textarea
        id={id}
        className="input min-h-28 py-2"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        required
        aria-describedby={`${id}-n`}
        placeholder={t('Ex. : patient inconscient admis aux urgences, besoin des antécédents et du groupe sanguin')}
      />
      <p id={`${id}-n`} className={`num text-sm ${len < MIN ? 'text-[var(--fg-muted)]' : 'text-[var(--color-brand-700)]'}`}>
        {len < MIN
          ? t(MIN - len > 1 ? 'Encore {n} caractères minimum : soyez précis.' : 'Encore {n} caractère minimum : soyez précis.', { n: MIN - len })
          : t('Motif suffisamment précis.')}
      </p>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-danger" disabled={busy || len < MIN}>
          {busy ? t('Ouverture…') : t('Ouvrir le dossier en urgence')}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  );
}
