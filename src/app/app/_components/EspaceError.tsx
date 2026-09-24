'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function EspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [online, setOnline] = useState(true);
  useEffect(() => setOnline(navigator.onLine), []);
  return (
    <div className="card space-y-4 p-6" role="alert">
      <h1 className="text-2xl font-bold">{online ? 'Cette page n’a pas pu s’afficher' : 'Pas de réseau pour le moment'}</h1>
      <p className="text-[var(--fg-muted)]">
        {online
          ? 'Le service ne répond pas. Vos données ne sont pas perdues. Réessayez dans un instant.'
          : 'Votre carte d’urgence reste disponible sans réseau. Le reste du carnet revient dès que le réseau revient.'}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>Réessayer</button>
        <Link href="/app/carte-urgence" className="btn btn-danger">Ma carte d’urgence</Link>
      </div>
    </div>
  );
}
