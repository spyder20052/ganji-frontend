'use client';
import { Loader2, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AlertCard } from '@/components/AlertCard';
import { CommuneSelect } from '@/components/CommuneSelect';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { api } from '@/lib/api';
import type { HealthAlert } from '@/lib/alerts';

const KEY = 'alafia-commune';

export function AlertsBoard() {
  const [commune, setCommune] = useState('');
  const [alerts, setAlerts] = useState<HealthAlert[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Commune mémorisée sur ce téléphone.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setCommune(saved);
    } catch {}
    setReady(true);
  }, []);

  const load = useCallback((name: string) => {
    setLoading(true);
    setError(false);
    api<HealthAlert[]>(`/alerts${name ? `?commune=${encodeURIComponent(name)}` : ''}`)
      .then(setAlerts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (ready) load(commune);
  }, [ready, commune, load]);

  function choose(name: string) {
    setCommune(name);
    try {
      if (name) localStorage.setItem(KEY, name);
      else localStorage.removeItem(KEY);
    } catch {}
  }

  const local = alerts?.filter((a) => !a.national) ?? [];
  const national = alerts?.filter((a) => a.national) ?? [];
  const spoken = alerts?.length
    ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''}${commune ? ` pour ${commune}` : ''}. ${alerts.map((a) => a.title).join('. ')}.`
    : 'Aucune alerte en cours.';

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="shield" size={30} /></span>
          <div>
            <p className="label">Ministère de la Santé</p>
            <h1 className="text-3xl font-bold">Alertes sanitaires</h1>
          </div>
        </div>
        <ListenButton text={spoken} audioKey="alerts.summary" />
      </div>

      <div className="card space-y-2 p-4">
        <CommuneSelect id="alert-commune" value={commune} onChange={(n) => choose(n)} label="Ma commune" placeholder="Toutes les communes" />
        <p className="text-sm text-[var(--fg-muted)]">Retenue sur ce téléphone seulement. Sans téléphone intelligent, les alertes arrivent aussi par SMS.</p>
      </div>

      {loading && !alerts && <p className="flex items-center gap-2 text-[var(--fg-muted)]" role="status"><Loader2 className="animate-spin" aria-hidden /> Chargement des alertes…</p>}
      {error && (
        <div className="card space-y-3 p-5" role="alert">
          <p>Alertes indisponibles pour le moment (réseau).</p>
          <button type="button" className="btn btn-ghost" onClick={() => load(commune)}><RotateCcw size={18} aria-hidden /> Réessayer</button>
        </div>
      )}

      {alerts && (
        <div className="space-y-8" aria-live="polite">
          {commune && (
            <section aria-labelledby="h-local" className="space-y-3">
              <h2 id="h-local" className="text-xl font-bold">À {commune}</h2>
              {local.length ? local.map((a) => <AlertCard key={a.id} alert={a} />) : <p className="text-[var(--fg-muted)]">Aucune alerte locale en ce moment.</p>}
            </section>
          )}
          <section aria-labelledby="h-nat" className="space-y-3">
            <h2 id="h-nat" className="text-xl font-bold">{commune ? 'Dans tout le pays' : 'Toutes les alertes'}</h2>
            {(commune ? national : alerts).length ? (
              (commune ? national : alerts).map((a) => <AlertCard key={a.id} alert={a} />)
            ) : (
              <p className="text-[var(--fg-muted)]">Aucune alerte en cours.</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
