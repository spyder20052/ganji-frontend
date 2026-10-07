'use client';
/**
 * File d'attente hors ligne : les saisies faites sans réseau sont gardées sur le téléphone puis envoyées
 * au retour du réseau. Règle : on ajoute, on n'écrase jamais (journal d'événements).
 *
 * Ce qui peut attendre : un symptôme, un signalement communautaire (quelques octets, sans pièce jointe).
 * Un document médical ne va jamais dans cette file (`queueable: false`) : trop lourd pour le stockage du
 * navigateur, et une photo de bilan n'a rien à faire en clair sur un téléphone partagé. Les refus de l'API
 * au retour du réseau (400, 403…) sont gardés à part et montrés, jamais jetés en silence.
 */
import { api, ApiError } from './api';

export interface QueuedAction { id: string; path: string; method: 'POST' | 'PUT'; body: unknown; createdAt: string; label: string }
export interface FailedAction extends QueuedAction { error: string; failedAt: string }

const KEY = 'ganji-queue';
const FAILED_KEY = 'ganji-queue-failed';
const MAX_FAILED = 20;

/** Pas de réseau et saisie qui ne peut pas attendre sur le téléphone. */
export class OfflineError extends Error {
  constructor() {
    super('Pas de réseau. Cette action demande une connexion : réessayez dès que le réseau revient.');
    this.name = 'OfflineError';
  }
}

function readList<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
/** Écriture : renvoie faux si le stockage refuse (quota atteint, navigation privée stricte). */
function writeList(key: string, list: unknown[]): boolean {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { return false; }
  window.dispatchEvent(new Event('ganji-queue'));
  return true;
}

export const readQueue = () => readList<QueuedAction>(KEY);
export const readFailed = () => readList<FailedAction>(FAILED_KEY);

/** Déconnexion, téléphone partagé : plus rien à envoyer ni à montrer. */
export function clearQueue() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(FAILED_KEY); } catch {}
  window.dispatchEvent(new Event('ganji-queue'));
}
export function dismissFailed(id?: string) {
  writeList(FAILED_KEY, id ? readFailed().filter((x) => x.id !== id) : []);
}

/** Met en file ; faux si le téléphone n'a pas pu la garder (l'appelant le dit à la personne). */
export function enqueue(a: Omit<QueuedAction, 'id' | 'createdAt'>): boolean {
  const ok = writeList(KEY, [...readQueue(), { ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  if (ok) navigator.serviceWorker?.ready.then((r) => (r as ServiceWorkerRegistration & { sync?: { register(t: string): Promise<void> } }).sync?.register('ganji-sync')).catch(() => undefined);
  return ok;
}

let flushing = false;
/** Envoie la file dans l'ordre ; s'arrête au premier échec de réseau, met de côté ce que l'API refuse. */
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const a of readQueue()) {
      try {
        await api(a.path, { method: a.method, json: a.body });
        writeList(KEY, readQueue().filter((x) => x.id !== a.id));
        sent++;
      } catch (e) {
        if (e instanceof ApiError && e.status < 500) {
          // Refusée pour de bon (saisie invalide, droit retiré) : hors de la file, mais gardée pour être montrée.
          writeList(KEY, readQueue().filter((x) => x.id !== a.id));
          writeList(FAILED_KEY, [...readFailed(), { ...a, error: e.message, failedAt: new Date().toISOString() }].slice(-MAX_FAILED));
        } else break;
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/**
 * Envoie tout de suite si le réseau est là, sinon met en file (`queueable`, vrai par défaut) ou refuse
 * clairement (OfflineError) pour ce qui ne peut pas attendre sur le téléphone.
 */
export async function sendOrQueue<T>(a: Omit<QueuedAction, 'id' | 'createdAt'>, opts: { queueable?: boolean } = {}): Promise<{ queued: boolean; result?: T }> {
  const queueable = opts.queueable ?? true;
  const keep = () => {
    if (!queueable) throw new OfflineError();
    if (!enqueue(a)) throw new Error('Pas de réseau, et le téléphone n’a pas pu garder cette saisie (mémoire pleine). Réessayez avec du réseau.');
    return { queued: true as const };
  };
  if (!navigator.onLine) return keep();
  try {
    return { queued: false, result: await api<T>(a.path, { method: a.method, json: a.body }) };
  } catch (e) {
    if (e instanceof TypeError) return keep();
    throw e;
  }
}
