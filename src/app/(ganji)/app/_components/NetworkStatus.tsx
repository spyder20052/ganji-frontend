'use client';
import { CloudOff, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { dismissFailed, flushQueue, readFailed, readQueue, type FailedAction } from '@/lib/offline-queue';

/**
 * État du réseau toujours visible : hors ligne, saisies en attente d'envoi.
 * Au retour du réseau (ou sur message du service worker), la file est envoyée.
 */
export function NetworkStatus() {
  const t = useT();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState<FailedAction[]>([]);

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      setPending(readQueue().length);
      setFailed(readFailed());
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

  if (online && !pending && !failed.length) return null;
  return (
    <div role="status" className="bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
      {(!online || pending > 0) && (
        <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-base font-bold">
          {online ? <RefreshCw size={18} aria-hidden /> : <CloudOff size={18} aria-hidden />}
          {!online && t('Pas de réseau : vous voyez la dernière version enregistrée.')}
          {pending > 0 && ` ${pending > 1 ? t('{n} saisies en attente, envois au retour du réseau.', { n: pending }) : t('{n} saisie en attente, envoi au retour du réseau.', { n: pending })}`}
        </p>
      )}
      {/* Saisies refusées par le service au retour du réseau : dites, jamais perdues en silence. */}
      {failed.map((f) => (
        <p key={f.id} className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2 text-base">
          <span className="min-w-0 flex-1">
            <span className="font-bold">{t('Non enregistré : {label}.', { label: f.label })}</span> {f.error}
          </span>
          <button type="button" onClick={() => dismissFailed(f.id)} className="chip-round !h-9 !w-9 shrink-0" aria-label={t('Fermer ce message')}>
            <X size={16} aria-hidden />
          </button>
        </p>
      ))}
    </div>
  );
}
