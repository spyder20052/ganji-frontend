/**
 * Suivi en direct d'une demande de sang : résumé lisible, statuts et étapes, mise à jour quand un donneur
 * répond, annulation avec confirmation, relance des donneurs, et réseau instable signalé sans bloquer.
 */
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BloodLive } from './BloodLive';
import type { LiveRequest } from './types';

type Route = (init: RequestInit | undefined) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const ID = '3f2a9c1e-7d4b-4e2a-9f0c-1b2c3d4e5f60';

const REQUEST: LiveRequest = {
  id: ID, product: 'PLAQUETTES', productLabel: 'Plaquettes', bloodGroup: 'O+', quantity: 2, urgency: 'VITALE', status: 'DONNEURS_ALERTES',
  neededBy: '2026-10-07T12:00:00Z', createdAt: '2026-10-07T09:00:00Z', requester: 'Dr Houngbédji', facility: 'CNHU-HKM', patient: 'Koffi Adjovi',
  counts: { alerted: 5, accepted: 0, declined: 1, waiting: 4 },
  donors: [
    { id: 'd1', firstName: 'Rodrigue', bloodGroup: 'O+', city: 'Cotonou', distanceKm: 3.2, channel: 'SMS', status: 'ENVOYEE', appointment: null },
    { id: 'd2', firstName: 'Mariam', bloodGroup: 'O-', city: 'Abomey-Calavi', distanceKm: 8.5, channel: 'APP', status: 'REFUSEE', appointment: null },
  ],
  compatibleGroups: ['O+', 'O-'],
  coverage: { quantity: 2, accepted: 0, reserved: 0, covered: 0, missing: 2, complete: false },
  reserved: null,
  dispatch: { donorsAlerted: 5, byChannel: { SMS: 3, APP: 2 }, volunteers: 0, radiusKm: 40, antsNotified: 1, stockNearby: [{ site: 'ANTS Cotonou', distanceKm: 4, units: 1 }], nearbyUnits: 1 },
};
const FOUND: LiveRequest = {
  ...REQUEST, status: 'DONNEUR_TROUVE', counts: { alerted: 5, accepted: 1, declined: 1, waiting: 3 },
  donors: [{ ...REQUEST.donors![0], status: 'ACCEPTEE', appointment: '2026-10-07T10:30:00Z' }, REQUEST.donors![1]],
  coverage: { quantity: 2, accepted: 1, reserved: 0, covered: 1, missing: 1, complete: false },
};

const fetchMock = vi.fn<typeof fetch>();
let live: LiveRequest;
let routes: Record<string, Route>;
const calls = () => fetchMock.mock.calls.map(([input, init]) => ({ key: `${init?.method ?? 'GET'} ${String(input)}`, init }));

beforeEach(() => {
  live = REQUEST;
  routes = {
    [`GET /api/blood/requests/${ID}`]: () => json(live),
    [`POST /api/blood/requests/${ID}/cancel`]: () => {
      live = { ...live, status: 'ANNULEE' };
      return json({ ok: true, donorsInformed: 1, reservedReturned: 0 });
    },
    [`POST /api/blood/requests/${ID}/alert-donors`]: () => json({ alerted: 3, radiusKm: 80, widened: true, byChannel: { SMS: 3 } }),
  };
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`Appel inattendu : ${key}`);
    return route(init);
  });
  vi.stubGlobal('fetch', fetchMock);
});

/** L'écran se rafraîchit toutes les 3 s et dès que l'onglet redevient visible : on utilise ce second chemin. */
const comeBackToTab = () => act(() => document.dispatchEvent(new Event('visibilitychange')));
const row = (name: string) => within(screen.getByRole('row', { name: new RegExp(name) }));
/** Les étapes du suivi, dans l'ordre, avec leur état lu par les lecteurs d'écran (« Demande créée : fait »). */
const steps = () => within(screen.getByRole('region', { name: 'Où en est la demande' })).getAllByRole('listitem');

