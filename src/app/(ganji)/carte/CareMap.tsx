'use client';
import { Crosshair, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LocateControl } from '@/components/LocateControl';
import { MapView, type MapMarker } from '@/components/MapView';
import { Pictogram } from '@/components/Pictogram';
import { PlaceList } from '@/components/PlaceList';
import { useT } from '@/i18n/client';
import { api } from '@/lib/api';
import type { Facility } from '@/lib/types';
import { communeName, directionsUrl, distanceKm, escapeHtml, MAP_COLORS, TYPE_LABEL, type Place } from '@/lib/places';
import { useGeolocation } from '@/lib/use-geolocation';

type FilterKey = 'all' | 'hopitaux' | 'maternites' | 'urgences' | 'garde' | 'transfusion';

const HOSPITAL_TYPES = new Set(['CHU', 'CHD', 'HZ', 'CLINIQUE', 'CONFESSIONNEL', 'PSYCHIATRIE']);

const FILTERS: { key: FilterKey; label: string; icon: string; test: (f: Facility) => boolean; nearby?: Record<string, string> }[] = [
  { key: 'all', label: 'Tous', icon: 'map', test: () => true },
  { key: 'hopitaux', label: 'Hôpitaux', icon: 'hospital', test: (f) => HOSPITAL_TYPES.has(f.type) },
  { key: 'maternites', label: 'Maternités', icon: 'pregnant', test: (f) => f.services.includes('maternite'), nearby: { service: 'maternite' } },
  {
    key: 'urgences',
    label: 'Urgences 24 h',
    icon: 'emergency',
    test: (f) => f.services.includes('urgences') && (f.open24h || f.onDuty),
    nearby: { service: 'urgences', openNow: 'true' },
  },
  { key: 'garde', label: 'Pharmacies de garde', icon: 'pharmacy', test: (f) => f.type === 'PHARMACIE' && f.onDuty, nearby: { type: 'PHARMACIE', onDuty: 'true' } },
  { key: 'transfusion', label: 'Transfusion', icon: 'blood', test: (f) => f.type === 'TRANSFUSION', nearby: { type: 'TRANSFUSION' } },
];

function colorFor(f: Facility) {
  if (f.type === 'PHARMACIE') return f.onDuty ? MAP_COLORS.ocre : MAP_COLORS.ocreDark;
  if (f.type === 'TRANSFUSION') return MAP_COLORS.danger;
  if (f.type === 'CS') return MAP_COLORS.brandLight;
  return MAP_COLORS.brand;
}

const PAGE = 25;

