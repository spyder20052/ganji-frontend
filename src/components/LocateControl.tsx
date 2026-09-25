'use client';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { GeoStatus } from '@/lib/use-geolocation';
import type { LatLng } from '@/lib/places';
import { useT } from '@/i18n/client';
import { CommuneSelect } from './CommuneSelect';

/**
 * « Me localiser » avec repli sur le choix de la commune : la position n'est jamais obligatoire.
 */
export function LocateControl({
  status,
  source,
  onLocate,
  onCommune,
  idPrefix,
  compact = false,
}: {
  status: GeoStatus;
  source: 'gps' | 'commune' | null;
  onLocate: () => void;
  onCommune: (p: LatLng | null, name: string) => void;
  idPrefix: string;
  compact?: boolean;
}) {
  const t = useT();
  const [commune, setCommune] = useState('');
  const [showCommune, setShowCommune] = useState(false);
  const refused = status === 'denied' || status === 'unavailable';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onLocate} className={`btn ${source === 'gps' ? 'btn-soft' : 'btn-primary'}`} disabled={status === 'asking'}>
          {status === 'asking' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Crosshair size={20} aria-hidden />}
          {t(status === 'asking' ? 'Recherche de votre position…' : source === 'gps' ? 'Position trouvée · actualiser' : 'Me localiser')}
        </button>
        {!refused && !showCommune && (
          <button type="button" className="btn btn-ghost" onClick={() => setShowCommune(true)}>
            <MapPin size={20} aria-hidden /> {t('Choisir ma commune')}
          </button>
        )}
      </div>
      {refused && (
        <p className="text-base text-[var(--fg-muted)]" role="status">
          {t(status === 'denied' ? 'Position refusée : ce n’est pas grave.' : 'Position indisponible sur ce téléphone.')} {t('Choisissez votre commune.')}
        </p>
      )}
      {(refused || showCommune || source === 'commune') && (
        <div className={compact ? 'max-w-sm' : 'max-w-md'}>
          <CommuneSelect
            id={`${idPrefix}-commune`}
            value={commune}
            onChange={(name, c) => {
              setCommune(name);
              onCommune(c ? { lat: c.lat, lng: c.lng } : null, name);
            }}
          />
        </div>
      )}
    </div>
  );
}
