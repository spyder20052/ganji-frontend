/**
 * Connexion par code SMS : étapes téléphone, code et inscription ; erreurs annoncées sans détail technique ;
 * indice sur la visibilité du code dans le simulateur ; renvoi vers le bon espace selon le rôle.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Me } from '@/lib/types';
import { LoginForm } from './LoginForm';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

type User = ReturnType<typeof userEvent.setup>;
type Route = (init: RequestInit | undefined) => Response;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const body = (init: RequestInit | undefined) => JSON.parse(String(init?.body)) as Record<string, unknown>;
const fetchMock = vi.fn<typeof fetch>();
let routes: Record<string, Route>;

const ME: Me = {
  id: 'u1', role: 'PRACTITIONER', displayName: 'Dr Houngbédji', lang: 'fr', simpleMode: false, npiLast4: null, phone: '0190000002',
  demoPersona: 'medecin', patientId: null, facilityId: 'f1', profileDone: true, practitioner: null, delegations: [],
};

beforeEach(() => {
  localStorage.clear();
  routes = { 'GET /api/geo/departments': () => json([]) };
  fetchMock.mockImplementation(async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const route = routes[key];
    if (!route) throw new Error(`Appel inattendu : ${key}`);
    return route(init);
  });
  vi.stubGlobal('fetch', fetchMock);
});

async function askCode(user: User, phone = '0190000002') {
  await user.type(screen.getByLabelText('Votre numéro de téléphone'), phone);
  await user.click(screen.getByRole('button', { name: 'Recevoir un code par SMS' }));
}
async function toCodeStep(user: User, phone = '0190000002') {
  routes['POST /api/auth/otp/request'] = () => json({ account: true, demoPhone: true });
  await askCode(user, phone);
  return screen.findByLabelText('Code à 6 chiffres');
}

describe('demande de code', () => {
  it('n’envoie rien tant que le numéro n’a pas 8 chiffres', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const btn = screen.getByRole('button', { name: 'Recevoir un code par SMS' });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText('Votre numéro de téléphone'), '01 90 00');
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText('Votre numéro de téléphone'), ' 00 02');
    expect(btn).toBeEnabled();
  });

  it('passe à la saisie du code et renvoie vers le simulateur pour ce numéro', async () => {
    let sent: Record<string, unknown> | null = null;
    routes['POST /api/auth/otp/request'] = (init) => {
      sent = body(init);
      return json({ account: true, demoPhone: true });
    };
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user);
    expect(await screen.findByLabelText('Code à 6 chiffres')).toBeInTheDocument();
    expect(sent).toEqual({ phone: '0190000002' });
    expect(screen.getByText(/Code envoyé au/)).toHaveTextContent('0190000002');
    expect(screen.getByRole('link', { name: 'simulateur de téléphone' })).toHaveAttribute('href', '/simulateur?tel=0190000002');
    expect(screen.queryByText(/visible que depuis le navigateur/)).not.toBeInTheDocument();
  });

  it('annonce le refus de l’API tel quel (alerte) et laisse réessayer', async () => {
    routes['POST /api/auth/otp/request'] = () => json({ message: 'Trop de demandes. Réessayez dans une minute.' }, 429);
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Trop de demandes. Réessayez dans une minute.');
    expect(screen.getByRole('button', { name: 'Recevoir un code par SMS' })).toBeEnabled();
  });

  it('sans réseau, donne un message simple qui ne révèle rien de technique', async () => {
    routes['POST /api/auth/otp/request'] = () => {
      throw new TypeError('Failed to fetch');
    };
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Connexion impossible. Vérifiez votre réseau.');
    expect(alert).not.toHaveTextContent('Failed to fetch');
  });

  it('bascule sur la création du carnet quand le numéro n’a pas de compte', async () => {
    routes['POST /api/auth/otp/request'] = () => json({ account: false });
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user, '0197000009');
    expect(await screen.findByRole('status')).toHaveTextContent('Aucun carnet avec ce numéro');
    expect(screen.getByLabelText('NPI (10 chiffres)')).toBeInTheDocument();
    expect(screen.getByLabelText('Téléphone')).toHaveValue('0197000009');
  });
});

describe('indice sur la visibilité du code (démo)', () => {
  it('prévient quand le carnet a été créé dans un autre navigateur', async () => {
    routes['POST /api/auth/otp/request'] = () => json({ account: true, simulator: true, demoPhone: false });
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user, '0197000001');
    expect(await screen.findByText(/n’est visible que depuis le navigateur qui l’a créé/)).toBeInTheDocument();
  });

  it('ne prévient pas quand ce navigateur détient la clé du simulateur pour ce numéro', async () => {
    localStorage.setItem('ganji-sim:0197000001', 'cle-locale');
    routes['POST /api/auth/otp/request'] = () => json({ account: true, simulator: true, demoPhone: false });
    const user = userEvent.setup();
    render(<LoginForm />);
    await askCode(user, '01 97 00 00 01');
    await screen.findByLabelText('Code à 6 chiffres');
    expect(screen.queryByText(/n’est visible que depuis le navigateur/)).not.toBeInTheDocument();
  });
});

describe('vérification du code', () => {
  it('exige 6 chiffres et ignore tout autre caractère', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    const input = await toCodeStep(user);
    const btn = screen.getByRole('button', { name: 'Me connecter' });
    await user.type(input, '12a34');
    expect(input).toHaveValue('1234');
    expect(btn).toBeDisabled();
    await user.type(input, '56');
    expect(btn).toBeEnabled();
  });

  it('ouvre l’espace du rôle (soignant → /pro) et rafraîchit la session', async () => {
    let sent: Record<string, unknown> | null = null;
    routes['POST /api/auth/otp/verify'] = (init) => {
      sent = body(init);
      return json(ME);
    };
    const user = userEvent.setup();
    render(<LoginForm suite="/app/partage" />);
    await user.type(await toCodeStep(user), '123456');
    await user.click(screen.getByRole('button', { name: 'Me connecter' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/pro'));
    expect(sent).toEqual({ phone: '0190000002', code: '123456' });
    expect(router.refresh).toHaveBeenCalled();
  });

  it('respecte la page demandée si elle est dans l’espace du rôle', async () => {
    routes['POST /api/auth/otp/verify'] = () => json({ ...ME, role: 'PATIENT', patientId: 'p1', profileDone: true });
    const user = userEvent.setup();
    render(<LoginForm suite="/app/partage" />);
    await user.type(await toCodeStep(user), '123456');
    await user.click(screen.getByRole('button', { name: 'Me connecter' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app/partage'));
  });

  it('envoie un carnet encore vide vers l’accueil en cinq questions, puis vers la page visée', async () => {
    routes['POST /api/auth/otp/verify'] = () => json({ ...ME, role: 'PATIENT', patientId: 'p1', profileDone: false });
    const user = userEvent.setup();
    render(<LoginForm suite="/app/partage" />);
    await user.type(await toCodeStep(user), '123456');
    await user.click(screen.getByRole('button', { name: 'Me connecter' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app/bienvenue?suite=%2Fapp%2Fpartage'));
  });

  it('refuse un mauvais code avec le message de l’API et laisse recommencer', async () => {
    routes['POST /api/auth/otp/verify'] = () => json({ message: 'Code incorrect ou expiré.' }, 401);
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(await toCodeStep(user), '000000');
    await user.click(screen.getByRole('button', { name: 'Me connecter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Code incorrect ou expiré.');
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Me connecter' })).toBeEnabled();
  });

  it('permet de changer de numéro sans perdre celui déjà saisi', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await toCodeStep(user);
    await user.click(screen.getByRole('button', { name: 'Changer de numéro' }));
    expect(screen.getByLabelText('Votre numéro de téléphone')).toHaveValue('0190000002');
  });
});

describe('création du carnet', () => {
  it('garde la clé du simulateur remise à l’inscription, pour ce numéro, puis demande le code', async () => {
    let sent: Record<string, unknown> | null = null;
    routes['POST /api/auth/register'] = (init) => {
      sent = body(init);
      return json({ ok: true, simulatorKey: 'cle-neuve' });
    };
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole('button', { name: 'Créer mon carnet avec mon NPI' }));
    await user.type(screen.getByLabelText('NPI (10 chiffres)'), '1234567890');
    await user.type(screen.getByLabelText('Téléphone'), '0197000003');
    await user.type(screen.getByLabelText('Prénom'), 'Afi');
    await user.type(screen.getByLabelText('Nom'), 'Mensah');
    await user.type(screen.getByLabelText('Date de naissance'), '1990-05-12');
    await user.click(screen.getByRole('button', { name: 'Créer mon carnet' }));
    expect(await screen.findByLabelText('Code à 6 chiffres')).toBeInTheDocument();
    expect(sent).toMatchObject({ npi: '1234567890', firstName: 'Afi', lastName: 'Mensah', birthDate: '1990-05-12', sex: 'F', phone: '0197000003', lang: 'fr' });
    expect(localStorage.getItem('ganji-sim:0197000003')).toBe('cle-neuve');
    expect(screen.queryByText(/n’est visible que depuis le navigateur/)).not.toBeInTheDocument();
  });
});
