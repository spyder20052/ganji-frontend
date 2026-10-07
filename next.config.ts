import type { NextConfig } from 'next';

const backend = process.env.BACKEND_URL ?? 'http://localhost:4000';

// La politique de sécurité du contenu (CSP) est posée par le middleware, avec un nonce par requête
// (src/middleware.ts) ; ici, les en-têtes qui ne varient pas.

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    // Même origine pour l'API : cookies de session first-party, aucun CORS à ouvrir.
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
  async headers() {
    return [
      // Illustrations préparées d'avance (scripts/illustrations.mjs) : gardées une semaine, puis revalidées en arrière-plan.
      { source: '/illustrations/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }] },
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=()' },
        ],
      },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
