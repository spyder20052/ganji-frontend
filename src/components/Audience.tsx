'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLocale } from '@/i18n/client';
import { AUDIENCE_ENDPOINT, cleanPath, deviceClass, isLocalHost, newId, SESSION_KEY, VISITOR_KEY, type Beacon } from '@/lib/audience';

/**
 * Compte les pages vues, sans cookie ni donnée personnelle (voir lib/audience.ts). Une requête par page,
 * envoyée en balise pour ne jamais ralentir la navigation ; rien n'est envoyé depuis un poste local.
 */
export function Audience() {
  const pathname = usePathname();
  const locale = useLocale();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    if (isLocalHost(window.location.hostname)) return;
    try {
      let visitor = localStorage.getItem(VISITOR_KEY);
      if (!visitor) localStorage.setItem(VISITOR_KEY, (visitor = newId()));
      let session = sessionStorage.getItem(SESSION_KEY);
      const entering = !session;
      if (!session) sessionStorage.setItem(SESSION_KEY, (session = newId()));
      const beacon: Beacon = { v: visitor, s: session, p: cleanPath(pathname), d: deviceClass(window.innerWidth), l: locale };
      if (entering) beacon.r = document.referrer;
      const body = JSON.stringify(beacon);
      if (!(navigator.sendBeacon && navigator.sendBeacon(AUDIENCE_ENDPOINT, body))) {
        fetch(AUDIENCE_ENDPOINT, { method: 'POST', body, keepalive: true }).catch(() => undefined);
      }
    } catch {
      // Stockage indisponible (navigation privée stricte) : la page n'est pas comptée.
    }
  }, [pathname, locale]);

  return null;
}
