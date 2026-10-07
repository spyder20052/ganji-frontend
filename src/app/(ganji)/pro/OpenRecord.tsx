'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QrScanner } from '@/components/QrScanner';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ErrorNote } from './_lib/ui';

/** Ouvre le carnet d'un patient à partir de son QR de partage ou de son code à 6 chiffres. */
export function OpenRecord() {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeem(raw: string) {
    // « 482 913 » dicté par le patient → « 482913 »
    const token = /^[\d\s-]+$/.test(raw) ? raw.replace(/\D/g, '') : raw.trim();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ patientId: string }>('/share/redeem', { method: 'POST', json: { token } });
      router.push(`/pro/patients/${r.patientId}`);
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Connexion impossible. Réessayez.'));
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-open" className="card space-y-4 p-5">
      {/* Les explications (QR, code dicté, accès limité) sont lues par le bouton Écouter de l'en-tête. */}
      <h2 id="h-open" className="text-xl font-bold">{t('Ouvrir un carnet')}</h2>
      <QrScanner
        onValue={redeem}
        busy={busy}
        inputLabel={t('Saisir le code à 6 chiffres')}
        placeholder="482 913"
        submitLabel={t('Ouvrir')}
      />
      <ErrorNote>{error}</ErrorNote>
    </section>
  );
}
