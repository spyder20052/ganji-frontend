'use client';
import { useEffect } from 'react';

/**
 * Enregistre le service worker (production). Après un déploiement, le nouveau worker prend la main
 * (skipWaiting + claim) et purge l'ancien cache : un onglet resté ouvert est rechargé une fois pour ne pas
 * perdre ses fichiers ; au retour en avant-plan, on vérifie s'il y a une mise à jour.
 */
export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);
    const onChange = () => {
      if (hadController) window.location.reload();
      hadController = true;
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => undefined);
    };
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((r) => (registration = r)).catch(() => undefined);
    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return null;
}
