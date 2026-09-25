'use client';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { flushQueue, readQueue } from '@/lib/offline-queue';

/**
 * État du réseau toujours visible : hors ligne, saisies en attente d'envoi.
 * Au retour du réseau (ou sur message du service worker), la file est envoyée.
 */
export function NetworkStatus() {
  const t = useT();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setPending(readQueue().length);
    };
    const flush = () => {
      refresh();
      void flushQueue().then(refresh);
    };
    const onSw = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === 'ganji-sync') flush();
    };
    refresh();
    if (navigator.onLine && readQueue().length) flush();
    window.addEventListener('online', flush);
    window.addEventListener('offline', refresh);
    window.addEventListener('ganji-queue', refresh);
    navigator.serviceWorker?.addEventListener('message', onSw);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('offline', refresh);
      window.removeEventListener('ganji-queue', refresh);
      navigator.serviceWorker?.removeEventListener('message', onSw);
    };
  }, []);

  if (online && !pending) return null;
  return (
    <div role="status" className="bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-base font-bold">
        {online ? <RefreshCw size={18} aria-hidden /> : <CloudOff size={18} aria-hidden />}
        {!online && t('Pas de réseau : vous voyez la dernière version enregistrée.')}
        {pending > 0 && ` ${pending > 1 ? t('{n} saisies en attente, envois au retour du réseau.', { n: pending }) : t('{n} saisie en attente, envoi au retour du réseau.', { n: pending })}`}
      </p>
    </div>
  );
}
