import { NextResponse, type NextRequest } from 'next/server';

/** Espaces connectés : redirection vers /connexion sans cookie de session (le contrôle réel est fait par l'API). */
const PROTECTED = ['/app', '/pro', '/pharmacie', '/ants', '/ministere', '/relais'];

/**
 * Politique de sécurité du contenu, avec un nonce par requête : seuls les scripts portant ce nonce (et ceux
 * qu'ils chargent, 'strict-dynamic') s'exécutent. Aucune ressource tierce hormis les tuiles OpenStreetMap.
 * `'unsafe-inline'` et `'self'` ne servent qu'aux navigateurs qui ignorent les nonces.
 */
function contentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'self' https:${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsSession = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  // Visibles sans session : la carte d'urgence (écran verrouillé) et le carnet hors ligne par PIN (sans réseau).
  const openAnyway = pathname.startsWith('/app/carte-urgence') || pathname === '/app/hors-ligne';
  if (needsSession && !openAnyway && !req.cookies.get('ganji_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    // Après la connexion, on revient là où l'on allait (ex. commander depuis la recherche publique).
    url.searchParams.set('suite', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  // 128 bits d'aléa, en base64 (22 caractères utiles) : présent sur chaque script de la page, inutile de l'allonger.
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const csp = contentSecurityPolicy(nonce);
  // Next.js lit le nonce dans l'en-tête CSP de la requête pour ses propres scripts ; x-nonce sert aux nôtres.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  // Toutes les pages ; pas les fichiers statiques ni l'API (réécrite vers le serveur NestJS, qui a ses en-têtes).
  matcher: ['/((?!api/|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icon.*|apple-icon\\.png|audio/|illustrations/|favicon\\.ico).*)'],
};
