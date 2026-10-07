#!/usr/bin/env node
/* Audience de Ganji (ganji-sante.vercel.app), lisible uniquement en local.
 *
 *   npm run audience                        tableau de bord sur http://127.0.0.1:4192 (pages, parcours, appareils…)
 *   npm run audience -- --texte             résumé des 30 derniers jours dans le terminal
 *   npm run audience -- --texte --jours 7
 *   npm run audience -- --texte --du 2026-10-01 --au 2026-10-31
 *   npm run audience -- --demo              tableau de bord sur des données d'exemple (sans accès à la base)
 *
 * Les compteurs sont écrits par src/app/audience/route.ts dans la base Redis Upstash reliée au projet Vercel
 * (clés « ganji:* »). Cet outil ne fait que lire, avec les accès de .env.audience (ignoré par git) ; s'il manque,
 * il le crée avec « vercel env pull ». Le dossier tools/ n'est jamais déployé (.vercelignore). */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { exec, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env.audience');
const FONT = path.join(ROOT, 'src/fonts/bricolage-titres.woff2');
const P = 'ganji:';
const PORT = 4192;
const SESSIONS_MAX = 400;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

function loadEnv() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) return;
  if (!fs.existsSync(ENV_FILE)) {
    console.log('Récupération des accès avec « vercel env pull .env.audience »…');
    execSync('npx --yes vercel@latest env pull .env.audience --environment=production --yes', { cwd: ROOT, stdio: 'ignore' });
  }
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error('KV_REST_API_URL et KV_REST_API_TOKEN manquent dans .env.audience (variables du projet Vercel ganji-sante).');
  }
}

/* ---------- Lecture ---------- */
const source = flag('--demo') ? demoSource() : redisSource();

function redisSource() {
  loadEnv();
  /* Jeton complet : le jeton en lecture seule d'Upstash refuse PFCOUNT (visiteurs uniques). L'outil n'écrit jamais. */
  const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
  const num = (v) => Number(v || 0);
  const hash = (v) => Object.fromEntries(Object.entries(v || {}).map(([k, n]) => [k, Number(n)]));
  return {
    label: 'Base Redis Upstash, clés ganji:*',
    /* Toutes les journées : { day, views, visits, uniq, page, entry, dev, src, lang } (jours en temps universel). */
    async days() {
      const days = ((await redis.smembers(`${P}days`)) || []).sort();
      if (!days.length) return { days: [], firstVisit: null };
      const p = redis.pipeline();
      for (const d of days) {
        p.get(`${P}views:${d}`); p.get(`${P}visits:${d}`); p.pfcount(`${P}uniq:${d}`);
        p.hgetall(`${P}page:${d}`); p.hgetall(`${P}entry:${d}`); p.hgetall(`${P}dev:${d}`); p.hgetall(`${P}src:${d}`); p.hgetall(`${P}lang:${d}`);
      }
      p.get(`${P}first_visit`);
      const r = await p.exec();
      const W = 8;
      const out = days.map((day, i) => ({
        day, views: num(r[i * W]), visits: num(r[i * W + 1]), uniq: num(r[i * W + 2]),
        page: hash(r[i * W + 3]), entry: hash(r[i * W + 4]), dev: hash(r[i * W + 5]), src: hash(r[i * W + 6]), lang: hash(r[i * W + 7]),
      }));
      return { days: out, firstVisit: r[days.length * W] || null };
    },
    /* Visiteurs uniques sur une plage : union des HyperLogLog. */
    async unique(from, to) {
      const days = ((await redis.smembers(`${P}days`)) || []).filter((d) => d >= from && d <= to);
      return days.length ? Number(await redis.pfcount(...days.map((d) => `${P}uniq:${d}`))) : 0;
    },
    /* Parcours : les dernières sessions commencées sur la plage, de la plus récente à la plus ancienne. */
    async sessions(from, to, limit = SESSIONS_MAX) {
      const days = ((await redis.smembers(`${P}days`)) || []).filter((d) => d >= from && d <= to).sort().reverse();
      const ids = [];
      for (const d of days) {
        if (ids.length >= limit) break;
        const list = (await redis.lrange(`${P}sessions:${d}`, 0, -1)) || [];
        ids.push(...list.reverse().slice(0, limit - ids.length));
      }
      if (!ids.length) return [];
      const p = redis.pipeline();
      for (const id of ids) { p.hgetall(`${P}session:${id}`); p.lrange(`${P}steps:${id}`, 0, -1); }
      const r = await p.exec();
      return ids.map((id, i) => toSession(id, r[i * 2], r[i * 2 + 1])).filter(Boolean);
    },
  };
}

