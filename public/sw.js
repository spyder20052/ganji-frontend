/* Alafia : service worker. Coque de l'application et pages vitales disponibles hors ligne. */
const VERSION = 'alafia-v1';
const SHELL = ['/', '/offline', '/orientation', '/urgence', '/app', '/app/carte-urgence', '/relais', '/manifest.webmanifest', '/icon.svg'];
const API_CACHE = ['/api/me/summary', '/api/care/plan', '/api/triage/tree', '/api/auth/me', '/api/geo/departments'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers statiques versionnés : cache d'abord.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/audio/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  // Quelques lectures d'API utiles hors ligne : réseau d'abord, cache en secours.
  if (API_CACHE.includes(url.pathname)) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req)));
    return;
  }
  if (url.pathname.startsWith('/api/')) return;

  // Pages : réseau d'abord, puis cache, puis page hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/offline'))),
    );
  }
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'alafia-sync') {
    e.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'alafia-sync' }))));
  }
});
