'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';

export function RevokeButton({ id, who, path = '/me/consents', label = 'Retirer l’accès' }: { id: string; who: string; path?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        aria-label={`${label} : ${who}`}
        onClick={async () => {
          if (!window.confirm(`${label} : ${who} ?`)) return;
          setBusy(true);
          setError(null);
          try {
            await api(`${path}/${id}`, { method: 'DELETE' });
            router.refresh();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Pas de réseau. Réessayez.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Retrait…' : label}
      </button>
      {error && <span role="alert" className="text-sm font-bold text-[var(--color-ocre-700)]">{error}</span>}
    </span>
  );
}