function toSession(id, meta, rawSteps) {
  if (!meta || !rawSteps?.length) return null;
  const steps = rawSteps.map((s) => { const [at, page] = String(s).split('|'); return { at: Number(at) * 1000, page: page || '/' }; });
  return {
    id, day: meta.day, dev: meta.dev || 'ordinateur', src: meta.src || 'direct', lang: meta.lang || 'fr',
    start: Number(meta.start) * 1000, last: Number(meta.last || meta.start) * 1000, steps,
  };
}

/* Données d'exemple, pour voir le tableau de bord sans base (et pour les captures). Déterministes. */
function demoSource() {
  let seed = 7;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const PAGES = ['/', '/demo', '/orientation', '/urgence', '/medicaments', '/carte', '/connexion', '/simulateur', '/app', '/app/carnet', '/app/partage', '/pro', '/pro/patients/:id', '/pro/sang/:id', '/pharmacie', '/ants', '/ministere', '/chantier', '/alertes', '/app/carte-urgence'];
  const SRC = ['direct', 'direct', 'direct', 'github.com', 'linkedin.com', 'mail.google.com', 'gouv.bj'];
  const DEV = ['ordinateur', 'ordinateur', 'mobile', 'tablette'];
  const LANG = ['fr', 'fr', 'fr', 'en', 'fon'];
  const days = []; const sessions = [];
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    const n = i === 0 ? 6 : Math.floor(2 + rnd() * 12);
    const row = { day, views: 0, visits: n, uniq: Math.max(1, Math.round(n * (0.6 + rnd() * 0.4))), page: {}, entry: {}, dev: {}, src: {}, lang: {} };
    for (let k = 0; k < n; k++) {
      const start = d.getTime() + Math.floor((8 + rnd() * 13) * 3600_000);
      const entry = pick(['/', '/', '/', '/demo', '/orientation', '/chantier']);
      const steps = [{ at: start, page: entry }];
      let t = start; let cur = entry;
      const len = 1 + Math.floor(rnd() * rnd() * 9);
      for (let j = 1; j < len; j++) { t += Math.floor((5 + rnd() * 110) * 1000); cur = pick(PAGES); steps.push({ at: t, page: cur }); }
      const dev = pick(DEV), src = pick(SRC), lang = pick(LANG);
      for (const s of steps) { row.views++; row.page[s.page] = (row.page[s.page] || 0) + 1; }
      row.entry[entry] = (row.entry[entry] || 0) + 1; row.dev[dev] = (row.dev[dev] || 0) + 1; row.src[src] = (row.src[src] || 0) + 1; row.lang[lang] = (row.lang[lang] || 0) + 1;
      sessions.push({ id: `demo${day.replace(/-/g, '')}${k}`, day, dev, src, lang, start, last: t, steps });
    }
    days.push(row);
  }
  sessions.sort((a, b) => b.start - a.start);
  return {
    label: 'Données d’exemple (option --demo), aucune lecture de la base',
    async days() { return { days, firstVisit: new Date(days[0].day + 'T09:12:00Z').toISOString() }; },
    async unique(from, to) { return days.filter((d) => d.day >= from && d.day <= to).reduce((s, d) => s + d.uniq, 0); },
    async sessions(from, to, limit = SESSIONS_MAX) { return sessions.filter((s) => s.day >= from && s.day <= to).slice(0, limit); },
  };
}