export function CareMap() {
  const t = useT();
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nearby, setNearby] = useState<Place[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const geo = useGeolocation();
  const mapBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Facility[]>('/facilities')
      .then(setFacilities)
      .catch(() => setError(true));
  }, []);

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filtered = useMemo(() => (facilities ?? []).filter(active.test), [facilities, active]);

  // « Autour de moi » : l'API filtre par service ou type ; pour « Tous » et « Hôpitaux »
  // (plusieurs types à la fois), le tri par distance se fait sur la liste déjà chargée.
  useEffect(() => {
    setShown(PAGE);
    if (!geo.pos) {
      setNearby(null);
      return;
    }
    if (!active.nearby) {
      const from = geo.pos;
      setNearby(filtered.map((f) => ({ ...f, distanceKm: distanceKm(from, f) })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)));
      return;
    }
    let alive = true;
    setNearbyLoading(true);
    const q = new URLSearchParams({ lat: String(geo.pos.lat), lng: String(geo.pos.lng), limit: '20', ...active.nearby });
    api<Place[]>(`/facilities/nearby?${q}`)
      .then((r) => alive && setNearby(r))
      .catch(() => {
        if (!alive || !geo.pos) return;
        const from = geo.pos;
        setNearby(filtered.map((f) => ({ ...f, distanceKm: distanceKm(from, f) })).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)));
      })
      .finally(() => alive && setNearbyLoading(false));
    return () => {
      alive = false;
    };
  }, [geo.pos, active, filtered]);

  const markers: MapMarker[] = useMemo(
    () =>
      filtered.map((f) => ({
        id: f.id,
        lat: f.lat,
        lng: f.lng,
        label: f.name,
        color: colorFor(f),
        radius: f.type === 'PHARMACIE' ? 6 : f.type === 'CS' ? 7 : 9,
        popupHtml:
          `<strong>${escapeHtml(f.name)}</strong><br>${escapeHtml(TYPE_LABEL[f.type] ? t(TYPE_LABEL[f.type]) : f.type)} · ${escapeHtml(communeName(f.commune))}` +
          `${f.open24h ? `<br>${escapeHtml(t('Ouvert 24 h/24'))}` : ''}${f.onDuty ? `<br>${escapeHtml(t('De garde'))}` : ''}` +
          `<br><a href="${escapeHtml(directionsUrl(f))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('Voir sur OpenStreetMap'))}</a>`,
      })),
    [filtered, t],
  );

  const list: Place[] = useMemo(() => {
    if (nearby) return nearby;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [nearby, filtered]);

  const selected = selectedId ? (list.find((p) => p.id === selectedId) ?? facilities?.find((f) => f.id === selectedId) ?? null) : null;
  const focus = useMemo(() => {
    if (selected) return { lat: selected.lat, lng: selected.lng, zoom: 14 };
    if (geo.pos) return { ...geo.pos, zoom: 12 };
    return null;
  }, [selected, geo.pos]);

  function pick(id: string) {
    setSelectedId(id);
    mapBox.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-5">
      <div role="group" aria-label={t('Type de lieu')} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const on = f.key === filter;
          const n = (facilities ?? []).filter(f.test).length;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFilter(f.key);
                setSelectedId(null);
              }}
              className={`btn shrink-0 !px-4 text-base ${on ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Pictogram name={f.icon} size={20} /> {t(f.label)}
              {facilities && <span className={`num text-sm ${on ? 'text-white' : 'text-[var(--fg-muted)]'}`}>{n}</span>}
            </button>
          );
        })}
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Crosshair size={22} aria-hidden className="text-[var(--color-brand-900)]" />
          <h2 className="font-bold">{t('Autour de moi')}</h2>
          {nearbyLoading && <Loader2 size={18} className="animate-spin text-[var(--fg-muted)]" aria-label={t('Recherche en cours')} />}
        </div>
        <LocateControl idPrefix="carte" status={geo.status} source={geo.source} onLocate={geo.request} onCommune={(p) => geo.setManual(p)} compact />
      </div>

      <div ref={mapBox} className="scroll-mt-24 space-y-3">
        <MapView
          markers={markers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          focus={focus}
          user={geo.pos}
          height="min(62vh, 520px)"
          label={t('Carte : {n} lieux ({type})', { n: filtered.length, type: t(active.label).toLowerCase() })}
        />
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--fg-muted)]" aria-label={t('Légende')}>
          {[
            [MAP_COLORS.brand, 'Hôpital'],
            [MAP_COLORS.brandLight, 'Centre de santé'],
            [MAP_COLORS.ocre, 'Pharmacie de garde'],
            [MAP_COLORS.ocreDark, 'Pharmacie'],
            [MAP_COLORS.danger, 'Transfusion'],
            [MAP_COLORS.user, 'Vous'],
          ].map(([c, l]) => (
            <li key={l} className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: c }} /> {t(l)}</li>
          ))}
        </ul>
        {selected && (
          <div className="relative">
            <PlaceList places={[selected]} from={geo.source === 'gps' ? geo.pos : null} selectedId={selected.id} />
            <button type="button" onClick={() => setSelectedId(null)} className="chip-round absolute right-3 top-3" aria-label={t('Fermer la fiche')}>
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <p className="rounded-2xl bg-[var(--color-ocre-100)] px-4 py-3 text-base text-[var(--color-ocre-700)]">
        {t('Positions approximatives : import Healthsites/OSM prévu. Appelez avant de vous déplacer si possible.')}
      </p>

      <section aria-labelledby="h-list" className="space-y-3">
        <h2 id="h-list" className="text-xl font-bold">
          {geo.pos ? t('Les plus proches') : t('Liste')} · {t(active.label)}{' '}
          <span className="num text-base font-normal text-[var(--fg-muted)]">({list.length})</span>
        </h2>
        {error && <p role="alert">{t('Liste indisponible pour le moment (réseau). Réessayez plus tard.')}</p>}
        {!facilities && !error && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement des lieux de soin…')}</p>}
        {facilities && (
          <PlaceList
            places={list.slice(0, shown)}
            from={geo.source === 'gps' ? geo.pos : null}
            onSelect={pick}
            selectedId={selectedId}
            empty={t('Aucun lieu de ce type pour le moment.')}
          />
        )}
        {list.length > shown && (
          <button type="button" className="btn btn-ghost w-full" onClick={() => setShown((n) => n + PAGE)}>
            {t('Afficher plus ({n} autres)', { n: list.length - shown })}
          </button>
        )}
      </section>
    </div>
  );
}
