/**
 * Carte d'urgence : lisible sans réseau depuis la copie locale, jamais de pathologie ni de nom complet
 * (ni à l'écran, ni dans la copie), et un chemin clair quand aucune copie n'existe encore.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary } from '@/lib/types';
import { CARD_KEY, type EmergencyCard } from '../_lib/emergency-card';
import { EmergencyCardView } from './EmergencyCardView';

const CARD: EmergencyCard = {
  firstName: 'Koffi', lastNameInitial: 'A', age: 9, bloodGroup: 'O+', allergies: ['Pénicilline'], treatments: 'Hydroxyurée 500 mg',
  emergencyContact: { name: 'Afi Mensah', phone: '0197000002' }, qrToken: 'jeton-test', savedAt: '2026-10-06T09:30:00Z',
};
const SUMMARY: Summary = {
  id: 'p1', firstName: 'Koffi', lastName: 'Adjovi', age: 9, birthDate: '2017-03-02', sex: 'M', bloodGroup: 'O+', bloodGroupSource: 'VERIFIE',
  allergies: ['Pénicilline'], treatments: 'Hydroxyurée 500 mg',
  conditions: [{ id: 'c1', code: 'D57.1', label: 'Drépanocytose SS', since: '2018-01-01' }],
  hiddenSensitive: true, emergencyContact: { name: 'Afi Mensah', phone: '0197000002' }, commune: 'Abomey-Calavi', department: 'Atlantique',
  qrToken: 'jeton-test', nextReminders: [], careTeam: [{ role: 'PRACTITIONER', name: 'Dr Houngbédji', specialty: 'HEMATOLOGIE' }],
  pregnancy: null, children: [], discreetMode: false, access: { via: 'OWNER', expiresAt: null },
};

let onLine = true;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localStorage.clear();
  onLine = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(SUMMARY), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.restoreAllMocks());

const cardHeading = () => screen.findByRole('heading', { level: 1, name: /Koffi A\. · 9 ans/ });

describe('hors ligne', () => {
  it('affiche la carte depuis la copie locale, sans appeler le réseau, et signale le mode hors ligne', async () => {
    onLine = false;
    localStorage.setItem(CARD_KEY, JSON.stringify(CARD));
    render(<EmergencyCardView />);
    expect(await cardHeading()).toBeInTheDocument();
    const article = within(screen.getByRole('article', { name: /Koffi A\./ }));
    expect(article.getByText('O+')).toBeInTheDocument();
    expect(article.getByText('Pénicilline')).toBeInTheDocument();
    expect(article.getByText('Hydroxyurée 500 mg')).toBeInTheDocument();
    expect(article.getByText('Afi Mensah')).toBeInTheDocument();
    expect(article.getByRole('link', { name: /01 97 00 00 02/ })).toHaveAttribute('href', 'tel:0197000002');
    expect(screen.getByText('Hors ligne')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sans copie locale ni réseau, explique quoi faire et garde le 118 à portée', async () => {
    onLine = false;
    render(<EmergencyCardView />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Carte d’urgence pas encore enregistrée sur ce téléphone');
    expect(screen.getByRole('link', { name: 'Ouvrir mon carnet' })).toHaveAttribute('href', '/connexion');
    expect(screen.getByRole('link', { name: /Appeler le 118/ })).toHaveAttribute('href', 'tel:118');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('en ligne', () => {
  it('rafraîchit la copie locale depuis le carnet et n’y garde rien de sensible', async () => {
    render(<EmergencyCardView />);
    expect(screen.getByText('Chargement de votre carte…')).toBeInTheDocument();
    expect(await cardHeading()).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/summary', expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' }));
    const raw = localStorage.getItem(CARD_KEY) ?? '';
    expect(JSON.parse(raw)).toMatchObject({ firstName: 'Koffi', lastNameInitial: 'A', bloodGroup: 'O+', qrToken: 'jeton-test' });
    for (const secret of ['Drépanocytose', 'Adjovi', 'Houngbédji']) {
      expect(raw).not.toContain(secret);
      expect(document.body.textContent).not.toContain(secret);
    }
  });

  it('montre aux secours un QR nommé, rendu sur le téléphone', async () => {
    render(<EmergencyCardView />);
    const qr = await screen.findByRole('img', { name: 'QR de la carte d’urgence, à scanner par les secours' });
    await waitFor(() => expect(qr.querySelector('svg')).not.toBeNull());
  });

  it('sans session (401) et sans copie, dit que la carte n’est pas encore enregistrée', async () => {
    fetchMock.mockImplementation(async () => new Response('{"message":"Non connecté"}', { status: 401 }));
    render(<EmergencyCardView />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('pas encore enregistrée');
  });

  it('garde la copie locale si le réseau tombe en route', async () => {
    localStorage.setItem(CARD_KEY, JSON.stringify(CARD));
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });
    render(<EmergencyCardView />);
    expect(await cardHeading()).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await cardHeading()).toBeInTheDocument();
    expect(screen.getByText(/Copie enregistrée sur ce téléphone le/)).toBeInTheDocument();
  });

  it('propose d’écouter la carte, de l’imprimer et d’appeler le 118', async () => {
    localStorage.setItem(CARD_KEY, JSON.stringify(CARD));
    render(<EmergencyCardView />);
    await cardHeading();
    expect(screen.getByRole('button', { name: 'Écouter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimer ma carte/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pompiers 118/ })).toHaveAttribute('href', 'tel:118');
  });
});
