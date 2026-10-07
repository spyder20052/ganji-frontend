// @vitest-environment jsdom
/**
 * Clé du simulateur : l'API ne montre les SMS d'un vrai carnet qu'au navigateur qui l'a créé. La clé doit
 * être retrouvée quelle que soit l'écriture du numéro, et jamais envoyée pour un téléphone de démonstration.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizePhone, rememberSimulatorKey, SIMULATOR_HEADER, simulatorHeaders, simulatorKeyFor } from './simulator';

describe('normalisation du numéro (même règle que l’API)', () => {
  it('ne garde que les chiffres et retire l’indicatif 229', () => {
    expect(normalizePhone('01 96 00 01 23')).toBe('0196000123');
    expect(normalizePhone('+229 01 96 00 01 23')).toBe('0196000123');
    expect(normalizePhone('229 96 00 01 23')).toBe('0196000123');
  });

  it('ajoute « 01 » devant un ancien numéro à 8 chiffres', () => {
    expect(normalizePhone('96000123')).toBe('0196000123');
    expect(normalizePhone('+22996000123')).toBe('0196000123');
  });

  it('laisse un numéro à 10 chiffres tel quel', () => {
    expect(normalizePhone('0196000123')).toBe('0196000123');
  });
});

describe('clé par numéro', () => {
  beforeEach(() => localStorage.clear());

  it('retrouve la clé quelle que soit l’écriture du numéro', () => {
    rememberSimulatorKey('+229 96 00 01 23', 'cle-abc');
    expect(simulatorKeyFor('0196000123')).toBe('cle-abc');
    expect(simulatorKeyFor('01 96 00 01 23')).toBe('cle-abc');
    expect(simulatorHeaders('96000123')).toEqual({ [SIMULATOR_HEADER]: 'cle-abc' });
  });

  it('n’envoie aucun en-tête pour un téléphone de démonstration (sans clé)', () => {
    expect(simulatorKeyFor('0196000000')).toBeNull();
    expect(simulatorHeaders('0196000000')).toEqual({});
  });

  it('garde une clé par numéro : deux carnets ne se mélangent pas', () => {
    rememberSimulatorKey('0197000001', 'cle-1');
    rememberSimulatorKey('0197000002', 'cle-2');
    expect(simulatorHeaders('0197000001')).toEqual({ 'x-ganji-simulator': 'cle-1' });
    expect(simulatorHeaders('0197000002')).toEqual({ 'x-ganji-simulator': 'cle-2' });
  });
});
