// @vitest-environment jsdom
/**
 * Copie locale chiffrée du carnet (PIN + AES-GCM) : ce qui reste sur un téléphone partagé doit être
 * illisible sans le PIN, et toute altération doit être refusée plutôt que lue de travers.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { hasSealed, openLocal, sealLocal, wipeLocal } from './secure-store';

const SECRET = { firstName: 'Koffi', conditions: ['Drépanocytose SS'], treatments: 'Hydroxyurée 500 mg' };
type Box = { v: number; salt: string; iv: string; ct: string; at: string };
const stored = (name: string) => JSON.parse(localStorage.getItem(`ganji-sealed-${name}`) ?? '{}') as Box;

describe('copie locale chiffrée', () => {
  beforeEach(() => localStorage.clear());

  it('rend les données intactes avec le bon PIN, avec la date d’enregistrement', async () => {
    await sealLocal('carnet', '1234', SECRET);
    const box = await openLocal<typeof SECRET>('carnet', '1234');
    expect(box?.data).toEqual(SECRET);
    expect(box?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('ne laisse rien en clair dans le stockage, ni les données ni le PIN', async () => {
    await sealLocal('carnet', '1234', SECRET);
    const raw = localStorage.getItem('ganji-sealed-carnet') ?? '';
    expect(raw).not.toContain('Koffi');
    expect(raw).not.toContain('Drépanocytose');
    expect(raw).not.toContain('1234');
    expect(stored('carnet')).toEqual({ v: 1, salt: expect.any(String), iv: expect.any(String), ct: expect.any(String), at: expect.any(String) });
  });

  it('refuse un PIN faux sans révéler le contenu', async () => {
    await sealLocal('carnet', '1234', SECRET);
    await expect(openLocal('carnet', '1235')).rejects.toThrow();
  });

  it('refuse une copie altérée, même d’un seul bit', async () => {
    await sealLocal('carnet', '1234', SECRET);
    const box = stored('carnet');
    const bytes = Uint8Array.from(atob(box.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 0x01;
    box.ct = btoa(String.fromCharCode(...bytes));
    localStorage.setItem('ganji-sealed-carnet', JSON.stringify(box));
    await expect(openLocal('carnet', '1234')).rejects.toThrow();
  });

  it('tire un sel et un vecteur neufs à chaque enregistrement', async () => {
    await sealLocal('a', '1234', SECRET);
    await sealLocal('b', '1234', SECRET);
    expect(stored('a').salt).not.toBe(stored('b').salt);
    expect(stored('a').iv).not.toBe(stored('b').iv);
    expect(stored('a').ct).not.toBe(stored('b').ct);
  });

  it('dit s’il existe une copie et l’efface sans toucher au reste du stockage', async () => {
    expect(hasSealed('carnet')).toBe(false);
    expect(await openLocal('carnet', '1234')).toBeNull();
    await sealLocal('carnet', '1234', SECRET);
    localStorage.setItem('ganji-prefs', '{"scale":"1.5"}');
    expect(hasSealed('carnet')).toBe(true);
    wipeLocal();
    expect(hasSealed('carnet')).toBe(false);
    expect(localStorage.getItem('ganji-prefs')).toBe('{"scale":"1.5"}');
  });
});
