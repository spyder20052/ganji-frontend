// @vitest-environment jsdom
/**
 * Carte d'urgence gardée en clair sur le téléphone : seulement ce que les secours doivent voir, jamais une
 * pathologie ni le nom complet ; une copie illisible n'empêche pas l'écran de s'afficher.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Summary } from '@/lib/types';
import { CARD_KEY, cardFromSummary, readCard, saveCard } from './emergency-card';

const SUMMARY: Summary = {
  id: 'p1',
  firstName: 'Koffi',
  lastName: 'Adjovi',
  age: 9,
  birthDate: '2017-03-02',
  sex: 'M',
  bloodGroup: 'O+',
  bloodGroupSource: 'VERIFIE',
  allergies: ['Pénicilline'],
  treatments: 'Hydroxyurée 500 mg',
  conditions: [{ id: 'c1', code: 'D57.1', label: 'Drépanocytose SS', since: '2018-01-01' }],
  hiddenSensitive: true,
  emergencyContact: { name: 'Afi Mensah', phone: '0197000002' },
  commune: 'Abomey-Calavi',
  department: 'Atlantique',
  qrToken: 'Zx9kL3mN8pQ2rS4tU6vW',
  nextReminders: [{ id: 'r1', kind: 'MEDICATION', title: 'Hydroxyurée', dueAt: '2026-10-08T07:00:00Z', place: null }],
  careTeam: [{ role: 'PRACTITIONER', name: 'Dr Houngbédji', specialty: 'HEMATOLOGIE' }],
  pregnancy: null,
  children: [],
  discreetMode: false,
  access: { via: 'OWNER', expiresAt: null },
};

describe('carte d’urgence locale', () => {
  beforeEach(() => localStorage.clear());

  it('ne garde que l’essentiel pour les secours : ni maladie, ni nom complet, ni équipe de soins', () => {
    const card = cardFromSummary(SUMMARY);
    expect(card).toEqual({
      firstName: 'Koffi',
      lastNameInitial: 'A',
      age: 9,
      bloodGroup: 'O+',
      allergies: ['Pénicilline'],
      treatments: 'Hydroxyurée 500 mg',
      emergencyContact: { name: 'Afi Mensah', phone: '0197000002' },
      qrToken: 'Zx9kL3mN8pQ2rS4tU6vW',
      savedAt: expect.any(String),
    });
    const raw = JSON.stringify(card);
    expect(raw).not.toContain('Drépanocytose');
    expect(raw).not.toContain('Adjovi');
    expect(raw).not.toContain('Houngbédji');
  });

  it('se relit telle qu’enregistrée', () => {
    const card = cardFromSummary(SUMMARY);
    expect(saveCard(card)).toBe(true);
    expect(readCard()).toEqual(card);
  });

  it('sans QR dans le résumé, la carte n’en invente pas', () => {
    expect(cardFromSummary({ ...SUMMARY, qrToken: undefined }).qrToken).toBeNull();
  });

  it('rend null sans copie ou si la copie est illisible, sans lever d’erreur', () => {
    expect(readCard()).toBeNull();
    localStorage.setItem(CARD_KEY, '{corrompu');
    expect(readCard()).toBeNull();
  });
});
