/**
 * Outils partagés des écrans « lieux de soin » (carte, orientation, urgence, médicaments) :
 * position de l'usager, distances, itinéraires, libellés des types d'établissement.
 */
export interface LatLng { lat: number; lng: number }

/** Lieu tel que renvoyé par /facilities, /facilities/nearby, /triage ou /pharmacies/on-duty. */
export interface Place {
  id: string;
  name: string;
  shortName?: string | null;
  type?: string;
  lat: number;
  lng: number;
  services?: string[];
  open24h?: boolean;
  onDuty?: boolean;
  phone?: string | null;
  commune: string | { name: string; departmentCode?: string };
  distanceKm?: number | null;
}

export interface GeoCommune { id: string; name: string; lat: number; lng: number }
export interface GeoDepartment { code: string; name: string; chefLieu: string; lat: number; lng: number; communes: GeoCommune[] }

/** Couleurs des marqueurs (les attributs SVG de Leaflet n'acceptent pas les variables CSS). */
export const MAP_COLORS = {
  brand: '#0b4f3c',
  brandLight: '#1f7a5a',
  ocre: '#d99a1e',
  ocreDark: '#8a5d06',
  danger: '#c62828',
  muted: '#52635b',
  user: '#1f5fa8',
} as const;

export const TYPE_LABEL: Record<string, string> = {
  CHU: 'Centre hospitalier universitaire',
  CHD: 'Centre hospitalier départemental',
  HZ: 'Hôpital de zone',
  CS: 'Centre de santé',
  CLINIQUE: 'Clinique',
  CONFESSIONNEL: 'Hôpital confessionnel',
  PSYCHIATRIE: 'Hôpital psychiatrique',
  TRANSFUSION: 'Site de transfusion sanguine',
  PHARMACIE: 'Pharmacie',
};

export function communeName(c: Place['commune']): string {
  return typeof c === 'string' ? c : c.name;
}

/** Distance à vol d'oiseau en km (haversine), arrondie à 100 m. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export function fmtKm(km: number | null | undefined): string {
  if (km == null) return '';
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}

/** Lien d'itinéraire OpenStreetMap (voiture) ; sans point de départ, simple repère sur la carte. */
export function directionsUrl(to: LatLng, from?: LatLng | null): string {
  if (from) {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.lat}%2C${from.lng}%3B${to.lat}%2C${to.lng}`;
  }
  return `https://www.openstreetmap.org/?mlat=${to.lat}&mlon=${to.lng}#map=16/${to.lat}/${to.lng}`;
}

/** Échappe une chaîne pour l'insérer dans du HTML (bulles Leaflet). */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
