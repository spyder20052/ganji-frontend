'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ROLE_HOME, type Me } from '@/lib/types';

export interface PersonaCard { persona: string; name: string; role: string; story: string; shows: string }

export function DemoPicker({ personas }: { personas: PersonaCard[] }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-danger-50)] p-3 font-bold text-[var(--color-danger-800)]">{t(error)}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {personas.map((p) => (
          <li key={p.persona} className="card flex flex-col gap-2 p-5">
            <p className="label">{p.role}</p>
            <p className="text-lg font-bold">{p.name}</p>
            <p className="text-base text-[var(--fg-muted)]">{p.story}</p>
            <p className="text-sm"><span className="font-bold">{t('Montre : ')}</span>{p.shows}</p>
            <button
              className="btn btn-primary mt-auto !min-h-14 py-2 text-balance"
              disabled={busy !== null}
              onClick={async () => {
                setBusy(p.persona);
                setError(null);
                try {
                  const me = await api<Me>(`/auth/demo/${p.persona}`, { method: 'POST' });
                  router.push(ROLE_HOME[me.role]);
                  router.refresh();
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Connexion impossible');
                  setBusy(null);
                }
              }}
            >
              {busy === p.persona ? t('Connexion…') : t('Entrer en tant que {name}', { name: p.name.split(' ')[0] === 'Dr' ? p.name.replace('Dr ', 'Dr\u00a0') : p.name.split(' ')[0] })}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
