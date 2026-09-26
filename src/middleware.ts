import { NextResponse, type NextRequest } from 'next/server';

/** Espaces connectés : redirection vers /connexion sans cookie de session (le contrôle réel est fait par l'API). */
const PROTECTED = ['/app', '/pro', '/pharmacie', '/ants', '/ministere', '/relais'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/app/carte-urgence')) return NextResponse.next(); // doit rester visible hors session (écran verrouillé)
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !req.cookies.get('ganji_session')) {
    const url = req.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    // Après la connexion, on revient là où l'on allait (ex. commander depuis la recherche publique).
    url.searchParams.set('suite', `${pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*', '/pro/:path*', '/pharmacie/:path*', '/ants/:path*', '/ministere/:path*', '/relais/:path*'] };
