/**
 * Simulateur de téléphone simple (démo) : SMS reçus par numéro, réponse « 1 » d'un donneur, clé du simulateur
 * jointe seulement pour un carnet créé dans ce navigateur, menu USSD, et messages clairs quand la démo est coupée.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulator } from './Simulator';

interface Outbox {
  id: string; channel: string; to: string; lang: string; body: string; audioKey: string | null; status: string; ref: string | null; createdAt: string; sentAt: string | null;
}
type Route = (init: RequestInit | undefined) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const body = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;

const PHONES = {
  personas: [
    { label: 'Koffi (patient)', phone: '0190000001', role: 'PATIENT', persona: 'koffi' },
    { label: 'Dr Houngbédji', phone: '0190000002', role: 'PRACTITIONER', persona: 'medecin' },
  ],
  donors: [
    { label: 'Rodrigue', phone: '0196000000', smartphone: false },
    { label: 'Mariam', phone: '0196000001', smartphone: true },
  ],
};
const ALERT: Outbox = {
  id: 'm1', channel: 'SMS', to: '0196000000', lang: 'fr', body: 'Ganji : besoin urgent de plaquettes O+ au CNHU. Répondez 1 pour venir, 2 sinon.',
  audioKey: null, status: 'SENT', ref: 'alert-1', createdAt: '2026-10-07T08:00:00Z', sentAt: '2026-10-07T08:00:00Z',
};
const VOICE: Outbox = {
  ...ALERT, id: 'm2', channel: 'VOICE', to: '0190000001', lang: 'fon', body: 'Message vocal (fon) : Rappel de votre consultation demain à 8 h.',
  audioKey: 'rappel.consultation', createdAt: '2026-10-07T08:05:00Z',
};

const fetchMock = vi.fn<typeof fetch>();
let routes: Record<string, Route>;
const calls = () => fetchMock.mock.calls.map(([input, init]) => ({ key: `${init?.method ?? 'GET'} ${String(input)}`, init }));
const device = () => within(screen.getByRole('region', { name: /Écran du téléphone/ }));

beforeEach(() => {
  localStorage.clear();
  routes = {
    'GET /api/sms/phones': () => json(PHONES),
    'GET /api/sms/outbox': () => json([ALERT, VOICE]),
    'GET /api/sms/outbox?to=0196000000': () => json([ALERT]),
    'GET /api/sms/outbox?to=0190000001': () => json([VOICE]),
    'POST /api/sms/inbound': () => json({ handled: 'DON_ACCEPTE' }),
    'POST /api/jobs/tick': () => json({ remindersSent: 2, donorAlertsExpired: 0, clusterAlerts: 1 }),
  };
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const route = routes[key] ?? (key.startsWith('GET /api/sms/outbox?to=') ? () => json([]) : undefined);
    if (!route) throw new Error(`Appel inattendu : ${key}`);
    return route(init);
  });
  vi.stubGlobal('fetch', fetchMock);
});

describe('choix du téléphone', () => {
  it('propose les téléphones de la démo et ouvre celui de l’adresse, avec ses SMS', async () => {
    render(<Simulator initialTel="0196000000" />);
    expect(await screen.findByRole('button', { name: /Rodrigue/, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mariam/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Koffi \(patient\)/ })).toHaveTextContent('patient · 01 90 00 00 01');
    const phone = device();
    expect(await phone.findByText('Donneur · Rodrigue · 01 96 00 00 00')).toBeInTheDocument();
    expect(await phone.findByText(/besoin urgent de plaquettes O\+/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Tous les messages/ })).toHaveTextContent('(2)');
  });

  it('sans numéro dans l’adresse, ouvre le premier donneur', async () => {
    render(<Simulator initialTel="" />);
    expect(await screen.findByRole('button', { name: /Rodrigue/, pressed: true })).toBeInTheDocument();
    await waitFor(() => expect(calls().some((c) => c.key === 'GET /api/sms/outbox?to=0196000000')).toBe(true));
  });

  it('pour un vrai numéro inconnu de ce navigateur, explique pourquoi rien ne s’affiche', async () => {
    routes['GET /api/sms/outbox?to=0197000009'] = () => json({ message: 'Numéro inconnu' }, 404);
    render(<Simulator initialTel="0197000009" />);
    expect(await device().findByText(/Ce numéro n’est pas un téléphone de démonstration/)).toBeInTheDocument();
  });

  it('quand la démo est coupée côté API, le dit et désactive l’envoi des rappels', async () => {
    routes['GET /api/sms/phones'] = () => json({ message: 'Not found' }, 404);
    render(<Simulator initialTel="" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Le simulateur n’est disponible qu’en mode démonstration');
    expect(screen.getByRole('button', { name: 'Envoyer les rappels du jour maintenant' })).toBeDisabled();
  });
});

describe('clé du simulateur', () => {
  it('est jointe pour un carnet créé dans ce navigateur, jamais pour un téléphone de démonstration', async () => {
    localStorage.setItem('ganji-sim:0197000001', 'cle-x');
    const user = userEvent.setup();
    render(<Simulator initialTel="0197000001" />);
    await waitFor(() => expect(calls().some((c) => c.key === 'GET /api/sms/outbox?to=0197000001')).toBe(true));
    expect(calls().find((c) => c.key === 'GET /api/sms/outbox?to=0197000001')?.init?.headers).toMatchObject({ 'x-ganji-simulator': 'cle-x' });
    await user.click(await screen.findByRole('button', { name: /Rodrigue/ }));
    await waitFor(() => expect(calls().some((c) => c.key === 'GET /api/sms/outbox?to=0196000000')).toBe(true));
    expect(calls().find((c) => c.key === 'GET /api/sms/outbox?to=0196000000')?.init?.headers).not.toHaveProperty('x-ganji-simulator');
  });
});

describe('SMS', () => {
  it('répondre « 1 » envoie le SMS au nom de ce téléphone et montre ce que Ganji en a fait', async () => {
    const user = userEvent.setup();
    render(<Simulator initialTel="0196000000" />);
    await screen.findByRole('button', { name: /Rodrigue/, pressed: true });
    await user.click(device().getByRole('button', { name: '1' }));
    expect(await device().findByText(/Don accepté : la demande de sang est mise à jour en direct/)).toBeInTheDocument();
    const inbound = calls().find((c) => c.key === 'POST /api/sms/inbound');
    expect(inbound && body(inbound.init)).toEqual({ from: '0196000000', body: '1' });
  });

  it('envoie un SMS libre (STOP) puis vide le champ', async () => {
    routes['POST /api/sms/inbound'] = () => json({ handled: 'STOP' });
    const user = userEvent.setup();
    render(<Simulator initialTel="0196000000" />);
    await screen.findByRole('button', { name: /Rodrigue/, pressed: true });
    const input = device().getByLabelText('Répondre par SMS');
    const send = device().getByRole('button', { name: 'Envoyer le SMS' });
    expect(send).toBeDisabled();
    await user.type(input, 'STOP');
    await user.click(send);
    expect(await device().findByText(/Désinscrit des appels au don/)).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('montre l’échec d’un envoi sur le message lui-même', async () => {
    routes['POST /api/sms/inbound'] = () => json({ message: 'Service indisponible' }, 503);
    const user = userEvent.setup();
    render(<Simulator initialTel="0196000000" />);
    await screen.findByRole('button', { name: /Rodrigue/, pressed: true });
    await user.click(device().getByRole('button', { name: '2' }));
    expect(await device().findByText(/Échec : Service indisponible/)).toBeInTheDocument();
  });

  it('un appel vocal reçu se lit comme un message et peut être écouté', async () => {
    render(<Simulator initialTel="0190000001" />);
    const phone = device();
    expect(await phone.findByText(/Appel vocal \(fon\)/)).toBeInTheDocument();
    expect(phone.getByText('Rappel de votre consultation demain à 8 h.')).toBeInTheDocument();
    expect(phone.getByRole('button', { name: 'Écouter l’appel' })).toBeInTheDocument();
  });
});

describe('rappels du jour', () => {
  it('déclenche l’envoi et résume ce qui est parti', async () => {
    const user = userEvent.setup();
    render(<Simulator initialTel="0196000000" />);
    await user.click(screen.getByRole('button', { name: 'Envoyer les rappels du jour maintenant' }));
    expect(await screen.findByText('2 rappels envoyés (SMS, voix, application) · 0 appel au don expiré · 1 alerte de regroupement')).toBeInTheDocument();
    const tick = calls().find((c) => c.key === 'POST /api/jobs/tick');
    expect(tick && body(tick.init)).toEqual({ horizonHours: 24 });
  });

  it('montre le refus de l’API sans bloquer le bouton', async () => {
    routes['POST /api/jobs/tick'] = () => json({ message: 'Envoi déjà en cours.' }, 409);
    const user = userEvent.setup();
    render(<Simulator initialTel="0196000000" />);
    await user.click(screen.getByRole('button', { name: 'Envoyer les rappels du jour maintenant' }));
    expect(await screen.findByText('Envoi déjà en cours.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer les rappels du jour maintenant' })).toBeEnabled();
  });
});

describe('menu USSD', () => {
  it('compose le code, navigue dans le menu, puis raccroche', async () => {
    const texts: string[] = [];
    routes['POST /api/ussd'] = (init) => {
      const text = String(body(init).text);
      texts.push(text);
      return json({ text: text === '' ? 'CON Ganji\n1. Mes rappels\n2. Ma carte' : 'END Prochain rappel : demain à 8 h.' });
    };
    const user = userEvent.setup();
    render(<Simulator initialTel="0190000001" />);
    await user.click(screen.getByRole('tab', { name: 'USSD *229*25#' }));
    const panel = within(screen.getByRole('tabpanel'));
    await user.click(panel.getByRole('button', { name: 'Composer *229*25#' }));
    expect(panel.getByLabelText('Saisie')).toHaveTextContent('*229*25#');
    await user.click(panel.getByRole('button', { name: 'Appeler' }));
    expect(await panel.findByText(/1\. Mes rappels/)).toBeInTheDocument();
    await user.click(panel.getByRole('button', { name: '1' }));
    await user.click(panel.getByRole('button', { name: 'Envoyer' }));
    expect(await panel.findByText(/Prochain rappel : demain à 8 h\./)).toBeInTheDocument();
    expect(texts).toEqual(['', '1']);
    expect(panel.getByRole('button', { name: '2' })).toBeDisabled();
    await user.click(panel.getByRole('button', { name: 'Raccrocher' }));
    expect(panel.getByText('Composez le code puis appuyez sur la touche verte.')).toBeInTheDocument();
  });

  it('refuse un code inconnu sans appeler l’API', async () => {
    const user = userEvent.setup();
    render(<Simulator initialTel="0190000001" />);
    await user.click(screen.getByRole('tab', { name: 'USSD *229*25#' }));
    const panel = within(screen.getByRole('tabpanel'));
    for (const k of ['*', '1', '2', '3', '#']) await user.click(panel.getByRole('button', { name: k }));
    await user.click(panel.getByRole('button', { name: 'Appeler' }));
    expect(panel.getByText('Code inconnu. Composez *229*25#')).toBeInTheDocument();
    expect(calls().some((c) => c.key === 'POST /api/ussd')).toBe(false);
  });
});
