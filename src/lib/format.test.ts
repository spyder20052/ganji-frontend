import { describe, expect, it } from 'vitest';
import { fcfa, fmtDate, fmtPhone } from './format';

describe('format', () => {
  it('affiche les montants en FCFA', () => {
    expect(fcfa(1500).replace(/\s/g, ' ')).toBe('1 500 FCFA');
    expect(fcfa(null)).toBe('—');
  });
  it('affiche les dates au fuseau de Cotonou', () => {
    expect(fmtDate('2026-09-24T23:30:00Z')).toContain('25');
  });
  it('espace les numéros de téléphone pour les lire et les dicter', () => {
    expect(fmtPhone('0190000002')).toBe('01 90 00 00 02');
    expect(fmtPhone('+2290190000002')).toBe('+229 01 90 00 00 02');
    expect(fmtPhone('118')).toBe('118');
  });
});
