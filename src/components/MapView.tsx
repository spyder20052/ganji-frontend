'use client';
import 'leaflet/dist/leaflet.css';
import type { CircleMarker, LayerGroup, Map as LeafletMap } from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import { escapeHtml, MAP_COLORS, type LatLng } from '@/lib/places';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Texte brut (échappé ici) : infobulle au survol et nom accessible. */
  label: string;
  color?: string;
  radius?: number;
  /** HTML de la bulle : l'appelant DOIT échapper les valeurs (voir escapeHtml). */
  popupHtml?: string;
}

type Leaflet = typeof import('leaflet');

/** Centre approximatif du Bénin. */
const BENIN: [number, number] = [9.3, 2.3];

/**
 * Carte Leaflet chargée uniquement côté navigateur (import dynamique : aucun poids
 * sur le premier affichage). Marqueurs en cercles vectoriels : aucune image à servir.
 * La liste sous la carte reste la source accessible ; la carte est un complément visuel.
 */
export function MapView({
  markers,
  center = BENIN,
  zoom = 7,
  height = 420,
  onSelect,
  selectedId,
  focus,
  user,
  fitToMarkers = false,
  label = 'Carte',
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: number | string;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  /** Recentre la carte quand cette valeur change. */
  focus?: (LatLng & { zoom?: number }) | null;
  /** Position de l'usager (point bleu). */
  user?: LatLng | null;
  fitToMarkers?: boolean;
  label?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<CircleMarker | null>(null);
  const LRef = useRef<Leaflet | null>(null);
  const fittedKey = useRef('');
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Création de la carte (une seule fois).
  useEffect(() => {
    let cancelled = false;
    import('leaflet')
      .then((mod) => {
        const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
        if (cancelled || !el.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(el.current, { center, zoom, scrollWheelZoom: false, zoomControl: true, attributionControl: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        // La carte peut naître dans un conteneur encore en cours de mise en page.
        setTimeout(() => map.invalidateSize(), 0);
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      userLayerRef.current = null;
      fittedKey.current = '';
      setReady(false);
    };
    // center et zoom ne servent qu'à l'initialisation ; utiliser `focus` pour recentrer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marqueurs.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    for (const m of markers) {
      const selected = m.id === selectedId;
      const color = m.color ?? MAP_COLORS.brand;
      const c = L.circleMarker([m.lat, m.lng], {
        radius: (m.radius ?? 8) + (selected ? 4 : 0),
        color: selected ? '#13241e' : '#ffffff',
        weight: selected ? 3 : 2,
        fillColor: color,
        fillOpacity: 0.85,
      });
      c.bindTooltip(escapeHtml(m.label), { direction: 'top', offset: [0, -6] });
      if (m.popupHtml) c.bindPopup(m.popupHtml, { maxWidth: 260 });
      c.on('click', () => onSelectRef.current?.(m.id));
      c.addTo(layer);
      if (selected) c.bringToFront();
    }
    // Cadrage seulement quand l'ensemble des lieux change (pas à chaque actualisation).
    const key = markers.map((m) => m.id).join('|');
    if (fitToMarkers && markers.length > 1 && key !== fittedKey.current) {
      fittedKey.current = key;
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number])), { padding: [28, 28], maxZoom: 13 });
    }
  }, [ready, markers, selectedId, fitToMarkers]);

  // Position de l'usager.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    userLayerRef.current?.remove();
    userLayerRef.current = null;
    if (user) {
      userLayerRef.current = L.circleMarker([user.lat, user.lng], { radius: 9, color: '#ffffff', weight: 3, fillColor: MAP_COLORS.user, fillOpacity: 1 })
        .bindTooltip('Vous êtes ici', { direction: 'top', offset: [0, -6] })
        .addTo(map);
    }
  }, [ready, user]);

  // Recentrage demandé.
  useEffect(() => {
    if (!ready || !focus) return;
    mapRef.current?.setView([focus.lat, focus.lng], focus.zoom ?? 12, { animate: true });
  }, [ready, focus]);

  return (
    <div className="relative" style={{ height }}>
      <div ref={el} role="region" aria-label={label} className="h-full w-full rounded-[var(--radius-card)] bg-[var(--color-brand-50)]" />
      {!ready && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center text-base text-[var(--fg-muted)]" role="status">
          {failed ? 'Carte indisponible (réseau). La liste reste utilisable.' : 'Chargement de la carte…'}
        </p>
      )}
    </div>
  );
}
