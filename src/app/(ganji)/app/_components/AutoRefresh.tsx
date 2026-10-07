'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Rafraîchit les données serveur à intervalle régulier (démo : polling léger au lieu de WebSocket). */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(t);
  }, [router, seconds]);
  return null;
}
