import { describe, expect, it } from 'vitest';
import { cleanPath, deviceClass, isId, localeOf, newId, sourceOf } from './audience';

describe('mesure d’audience', () => {
  it('retire tout identifiant du chemin', () => {
    expect(cleanPath('/pro/patients/3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60')).toBe('/pro/patients/:id');
    expect(cleanPath('/urgence/Zx9_kL3mN8pQ2rS4tU6vW')).toBe('/urgence/:id');
    expect(cleanPath('/app/droits/recu/GJ-20260924-0001')).toBe('/app/droits/recu/:id');
    expect(cleanPath('/simulateur?tel=0196000000#sms')).toBe('/simulateur');
  });
  it('garde les chemins ordinaires tels quels, sans barre finale', () => {
    expect(cleanPath('/')).toBe('/');
    expect(cleanPath('/orientation/')).toBe('/orientation');
    expect(cleanPath('/app/carte-urgence')).toBe('/app/carte-urgence');
  });
  it('refuse ce qui n’est pas un chemin du site', () => {
    expect(cleanPath('https://exemple.bj/')).toBe('autre');
    expect(cleanPath('/<script>')).toBe('autre');
    expect(cleanPath(`/${Array(40).fill('ab').join('/')}`)).toBe('autre');
    expect(cleanPath(`/${'a'.repeat(120)}`)).toBe('/:id');
    expect(cleanPath(undefined)).toBe('/');
  });
  it('classe les appareils par largeur d’écran', () => {
    expect(deviceClass(390)).toBe('m');
    expect(deviceClass(820)).toBe('t');
    expect(deviceClass(1440)).toBe('d');
  });
  it('ne compte comme provenance que les autres sites', () => {
    expect(sourceOf('https://www.google.com/search?q=ganji')).toBe('google.com');
    expect(sourceOf('https://ganji-sante.vercel.app/demo')).toBe('direct');
    expect(sourceOf('https://ganji-sante-git-develop-spynels-projects.vercel.app/')).toBe('direct');
    expect(sourceOf('pas une adresse')).toBe('direct');
    expect(sourceOf(undefined)).toBe('direct');
  });
  it('valide les identifiants et la langue', () => {
    expect(isId(newId())).toBe(true);
    expect(isId('court')).toBe(false);
    expect(isId('UPPER1234567')).toBe(false);
    expect(localeOf('en')).toBe('en');
    expect(localeOf('xx')).toBe('autre');
  });
});
