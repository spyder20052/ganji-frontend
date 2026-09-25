'use client';
import { Navigation, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { communeName, directionsUrl, fmtKm, TYPE_LABEL, type LatLng, type Place } from '@/lib/places';
import { useT } from '@/i18n/client';
import { Pictogram } from './Pictogram';

function iconFor(p: Place) {
  if (p.type === 'PHARMACIE') return 'pharmacy';
  if (p.type === 'TRANSFUSION') return 'blood';
  return 'hospital';
}

/** Liste de lieux de soin : nom, commune, badges, distance, itinéraire. Rendu serveur ou client. */
export function PlaceList({
  places,
  from,
  extra,
  onSelect,
  selectedId,
  empty,
}: {
  places: Place[];
  from?: LatLng | null;
  extra?: (p: Place) => ReactNode;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  empty?: string;
}) {
  const t = useT();
  if (!places.length) return <p className="text-[var(--fg-muted)]">{empty ?? t('Aucun lieu trouvé.')}</p>;
  return (
    <ul className="grid gap-3">
      {places.map((p) => {
        const selected = p.id === selectedId;
        return (
          <li
            key={p.id}
            id={`lieu-${p.id}`}
            className={`card flex flex-wrap items-center gap-3 p-4 ${selected ? '!border-[var(--color-brand-900)] ring-2 ring-[var(--color-brand-900)]/30' : ''}`}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
              <Pictogram name={iconFor(p)} size={24} />
            </span>
            <div className="min-w-0 flex-1">
              {onSelect ? (
                <button type="button" onClick={() => onSelect(p.id)} className="text-left font-bold underline-offset-2 hover:underline">
                  {p.name}
                </button>
              ) : (
                <p className="font-bold">{p.name}</p>
              )}
              <p className="text-base text-[var(--fg-muted)]">
                {p.type ? `${t(TYPE_LABEL[p.type] ?? p.type)} · ` : ''}
                {communeName(p.commune)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                {p.open24h && <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">{t('Ouvert 24 h/24')}</span>}
                {p.onDuty && <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">{t('De garde')}</span>}
                {p.distanceKm != null && <span className="pill num border border-[var(--border)]">{t('à {distance}', { distance: fmtKm(p.distanceKm) })}</span>}
                {extra?.(p)}
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              {p.phone && (
                <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="btn btn-ghost flex-1 sm:flex-none">
                  <Phone size={18} aria-hidden /> <span className="num">{p.phone}</span>
                </a>
              )}
              <a
                href={directionsUrl(p, from)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-soft flex-1 sm:flex-none"
                aria-label={t('Itinéraire vers {lieu} (OpenStreetMap, nouvel onglet)', { lieu: p.name })}
              >
                <Navigation size={18} aria-hidden /> {t('Itinéraire')}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
