'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/client';
import { api } from '@/lib/api';

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
        try { localStorage.removeItem('ganji-summary'); } catch {}
        navigator.serviceWorker?.controller?.postMessage({ type: 'ganji-logout' });
        router.push('/');
        router.refresh();
      }}
    >
      <LogOut size={20} aria-hidden />
    </button>
  );
}
