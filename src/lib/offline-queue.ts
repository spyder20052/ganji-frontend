'use client';
/**
 * File d'attente hors ligne : les saisies faites sans réseau sont gardées sur le téléphone
 * puis envoyées au retour du réseau. Règle : on ajoute, on n'écrase jamais (journal d'événements).
 */
import { api } from './api';

export interface QueuedAction { id: string; path: string; method: 'POST' | 'PUT'; body: unknown; createdAt: string; label: string }
const KEY = 'ganji-queue';

export function readQueue(): QueuedAction[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(q: QueuedAction[]) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch {}
  window.dispatchEvent(new Event('ganji-queue'));
}

export function enqueue(a: Omit<QueuedAction, 'id' | 'createdAt'>) {
  const q = readQueue();
  q.push({ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  write(q);
  navigator.serviceWorker?.ready.then((r) => (r as ServiceWorkerRegistration & { sync?: { register(t: string): Promise<void> } }).sync?.register('ganji-sync')).catch(() => undefined);
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const a of readQueue()) {
      try {
        await api(a.path, { method: a.method, json: a.body });
        write(readQueue().filter((x) => x.id !== a.id));
        sent++;
      } catch (e) {
        if ((e as { status?: number }).status && (e as { status: number }).status < 500) write(readQueue().filter((x) => x.id !== a.id));
        else break;
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/** Envoie tout de suite si le réseau est là, sinon met en file. */
export async function sendOrQueue<T>(a: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<{ queued: boolean; result?: T }> {
  if (!navigator.onLine) {
    enqueue(a);
    return { queued: true };
  }
  try {
    return { queued: false, result: await api<T>(a.path, { method: a.method, json: a.body }) };
  } catch (e) {
    if (e instanceof TypeError) { enqueue(a); return { queued: true }; }
    throw e;
  }
}
