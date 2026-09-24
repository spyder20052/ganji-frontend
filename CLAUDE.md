# CLAUDE.md · ganji-frontend

PWA Next.js 15 (App Router, React 19, Tailwind 4) de la plateforme e-Santé **Ganji** (test technique MTDI Bénin). L'API est dans `../ganji-backend`. Contexte complet et reprise du chantier : `../CLAUDE.md`.

## Commandes

```bash
npm install
cp .env.example .env.local        # BACKEND_URL=http://localhost:4000
npm run dev                       # http://localhost:3000 (l'API doit tourner)
npm run typecheck && npm run lint && npm test
npm run build && node scripts/check-budget.mjs
npm run test:e2e                  # Playwright (parcours héros, consentement, orientation, axe-core)
```

## Architecture

- Le navigateur appelle `/api/*`, réécrit vers l'API (`next.config.ts`) : cookies de session first-party, pas de CORS.
- Server Components par défaut avec `serverApi()` (`src/lib/server-api.ts`, relaie le cookie) ; composants client seulement pour l'interactif, avec `api()` (`src/lib/api.ts`).
- Espaces par rôle : `/app` (patient, aidant), `/pro` (soignant), `/pharmacie`, `/ants`, `/ministere`, `/relais` ; public : `/`, `/orientation`, `/urgence`, `/carte`, `/medicaments`, `/alertes`, `/simulateur`, `/demo`, `/chantier`.
- Design : jetons dans `src/app/globals.css` (`.card`, `.btn-*`, `.chip-round`…). Rouge réservé à l'urgence et au sang. Chaque écran patient : pictogramme + texte + `ListenButton`, cibles ≥ 48 px, texte ≥ 18 px.
- Hors ligne : `public/sw.js`, `src/lib/offline-queue.ts`, `src/lib/secure-store.ts` (PIN + AES-GCM).
- Suivi du chantier : `docs/progress.json` (rendu sur `/chantier`) ; plan : `docs/PLAN.md`.

## Règles

- Textes en français, simples et chaleureux. Accessibilité WCAG 2.2 AA.
- Git : `main` gelée (socle initial) ; un commit conventionnel par module **vérifié** sur `develop` ; jamais `main` sans accord explicite de l'utilisateur. Mettre à jour `docs/progress.json` à chaque module terminé.