describe('résumé', () => {
  it('dit la demande en clair : quantité, produit, groupe, urgence, statut, et compte annoncé aux lecteurs d’écran', () => {
    render(<BloodLive id={ID} initial={REQUEST} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2 poches de plaquettes · O+');
    expect(screen.getByText(/CNHU-HKM · demandé par Dr Houngbédji/)).toBeInTheDocument();
    expect(screen.getByText('Urgence vitale')).toBeInTheDocument();
    expect(screen.getByText('5 donneurs alertés, 0 ont dit oui, 1 ont dit non, 4 en attente. Donneurs alertés.')).toBeInTheDocument();
    expect(screen.getByText(/En direct/)).toBeInTheDocument();
    expect(row('Rodrigue').getByText('En attente')).toBeInTheDocument();
    expect(row('Mariam').getByText('A dit non')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ouvrir le simulateur SMS/ })).toHaveAttribute('href', '/simulateur');
  });

  it('montre où en est la demande : étapes faites, étape en cours', () => {
    render(<BloodLive id={ID} initial={REQUEST} />);
    const [created, stock, alerted, found, served] = steps();
    expect(created).toHaveTextContent('Demande créée : fait');
    expect(stock).toHaveTextContent('Stock vérifié : fait');
    expect(alerted).toHaveTextContent('Donneurs alertés : fait');
    expect(found).toHaveAttribute('aria-current', 'step');
    expect(found).toHaveTextContent('Donneur trouvé : en cours');
    expect(served).toHaveTextContent('Transfusion faite : à venir');
    expect(served).not.toHaveAttribute('aria-current');
  });

  it('dit qui a été prévenu : banque de sang, donneurs par canal et rayon, stock compatible proche', () => {
    render(<BloodLive id={ID} initial={REQUEST} />);
    expect(screen.getByText('Banque de sang (ANTS)')).toBeInTheDocument();
    expect(screen.getByText('5 donneurs compatibles')).toBeInTheDocument();
    expect(screen.getByText('SMS 3 · Application 2 · à moins de 40 km')).toBeInTheDocument();
    expect(screen.getByText('1 poche compatible à moins de 60 km')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /ANTS Cotonou/ })).toHaveTextContent('4 km');
  });

  it('alerte quand personne n’est disponible et que le stock ne suffit pas', () => {
    const nobody: LiveRequest = { ...REQUEST, status: 'OUVERTE', counts: { alerted: 0, accepted: 0, declined: 0, waiting: 0 }, donors: [], dispatch: { ...REQUEST.dispatch!, donorsAlerted: 0, byChannel: {}, radiusKm: 150 } };
    render(<BloodLive id={ID} initial={nobody} />);
    expect(screen.getByText(/Aucun donneur compatible disponible, même à 150 km\. La banque de sang est prévenue : appelez-la/)).toBeInTheDocument();
    expect(screen.getByText('Aucun donneur alerté pour l’instant.')).toBeInTheDocument();
  });
});

