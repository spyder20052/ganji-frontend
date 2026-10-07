// @vitest-environment jsdom
/**
 * File d'attente hors ligne : une saisie faite sans réseau est gardée puis rejouée dans l'ordre ; un refus
 * de l'API est mis de côté et montré, jamais jeté en silence ; ce qui ne peut pas attendre est refusé clairement.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearQueue, dismissFailed, enqueue, flushQueue, OfflineError, readFailed, readQueue, sendOrQueue } from './offline-queue';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const symptom = (label: string) => ({ path: '/me/symptoms', method: 'POST' as const, body: { code: label }, label });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
let onLine = true;

beforeEach(() => {
  localStorage.clear();
  onLine = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.restoreAllMocks());

describe('mise en file', () => {
  it('garde la saisie avec un identifiant et une date, et prévient l’interface', () => {
    const heard = vi.fn();
    window.addEventListener('ganji-queue', heard);
    expect(enqueue(symptom('Fièvre'))).toBe(true);
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ path: '/me/symptoms', method: 'POST', body: { code: 'Fièvre' }, label: 'Fièvre' });
    expect(queue[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(queue[0].createdAt).getTime()).not.toBeNaN();
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener('ganji-queue', heard);
  });

  it('ajoute sans écraser : deux saisies restent dans l’ordre', () => {
    enqueue(symptom('Fièvre'));
    enqueue(symptom('Toux'));
    expect(readQueue().map((a) => a.label)).toEqual(['Fièvre', 'Toux']);
  });

  it('dit que le téléphone n’a pas pu garder la saisie quand le stockage refuse', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(enqueue(symptom('Fièvre'))).toBe(false);
  });

  it('repart d’une file vide si le stockage est corrompu', () => {
    localStorage.setItem('ganji-queue', '{pas du json');
    expect(readQueue()).toEqual([]);
  });
});

describe('rejeu au retour du réseau', () => {
  it('n’envoie rien sans réseau', async () => {
    enqueue(symptom('Fièvre'));
    onLine = false;
    expect(await flushQueue()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readQueue()).toHaveLength(1);
  });

  it('envoie la file dans l’ordre et la vide', async () => {
    enqueue(symptom('Fièvre'));
    enqueue(symptom('Toux'));
    fetchMock.mockImplementation(async () => json({ ok: true }));
    expect(await flushQueue()).toBe(2);
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ['/api/me/symptoms', 'POST', '{"code":"Fièvre"}'],
      ['/api/me/symptoms', 'POST', '{"code":"Toux"}'],
    ]);
    expect(readQueue()).toEqual([]);
  });

  it('s’arrête au premier échec de réseau et garde tout pour plus tard', async () => {
    enqueue(symptom('Fièvre'));
    enqueue(symptom('Toux'));
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockImplementation(async () => json({ ok: true }));
    expect(await flushQueue()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readQueue().map((a) => a.label)).toEqual(['Fièvre', 'Toux']);
  });

  it('met de côté ce que l’API refuse (400, 403) avec le motif, et continue avec la suite', async () => {
    enqueue(symptom('Fièvre'));
    enqueue(symptom('Toux'));
    fetchMock.mockResolvedValueOnce(json({ message: 'Droit retiré par le patient' }, 403)).mockImplementation(async () => json({ ok: true }));
    expect(await flushQueue()).toBe(1);
    expect(readQueue()).toEqual([]);
    const failed = readFailed();
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ label: 'Fièvre', error: 'Droit retiré par le patient' });
    expect(new Date(failed[0].failedAt).getTime()).not.toBeNaN();
  });

  it('considère une erreur serveur (500) comme passagère : la saisie reste en file', async () => {
    enqueue(symptom('Fièvre'));
    fetchMock.mockResolvedValue(json({ message: 'Internal' }, 500));
    expect(await flushQueue()).toBe(0);
    expect(readQueue()).toHaveLength(1);
    expect(readFailed()).toEqual([]);
  });

  it('ne garde que les vingt derniers refus', async () => {
    for (let i = 0; i < 22; i++) enqueue(symptom(`S${i}`));
    fetchMock.mockImplementation(async () => json({ message: 'Invalide' }, 400));
    await flushQueue();
    const failed = readFailed();
    expect(failed).toHaveLength(20);
    expect(failed[0].label).toBe('S2');
    expect(failed[19].label).toBe('S21');
  });
});

describe('purge', () => {
  it('retire un refus déjà montré, ou tous', async () => {
    enqueue(symptom('A'));
    enqueue(symptom('B'));
    fetchMock.mockImplementation(async () => json({ message: 'Invalide' }, 400));
    await flushQueue();
    const [first] = readFailed();
    dismissFailed(first.id);
    expect(readFailed().map((x) => x.label)).toEqual(['B']);
    dismissFailed();
    expect(readFailed()).toEqual([]);
  });

  it('efface tout à la déconnexion (téléphone partagé)', () => {
    enqueue(symptom('A'));
    localStorage.setItem('ganji-queue-failed', JSON.stringify([{ id: 'x', label: 'B' }]));
    clearQueue();
    expect(readQueue()).toEqual([]);
    expect(readFailed()).toEqual([]);
  });
});

describe('envoyer ou mettre en file', () => {
  it('envoie tout de suite quand le réseau est là', async () => {
    fetchMock.mockResolvedValue(json({ id: 's1' }));
    await expect(sendOrQueue(symptom('Fièvre'))).resolves.toEqual({ queued: false, result: { id: 's1' } });
    expect(readQueue()).toEqual([]);
  });

  it('met en file sans réseau, sans tenter l’envoi', async () => {
    onLine = false;
    await expect(sendOrQueue(symptom('Fièvre'))).resolves.toEqual({ queued: true });
    expect(readQueue()).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('met en file si le réseau tombe pendant l’envoi', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendOrQueue(symptom('Fièvre'))).resolves.toEqual({ queued: true });
    expect(readQueue()).toHaveLength(1);
  });

  it('refuse clairement, sans rien garder, ce qui ne peut pas attendre (document médical)', async () => {
    onLine = false;
    await expect(sendOrQueue({ path: '/me/documents', method: 'POST', body: {}, label: 'Bilan' }, { queueable: false })).rejects.toBeInstanceOf(OfflineError);
    expect(readQueue()).toEqual([]);
  });

  it('remonte un refus de l’API tel quel, sans le mettre en file', async () => {
    fetchMock.mockResolvedValue(json({ message: 'Saisie invalide' }, 400));
    await expect(sendOrQueue(symptom('Fièvre'))).rejects.toThrow('Saisie invalide');
    expect(readQueue()).toEqual([]);
  });

  it('explique quand ni le réseau ni le stockage ne sont disponibles', async () => {
    onLine = false;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await expect(sendOrQueue(symptom('Fièvre'))).rejects.toThrow(/mémoire pleine/);
  });
});
