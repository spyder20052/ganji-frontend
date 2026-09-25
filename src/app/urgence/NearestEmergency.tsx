'use client';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LocateControl } from '@/components/LocateControl';
import { Pictogram } from '@/components/Pictogram';
import { PlaceList } from '@/components/PlaceList';
import { useT } from '@/i18n/client';
import { api } from '@/lib/api';
import type { Place } from '@/lib/places';
import { useGeolocation } from '@/lib/use-geolocation';

/** Hôpital avec urgences ouvert le plus proche (24 h/24 ou de garde). */
export function NearestEmergency() {
  const t = useT();
  const geo = useGeolocation({ autoIfGranted: true });
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!geo.pos) return;
    let alive = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams({ lat: String(geo.pos.lat), lng: String(geo.pos.lng), service: 'urgences', openNow: 'true', limit: '3' });
    api<Place[]>(`/facilities/nearby?${q}`)
      .then((r) => alive && setPlaces(r))
      .catch(() => alive && setError('Recherche impossible (réseau). Appelez le 118 ou allez à l’hôpital de zone le plus proche.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [geo.pos]);

  return (
    <section aria-labelledby="h-near" className="card space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
          <Pictogram name="hospital" size={26} />
        </span>
        <h2 id="h-near" className="text-xl font-bold">{t('Hôpital ouvert le plus proche')}</h2>
      </div>
      <LocateControl idPrefix="urg" status={geo.status} source={geo.source} onLocate={geo.request} onCommune={(p) => geo.setManual(p)} />
      {loading && (
        <p className="flex items-center gap-2 text-[var(--fg-muted)]" role="status"><Loader2 className="animate-spin" aria-hidden /> {t('Recherche des urgences ouvertes…')}</p>
      )}
      {error && <p role="alert" className="font-bold">{t(error)}</p>}
      {places && !loading && (
        <div aria-live="polite">
          <PlaceList places={places} from={geo.source === 'gps' ? geo.pos : null} empty={t('Aucune urgence ouverte trouvée. Appelez le 118.')} />
        </div>
      )}
    </section>
  );
}
