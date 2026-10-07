/** Lieux de soin : distances, libellés, liens d'itinéraire, et échappement des bulles de la carte. */
import { describe, expect, it } from 'vitest';
import { communeName, directionsUrl, distanceKm, escapeHtml, fmtKm, TYPE_LABEL } from './places';

const COTONOU = { lat: 6.3654, lng: 2.4183 };
const PORTO_NOVO = { lat: 6.4969, lng: 2.6289 };

describe('distances', () => {
  it('calcule la distance à vol d’oiseau au dixième de kilomètre', () => {
    const d = distanceKm(COTONOU, PORTO_NOVO);
    expect(d).toBeGreaterThan(26);
    expect(d).toBeLessThan(30);
    expect(d).toBe(Math.round(d * 10) / 10);
    expect(distanceKm(COTONOU, COTONOU)).toBe(0);
    expect(distanceKm(PORTO_NOVO, COTONOU)).toBe(d);
  });

  it('affiche les courtes distances en mètres, par pas de 50 m et jamais moins de 50 m', () => {
    expect(fmtKm(0.3)).toBe('300 m');
    expect(fmtKm(0.52)).toBe('500 m');
    expect(fmtKm(0.01)).toBe('50 m');
    expect(fmtKm(0)).toBe('50 m');
  });

  it('affiche les kilomètres à la française, avec une décimale sous 10 km', () => {
    expect(fmtKm(1.25)).toBe('1,3 km');
    expect(fmtKm(12.6)).toBe('13 km');
    expect(fmtKm(null)).toBe('');
    expect(fmtKm(undefined)).toBe('');
  });
});

describe('itinéraires', () => {
  it('propose un itinéraire en voiture depuis la position connue', () => {
    expect(directionsUrl(PORTO_NOVO, COTONOU)).toBe('https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=6.3654%2C2.4183%3B6.4969%2C2.6289');
  });

  it('sans position, montre simplement le lieu sur la carte', () => {
    expect(directionsUrl(PORTO_NOVO)).toBe('https://www.openstreetmap.org/?mlat=6.4969&mlon=2.6289#map=16/6.4969/2.6289');
    expect(directionsUrl(PORTO_NOVO, null)).toContain('mlat=6.4969');
  });
});

describe('libellés', () => {
  it('lit la commune qu’elle soit un nom ou un objet', () => {
    expect(communeName('Abomey-Calavi')).toBe('Abomey-Calavi');
    expect(communeName({ name: 'Parakou', departmentCode: 'BO' })).toBe('Parakou');
  });

  it('nomme chaque type d’établissement en toutes lettres', () => {
    expect(TYPE_LABEL.CHU).toBe('Centre hospitalier universitaire');
    expect(TYPE_LABEL.HZ).toBe('Hôpital de zone');
    expect(TYPE_LABEL.PHARMACIE).toBe('Pharmacie');
  });

  it('échappe le HTML des bulles de carte (nom d’établissement venu de l’API)', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')"> & "fin"`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; &quot;fin&quot;');
  });
});
