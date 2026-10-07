/**
 * Partage du carnet avec un soignant : choix des volets et de la durée, très sensible jamais coché par défaut,
 * QR et code dictable, annulation, accès confirmé quand le soignant a scanné, QR périmé signalé.
 */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareFlow } from './ShareFlow';
import type { ConsentView, ShareResult } from './types';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type Route = (init: RequestInit | undefined) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const body = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;
const inMinutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

const share = (hours: number, scanBefore = inMinutes(10)): ShareResult => ({ id: 'c1', shareToken: 'tok-1', shareCode: '123456', scanBefore, hours, qrPayload: 'ganji:share:tok-1' });
const GRANTED: ConsentView = { id: 'c1', grantee: 'Dr Houngbédji', scopes: ['summary'], source: 'QR', since: inMinutes(0), expiresAt: inMinutes(24 * 60), active: true, revokedAt: null };

const fetchMock = vi.fn<typeof fetch>();
let routes: Record<string, Route>;
let consents: ConsentView[];
const calls = () => fetchMock.mock.calls.map(([input, init]) => ({ key: `${init?.method ?? 'GET'} ${String(input)}`, init }));

beforeEach(() => {
  consents = [];
  routes = {
    'POST /api/me/share': (init) => json(share(Number(body(init).hours))),
    'GET /api/me/consents': () => json(consents),
    'DELETE /api/me/consents/c1': () => new Response(null, { status: 204 }),
  };
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`Appel inattendu : ${key}`);
    return route(init);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.useRealTimers());

const scope = (name: RegExp) => screen.getByRole('checkbox', { name });
const showQr = () => screen.getByRole('button', { name: 'Montrer mon QR' });

describe('choix', () => {
  it('par défaut : tout le carnet sauf le très sensible, pour 24 heures', () => {
    render(<ShareFlow preview={{ documents: 2, prescriptions: 1 }} />);
    expect(screen.getByText('Tout le carnet, sauf le très sensible')).toBeInTheDocument();
    for (const re of [/^Fiche vitale/, /^Chronologie des soins/, /^Résultats d’analyses/, /^Documents/, /^Ordonnances/]) expect(scope(re)).toBeChecked();
    expect(scope(/^Données très sensibles/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: '24 heures' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '1 heure' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Vos 2 documents')).toBeInTheDocument();
    expect(screen.getByText('Votre ordonnance')).toBeInTheDocument();
    expect(showQr()).toBeEnabled();
  });

  it('décocher des volets change le résumé et marque ce qui ne part pas ; sans aucun volet, pas de QR', async () => {
    const user = userEvent.setup();
    render(<ShareFlow preview={{ documents: 2, prescriptions: 1 }} />);
    await user.click(scope(/^Documents/));
    await user.click(scope(/^Ordonnances/));
    expect(screen.getByText('3 parties sur 5, sauf le très sensible')).toBeInTheDocument();
    expect(screen.getByText('Vos 2 documents')).toHaveTextContent(': non partagé');
    for (const re of [/^Fiche vitale/, /^Chronologie des soins/, /^Résultats d’analyses/]) await user.click(scope(re));
    expect(showQr()).toBeDisabled();
    expect(screen.getByText('Cochez au moins une partie du carnet.')).toBeInTheDocument();
    await user.click(scope(/^Fiche vitale/));
    expect(screen.getByText('1 partie sur 5, sauf le très sensible')).toBeInTheDocument();
    expect(showQr()).toBeEnabled();
  });
});

describe('partage', () => {
  it('crée le partage avec les volets, le très sensible et la durée choisis, puis montre le QR et le code à dicter', async () => {
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(scope(/^Données très sensibles/));
    expect(screen.getByText('Tout le carnet, très sensible compris')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '1 heure' }));
    await user.click(showQr());
    expect(await screen.findByText('Montrez ce code au soignant')).toBeInTheDocument();
    const post = calls().find((c) => c.key === 'POST /api/me/share');
    expect(post && body(post.init)).toEqual({ scopes: ['summary', 'timeline', 'observations', 'documents', 'prescriptions', 'sensitive'], hours: 1 });
    expect(screen.getByRole('img', { name: 'QR de partage de votre carnet, à scanner par le soignant' })).toBeInTheDocument();
    expect(screen.getByLabelText('Code : 1 2 3 4 5 6')).toHaveTextContent('123 456');
    expect(screen.getByText(/À scanner avant \d{1,2} h \d{2}/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('En attente du scan… Accès prévu pour 1 h : fiche vitale, chronologie des soins, résultats d’analyses, documents, ordonnances, données très sensibles.');
  });

  it('« Annuler ce partage » révoque le QR côté API et revient au choix', async () => {
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(showQr());
    await user.click(await screen.findByRole('button', { name: 'Annuler ce partage' }));
    expect(await screen.findByRole('button', { name: 'Montrer mon QR' })).toBeInTheDocument();
    expect(calls().some((c) => c.key === 'DELETE /api/me/consents/c1')).toBe(true);
  });

  it('annonce le refus de l’API tel quel', async () => {
    routes['POST /api/me/share'] = () => json({ message: 'Carnet en lecture seule pendant la vérification.' }, 403);
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(showQr());
    expect(await screen.findByRole('alert')).toHaveTextContent('Carnet en lecture seule pendant la vérification.');
    expect(showQr()).toBeEnabled();
  });

  it('sans réseau, dit que le partage demande une connexion', async () => {
    routes['POST /api/me/share'] = () => {
      throw new TypeError('Failed to fetch');
    };
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(showQr());
    expect(await screen.findByRole('alert')).toHaveTextContent('Pas de réseau : le partage demande une connexion. Réessayez.');
  });
});

describe('attente du scan (interrogation toutes les 3 s)', () => {
  it('quand le soignant a scanné, le dit avec son nom et l’échéance, puis permet un autre partage', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(showQr());
    await screen.findByText('Montrez ce code au soignant');
    consents = [GRANTED];
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(await screen.findByText(/Dr Houngbédji a maintenant accès jusqu’à/)).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Faire un autre partage' }));
    expect(screen.getByRole('button', { name: 'Montrer mon QR' })).toBeInTheDocument();
  });

  it('un QR non scanné à temps ne marche plus : le dit et propose d’en refaire un', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    routes['POST /api/me/share'] = () => json(share(24, inMinutes(-1)));
    const user = userEvent.setup();
    render(<ShareFlow />);
    await user.click(showQr());
    await screen.findByText('Montrez ce code au soignant');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Le QR n’a pas été scanné à temps. Il ne marche plus : créez-en un nouveau.');
    expect(screen.getByRole('button', { name: 'Montrer mon QR' })).toBeEnabled();
    await waitFor(() => expect(calls().some((c) => c.key === 'GET /api/me/consents')).toBe(false));
  });
});
