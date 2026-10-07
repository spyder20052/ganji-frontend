/** Identifiants et chemins venant de l'adresse : rien n'atteint l'API ni ne redirige hors du site sans vérification. */
import { describe, expect, it } from 'vitest';
import { isUuid, safeSuite } from './validate';

describe('identifiants', () => {
  it('accepte un UUID, quelle que soit la casse', () => {
    expect(isUuid('3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60')).toBe(true);
    expect(isUuid('3F2A9C1E-7D4B-4E2A-9F0C-1B2C3D4E5F60')).toBe(true);
  });

  it('refuse tout ce qui n’en est pas un (chemin, tronqué, suffixe, nombre, vide)', () => {
    expect(isUuid('../admin')).toBe(false);
    expect(isUuid('3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f6')).toBe(false);
    expect(isUuid('3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60/x')).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});

describe('page de retour après connexion', () => {
  it('garde un chemin interne, avec ses paramètres', () => {
    expect(safeSuite('/app/partage')).toBe('/app/partage');
    expect(safeSuite('/pro/sang/3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60?onglet=donneurs')).toBe('/pro/sang/3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60?onglet=donneurs');
  });

  it('refuse toute redirection hors du site, y compris les formes déguisées', () => {
    expect(safeSuite('https://evil.example/')).toBeUndefined();
    expect(safeSuite('//evil.example')).toBeUndefined();
    expect(safeSuite('/\\evil.example')).toBeUndefined();
    expect(safeSuite('app')).toBeUndefined();
    expect(safeSuite(['/app'])).toBeUndefined();
    expect(safeSuite(undefined)).toBeUndefined();
  });
});
