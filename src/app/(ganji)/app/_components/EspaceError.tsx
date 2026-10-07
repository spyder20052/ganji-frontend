'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';

export default function EspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  const [online, setOnline] = useState(true);
  useEffect(() => setOnline(navigator.onLine), []);
  return (
    <div className="card space-y-4 p-6" role="alert">
      <h1 className="text-2xl font-bold">{online ? t('Cette page n’a pas pu s’afficher') : t('Pas de réseau pour le moment')}</h1>
      <p className="text-[var(--fg-muted)]">
        {online
          ? t('Le service ne répond pas. Vos données ne sont pas perdues. Réessayez dans un instant.')
          : t('Votre carte d’urgence reste disponible sans réseau. Le reste du carnet revient dès que le réseau revient.')}
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>{t('Réessayer')}</button>
        <Link href="/app/carte-urgence" className="btn btn-danger">{t('Ma carte d’urgence')}</Link>
      </div>
    </div>
  );
}
