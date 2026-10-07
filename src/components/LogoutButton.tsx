'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { CARD_KEY } from '@/app/(ganji)/app/_lib/emergency-card';
import { api } from '@/lib/api';
import { clearQueue } from '@/lib/offline-queue';
import { wipeLocal } from '@/lib/secure-store';

export function LogoutButton() {
  const router = useRouter();
  const t = useT();
  return (
    <button
      type="button"
      className="chip-round"
      aria-label={t('Se déconnecter')}
      title={t('Se déconnecter')}
      onClick={async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => undefined);
        // Téléphone partagé : rien de la personne ne reste (copie chiffrée, carte d'urgence, saisies en attente, pages gardées).
        wipeLocal();
        clearQueue();
        try { localStorage.removeItem(CARD_KEY); } catch {}
        navigator.serviceWorker?.controller?.postMessage({ type: 'ganji-logout' });
        router.push('/');
        router.refresh();
      }}
    >
      <LogOut size={20} aria-hidden />
    </button>
  );
}
