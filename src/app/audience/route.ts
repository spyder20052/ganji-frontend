import { Redis } from '@upstash/redis';
import { cleanPath, DEVICE_NAME, isId, localeOf, sourceOf } from '@/lib/audience';

/**
 * Réception des pages vues (components/Audience.tsx). Compteurs agrégés par jour (temps universel) dans la
 * base Redis Upstash reliée au projet Vercel, toutes les clés commençant par « ganji: » :
 *
 *   ganji:days                 jours ayant au moins une page vue
 *   ganji:views:<jour>         pages vues
 *   ganji:visits:<jour>        visites (sessions de navigateur commencées ce jour)
 *   ganji:uniq:<jour>          HyperLogLog des navigateurs (visiteurs uniques, combinable sur une période)
 *   ganji:page:<jour>          hash chemin -> pages vues
 *   ganji:entry:<jour>         hash page d'arrivée -> visites
 *   ganji:dev:<jour>           hash appareil -> visites
 *   ganji:src:<jour>           hash provenance -> visites
 *   ganji:lang:<jour>          hash langue de l'interface -> visites
 *   ganji:sessions:<jour>      liste des sessions commencées ce jour (les 5 000 dernières)
 *   ganji:session:<session>    hash { start, last, day, dev, src, lang }
 *   ganji:steps:<session>      liste « horodatage|chemin » : le parcours, page après page (300 au plus)
 *
 * Agrégats gardés 13 mois, parcours détaillés 90 jours. Aucune adresse IP, aucun cookie : la mesure
 * d'audience reste anonyme (SECURITY.md). Sans base reliée (développement, fourche du projet), la route
 * répond 204 et ne fait rien.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const P = 'ganji:';
const KEEP_AGGREGATES = 400 * 86_400; // 13 mois
const KEEP_JOURNEYS = 90 * 86_400;
const MAX_SESSIONS_PER_DAY = 5_000;
const MAX_STEPS = 300;

let store: Redis | null | undefined;
function redis(): Redis | null {
  if (store === undefined) store = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? Redis.fromEnv() : null;
  return store;
}

export async function POST(request: Request) {
  const db = redis();
  if (!db) return new Response(null, { status: 204 });

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!isId(body.v) || !isId(body.s)) return new Response(null, { status: 400 });

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const at = Math.floor(now.getTime() / 1000);
  const session = `${P}session:${body.s}`;
  const page = cleanPath(typeof body.p === 'string' ? body.p : '/');

  try {
    // Première page de la session : on la compte comme une visite, avec son contexte d'arrivée.
    const entering = (await db.hsetnx(session, 'start', at)) === 1;
    const p = db.pipeline();
    if (entering) {
      const device = DEVICE_NAME[body.d as keyof typeof DEVICE_NAME] ?? 'ordinateur';
      const source = sourceOf(body.r);
      const lang = localeOf(body.l);
      p.incr(`${P}visits:${day}`).expire(`${P}visits:${day}`, KEEP_AGGREGATES);
      p.hincrby(`${P}entry:${day}`, page, 1).expire(`${P}entry:${day}`, KEEP_AGGREGATES);
      p.hincrby(`${P}dev:${day}`, device, 1).expire(`${P}dev:${day}`, KEEP_AGGREGATES);
      p.hincrby(`${P}src:${day}`, source, 1).expire(`${P}src:${day}`, KEEP_AGGREGATES);
      p.hincrby(`${P}lang:${day}`, lang, 1).expire(`${P}lang:${day}`, KEEP_AGGREGATES);
      p.rpush(`${P}sessions:${day}`, body.s).ltrim(`${P}sessions:${day}`, -MAX_SESSIONS_PER_DAY, -1).expire(`${P}sessions:${day}`, KEEP_JOURNEYS);
      p.hset(session, { day, dev: device, src: source, lang });
      p.expire(session, KEEP_JOURNEYS);
      p.setnx(`${P}first_visit`, now.toISOString());
    }
    p.incr(`${P}views:${day}`).expire(`${P}views:${day}`, KEEP_AGGREGATES);
    p.pfadd(`${P}uniq:${day}`, body.v).expire(`${P}uniq:${day}`, KEEP_AGGREGATES);
    p.hincrby(`${P}page:${day}`, page, 1).expire(`${P}page:${day}`, KEEP_AGGREGATES);
    p.sadd(`${P}days`, day);
    p.hset(session, { last: at });
    p.rpush(`${P}steps:${body.s}`, `${at}|${page}`).ltrim(`${P}steps:${body.s}`, -MAX_STEPS, -1);
    if (entering) p.expire(`${P}steps:${body.s}`, KEEP_JOURNEYS);
    await p.exec();
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Mesure d’audience : enregistrement impossible', error);
    return new Response(null, { status: 502 });
  }
}
