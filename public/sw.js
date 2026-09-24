/* Alafia : service worker. Coque de l'application et pages vitales disponibles hors ligne. */
const VERSION = 'alafia-v3';
const SHELL = ['/', '/offline', '/orientation', '/urgence', '/app', '/app/carte-urgence', '/app/hors-ligne', '/relais', '/manifest.webmanifest', '/icon.svg'];
// Seules ces pages sont gardées pour le hors ligne. Jamais un dossier consulté par un soignant
// (/pro/…), ni le carnet complet : il a sa copie chiffrée par PIN (lib/secure-store.ts).
const OFFLINE_PAGES = new Set(['/', '/offline', '/orientation', '/urgence', '/carte', '/medicaments', '/alertes', '/app', '/app/carte-urgence', '/app/hors-ligne', '/relais']);
// Lectures d'API sans donnée de santé nominative, utiles hors ligne.
const API_CACHE = ['/api/triage/tree', '/api/geo/departments'];

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
    const keep = OFFLINE_PAGES.has(url.pathname);
    e.respondWith(
      fetch(req)
        .then((res) => { if (keep && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(url.pathname, copy)); } return res; })
        .catch(() => caches.match(keep ? url.pathname : '/offline').then((hit) => hit || caches.match('/offline'))),
    );
  }
});

// Déconnexion : on oublie toutes les pages gardées (téléphone partagé).
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'alafia-logout') {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
  }
});

self.addEventListener('sync', (e) => {
  if (e.tag === 'alafia-sync') {
    e.waitUntil(self.clients.matchAll().then((cs) => cs.forEach((c) => c.postMessage({ type: 'alafia-sync' }))));
  }
});
