'use client';
/**
 * Stockage local chiffré (AES-GCM 256, WebCrypto). La clé est dérivée du PIN
 * (PBKDF2-SHA256, 310 000 itérations) et n'est jamais stockée.
 */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function keyFrom(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310_000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export async function sealLocal(name: string, pin: string, data: unknown) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFrom(pin, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
  localStorage.setItem(`ganji-sealed-${name}`, JSON.stringify({ v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct), at: new Date().toISOString() }));
}

export async function openLocal<T>(name: string, pin: string): Promise<{ data: T; at: string } | null> {
  const raw = localStorage.getItem(`ganji-sealed-${name}`);
  if (!raw) return null;
  const box = JSON.parse(raw);
  const key = await keyFrom(pin, unb64(box.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)); // lève une erreur si PIN faux
  return { data: JSON.parse(dec.decode(pt)) as T, at: box.at };
}

export function hasSealed(name: string) {
  try { return !!localStorage.getItem(`ganji-sealed-${name}`); } catch { return false; }
}
export function wipeLocal() {
  Object.keys(localStorage).filter((k) => k.startsWith('ganji-sealed-')).forEach((k) => localStorage.removeItem(k));
}
