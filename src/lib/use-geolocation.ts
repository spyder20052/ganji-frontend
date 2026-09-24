'use client';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng } from './places';

export type GeoStatus = 'idle' | 'asking' | 'ok' | 'denied' | 'unavailable';

/**
 * Position de l'usager, demandée seulement sur action (jamais au chargement),
 * sauf si l'autorisation a déjà été donnée sur ce téléphone.
 */
export function useGeolocation({ autoIfGranted = false }: { autoIfGranted?: boolean } = {}) {
  const [pos, setPos] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [source, setSource] = useState<'gps' | 'commune' | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: Math.round(p.coords.latitude * 1e4) / 1e4, lng: Math.round(p.coords.longitude * 1e4) / 1e4 });
        setSource('gps');
        setStatus('ok');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
    );
  }, []);

  /** Position choisie à la main (centre de la commune). */
  const setManual = useCallback((p: LatLng | null) => {
    setPos(p);
    setSource(p ? 'commune' : null);
    setStatus(p ? 'ok' : 'idle');
  }, []);

  useEffect(() => {
    if (!autoIfGranted || typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let alive = true;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((r) => { if (alive && r.state === 'granted') request(); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [autoIfGranted, request]);

  return { pos, status, source, request, setManual };
}