/* ---------- Résumé texte ---------- */
const isoDaysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const fmtDay = (k) => new Date(k + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' });
const merge = (list, key) => Object.entries(list.reduce((m, d) => { for (const [k, v] of Object.entries(d[key])) m[k] = (m[k] || 0) + Number(v); return m; }, {})).sort((a, b) => b[1] - a[1]);
const gap = (ms) => (ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.round(ms / 60_000)} min`);

async function textMode() {
  const to = value('--au') || isoDaysAgo(0);
  const from = value('--du') || isoDaysAgo(Number(value('--jours') || 30) - 1);
  const { days, firstVisit } = await source.days();
  const sel = days.filter((d) => d.day >= from && d.day <= to);
  const views = sel.reduce((s, d) => s + d.views, 0);
  const visits = sel.reduce((s, d) => s + d.visits, 0);
  const unique = await source.unique(from, to);
  console.log(`\nGanji : audience du ${fmtDay(from)} au ${fmtDay(to)} (jours en temps universel)\n`);
  console.log(`  Pages vues           ${views}`);
  console.log(`  Visites              ${visits}`);
  console.log(`  Visiteurs uniques    ${unique}`);
  console.log(`  Pages par visite     ${visits ? (views / visits).toFixed(1) : '0'}`);
  if (firstVisit) console.log(`  Première visite      ${new Date(firstVisit).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' })}`);
  if (!views) { console.log('\n  Aucune visite sur cette période.\n'); return; }
  const max = Math.max(...sel.map((d) => d.views));
  console.log('\n  Par jour             pages  visites  uniques');
  for (const d of sel) console.log(`    ${fmtDay(d.day).padEnd(16)} ${String(d.views).padStart(4)}   ${String(d.visits).padStart(4)}    ${String(d.uniq).padStart(4)}  ${'█'.repeat(Math.max(1, Math.round((d.views / max) * 24)))}`);
  const block = (title, rows, n = 10) => { console.log(`\n  ${title}`); for (const [k, v] of rows.slice(0, n)) console.log(`    ${k.padEnd(30)} ${String(v).padStart(5)}`); };
  block('Pages les plus vues', merge(sel, 'page'), 15);
  block('Pages d’arrivée', merge(sel, 'entry'));
  block('Appareils', merge(sel, 'dev'));
  block('Provenance', merge(sel, 'src'));
  block('Langue de l’interface', merge(sel, 'lang'));
  const sessions = await source.sessions(from, to, 20);
  console.log(`\n  Derniers parcours (${sessions.length} sur ${visits})`);
  for (const s of sessions) {
    const chain = s.steps.map((st, i) => (i ? ` →${gap(st.at - s.steps[i - 1].at)}→ ` : '') + st.page).join('');
    console.log(`    ${fmtDay(s.day)} ${fmtTime(s.start)} · ${s.dev} · ${s.src} · ${s.lang}\n      ${chain}`);
  }
  console.log('');
}

/* ---------- Tableau de bord local ---------- */
function serve() {
  const PAGE = fs.readFileSync(path.join(ROOT, 'tools', 'audience.html'), 'utf8').replace('__SOURCE__', source.label);
  const json = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (url.pathname === '/data') return json(res, 200, { ...(await source.days()), readAt: new Date().toISOString() });
      if (url.pathname === '/unique') return json(res, 200, { unique: await source.unique(url.searchParams.get('from'), url.searchParams.get('to')) });
      if (url.pathname === '/sessions') return json(res, 200, { sessions: await source.sessions(url.searchParams.get('from'), url.searchParams.get('to'), Math.min(SESSIONS_MAX, Number(url.searchParams.get('limit')) || 200)) });
      if (url.pathname === '/fonts/titres.woff2' && fs.existsSync(FONT)) { res.writeHead(200, { 'content-type': 'font/woff2', 'cache-control': 'max-age=86400' }); return res.end(fs.readFileSync(FONT)); }
    } catch (e) { return json(res, 502, { error: String(e.message || e) }); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') { console.log(`Le tableau de bord tourne déjà : http://127.0.0.1:${PORT}/`); if (!flag('--sans-ouvrir')) exec(`open http://127.0.0.1:${PORT}/`); process.exit(0); }
    throw e;
  });
  server.listen(PORT, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${PORT}/`;
    console.log(`Tableau de bord : ${url}  (Ctrl+C pour arrêter) · ${source.label}`);
    if (!flag('--sans-ouvrir')) exec(`open ${url}`);
  });
}

if (flag('--texte')) textMode().catch((e) => { console.error('Lecture impossible :', e.message || e); process.exit(1); });
else serve();