describe('mise à jour en direct', () => {
  it('quand un donneur répond oui, passe à « Donneur trouvé » avec son rendez-vous', async () => {
    render(<BloodLive id={ID} initial={REQUEST} />);
    live = FOUND;
    comeBackToTab();
    expect(await screen.findByText('Donneur trouvé', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/Rodrigue \(O\+, 3,2 km\) viendra .+ à CNHU-HKM\./)).toBeInTheDocument();
    expect(screen.getByText('1 poche sur 2 trouvée : la recherche continue pour la suite.')).toBeInTheDocument();
    expect(screen.getByText('5 donneurs alertés, 1 ont dit oui, 1 ont dit non, 3 en attente. Donneur trouvé.')).toBeInTheDocument();
    expect(row('Rodrigue').getByText('A dit oui')).toBeInTheDocument();
    expect(row('Rodrigue').getByText(/RDV /)).toBeInTheDocument();
  });

  it('réseau instable : le dit et garde les dernières données affichées', async () => {
    render(<BloodLive id={ID} initial={REQUEST} />);
    routes[`GET /api/blood/requests/${ID}`] = () => {
      throw new TypeError('Failed to fetch');
    };
    comeBackToTab();
    expect(await screen.findByText(/Réseau instable · nouvel essai dans 3 s/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('2 poches de plaquettes · O+');
  });

  it('poches réservées par la banque de sang : le dit avec le site', () => {
    render(<BloodLive id={ID} initial={{ ...REQUEST, status: 'POCHES_RESERVEES', reserved: { units: 2, site: 'ANTS Cotonou' } }} />);
    expect(screen.getByText('2 poches mises de côté par ANTS Cotonou pour Koffi Adjovi.')).toBeInTheDocument();
  });
});

describe('annulation', () => {
  it('demande confirmation, prévient l’API, puis affiche la demande clôturée', async () => {
    const user = userEvent.setup();
    render(<BloodLive id={ID} initial={REQUEST} />);
    await user.click(screen.getByRole('button', { name: 'Annuler la demande' }));
    const confirm = within(screen.getByRole('group', { name: 'Confirmer l’annulation' }));
    expect(confirm.getByText(/Les donneurs qui ont dit oui seront prévenus/)).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Oui, annuler' }));
    expect(await screen.findByText('Demande annulée. 1 donneur prévenu qu’il n’a plus à venir.')).toBeInTheDocument();
    const cancel = calls().find((c) => c.key === `POST /api/blood/requests/${ID}/cancel`);
    expect(cancel?.init?.body).toBe('{}');
    expect(screen.getByText(/Demande annulée\. Les donneurs attendus ont été prévenus/)).toBeInTheDocument();
    expect(screen.getByText('Demande clôturée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Annuler la demande' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transfusion faite' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relancer d’autres donneurs' })).toBeDisabled();
  });

  it('« Garder la demande » referme la confirmation sans rien envoyer', async () => {
    const user = userEvent.setup();
    render(<BloodLive id={ID} initial={REQUEST} />);
    await user.click(screen.getByRole('button', { name: 'Annuler la demande' }));
    await user.click(screen.getByRole('button', { name: 'Garder la demande' }));
    expect(screen.queryByRole('group', { name: 'Confirmer l’annulation' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler la demande' })).toBeInTheDocument();
    expect(calls().some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  it('en cas de refus de l’API, annonce le motif et laisse la confirmation ouverte', async () => {
    routes[`POST /api/blood/requests/${ID}/cancel`] = () => json({ message: 'Demande déjà clôturée.' }, 409);
    const user = userEvent.setup();
    render(<BloodLive id={ID} initial={REQUEST} />);
    await user.click(screen.getByRole('button', { name: 'Annuler la demande' }));
    await user.click(screen.getByRole('button', { name: 'Oui, annuler' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Demande déjà clôturée.');
    expect(screen.getByRole('group', { name: 'Confirmer l’annulation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Oui, annuler' })).toBeEnabled();
  });
});

describe('relance et clôture', () => {
  it('relance d’autres donneurs et résume l’élargissement du rayon', async () => {
    const user = userEvent.setup();
    render(<BloodLive id={ID} initial={REQUEST} />);
    await user.click(screen.getByRole('button', { name: 'Relancer d’autres donneurs' }));
    expect(await screen.findByText('3 nouveaux donneurs alertés. Rayon élargi à 80 km.')).toBeInTheDocument();
    expect(calls().some((c) => c.key === `POST /api/blood/requests/${ID}/alert-donors`)).toBe(true);
  });

  it('ne relance plus quand la demande est couverte', () => {
    render(<BloodLive id={ID} initial={{ ...FOUND, counts: { ...FOUND.counts, accepted: 2 }, coverage: { quantity: 2, accepted: 2, reserved: 0, covered: 2, missing: 0, complete: true } }} />);
    expect(screen.getByRole('button', { name: 'Relancer d’autres donneurs' })).toBeDisabled();
  });

  it('demande servie : clôturée, sans action possible, transfusion inscrite au carnet', async () => {
    render(<BloodLive id={ID} initial={{ ...FOUND, status: 'SERVIE' }} />);
    expect(screen.getByText('Transfusion faite et inscrite dans le carnet de Koffi Adjovi. Demande clôturée.')).toBeInTheDocument();
    expect(screen.getByText('Demande clôturée')).toBeInTheDocument();
    expect(steps()[4]).toHaveTextContent('Transfusion faite : fait');
    expect(screen.queryByRole('button', { name: 'Annuler la demande' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transfusion faite' })).not.toBeInTheDocument();
    comeBackToTab();
    await waitFor(() => expect(calls()).toEqual([]));
  });
});
