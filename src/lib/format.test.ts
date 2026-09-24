import { describe, expect, it } from 'vitest';
import { fcfa, fmtDate } from './format';

describe('format', () => {
  it('affiche les montants en FCFA', () => {
    expect(fcfa(1500).replace(/\s/g, ' ')).toBe('1 500 FCFA');
    expect(fcfa(null)).toBe('—');
  });
  it('affiche les dates au fuseau de Cotonou', () => {
    expect(fmtDate('2026-09-24T23:30:00Z')).toContain('25');
  });
});
