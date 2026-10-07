/** Client HTTP du navigateur : même origine, JSON, et des erreurs lisibles quoi que renvoie le relais. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});

describe('requêtes', () => {
  it('passe par /api, même origine, sans cache, avec le cookie de session', async () => {
    fetchMock.mockResolvedValue(json({ id: 'me' }));
    await expect(api('/me')).resolves.toEqual({ id: 'me' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/me');
    expect(init).toMatchObject({ credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
    expect(init?.body).toBeUndefined();
  });

  it('sérialise `json`, annonce le type de contenu et garde les en-têtes de l’appelant', async () => {
    fetchMock.mockResolvedValue(json({ ok: true }, 201));
    await api('/sms/inbound', { method: 'POST', json: { from: '0196000000', body: '1' }, headers: { 'x-ganji-simulator': 'cle' } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"from":"0196000000","body":"1"}');
    expect(init?.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json', 'x-ganji-simulator': 'cle' });
  });

  it('accepte une réponse sans corps (204)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api('/me/consents/1', { method: 'DELETE' })).resolves.toBeNull();
  });
});

describe('erreurs', () => {
  it('transmet le message et le code de l’API avec le statut', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Trop de demandes. Réessayez dans une minute.', code: 'RATE_LIMITED' }, 429));
    const err = await api('/auth/otp/request', { method: 'POST', json: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 429, message: 'Trop de demandes. Réessayez dans une minute.', code: 'RATE_LIMITED' });
  });

  it('assemble les messages de validation multiples en une phrase', async () => {
    fetchMock.mockResolvedValue(json({ message: ['phone must be a string', 'code must be 6 digits'] }, 400));
    await expect(api('/x')).rejects.toThrow('phone must be a string · code must be 6 digits');
  });

  it('donne un message générique quand l’API n’en fournit pas', async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    await expect(api('/x')).rejects.toThrow('Une erreur est survenue. Réessayez.');
  });

  it('reste lisible devant une page d’erreur HTML du relais (délai dépassé, passerelle)', async () => {
    fetchMock.mockResolvedValue(new Response('<html>504 Gateway Time-out</html>', { status: 504 }));
    const err = await api('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 504, message: 'Le service ne répond pas. Réessayez dans un instant.' });
  });

  it('signale une réponse 200 illisible plutôt qu’une SyntaxError brute', async () => {
    fetchMock.mockResolvedValue(new Response('pas du json', { status: 200 }));
    await expect(api('/x')).rejects.toThrow('Réponse illisible du serveur. Réessayez.');
  });

  it('laisse passer une panne de réseau (TypeError) telle quelle, pour la file hors ligne', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/x')).rejects.toBeInstanceOf(TypeError);
  });
});
