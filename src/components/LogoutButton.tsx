'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="chip-round"
      aria-label="Se déconnecter"
      title="Se déconnecter"
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
