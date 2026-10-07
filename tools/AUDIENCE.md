# Audience de Ganji

Le site en ligne (ganji-sante.vercel.app) compte **chaque page ouverte**, et relie les pages d'une même session pour montrer le parcours suivi. Il ne pose aucun cookie et n'enregistre ni adresse IP, ni agent utilisateur, ni donnée de santé : seulement un identifiant aléatoire de navigateur, un identifiant de session, le chemin de la page **sans aucun identifiant** (`/pro/patients/:id`), le type d'appareil, la langue de l'interface et, à l'arrivée, le site de provenance. Les chiffres se lisent **uniquement en local**.

```bash
npm run audience                              # tableau de bord sur http://127.0.0.1:4192
npm run audience -- --texte                   # résumé des 30 derniers jours dans le terminal
npm run audience -- --texte --jours 7
npm run audience -- --texte --du 2026-10-01 --au 2026-10-31
npm run audience -- --demo                    # le tableau de bord sur des données d'exemple, sans accès à la base
```

## Comment ça marche

| Fichier | Rôle |
|---|---|
| `src/components/Audience.tsx` | Dans la mise en page racine : à chaque page, envoie une balise `POST /audience` (jamais depuis un poste local). |
| `src/lib/audience.ts` | Nettoyage du chemin (identifiants, jetons et numéros remplacés par `:id`), appareil, provenance. Testé dans `audience.test.ts`. |
| `src/app/audience/route.ts` | Reçoit la balise et incrémente des compteurs par jour (temps universel) dans la base Redis Upstash reliée au projet Vercel. Toutes les clés commencent par `ganji:`. Sans base reliée, la route ne fait rien. |
| `tools/audience.mjs`, `tools/audience.html` | Lecture locale : chiffres clés, pages vues par jour, pages, pages d'arrivée, appareils, provenance, langues, et le **parcours de chaque visite** page après page avec le temps passé. |

Conservation : agrégats 13 mois, parcours détaillés 90 jours (durée de vie posée sur chaque clé).

## Accès

Les accès à la base sont les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` du projet Vercel `ganji-sante` (environnement Production). L'outil les lit dans `.env.audience`, qu'il crée au premier lancement avec `npx vercel env pull .env.audience --environment=production`. Ce fichier est ignoré par git (`.env.*`) et jamais déployé (`.vercelignore`), comme tout le dossier `tools/`.

La base est partagée avec d'autres sites : pour effacer des données d'essai de Ganji, supprimer uniquement les clés `ganji:*`, jamais la base entière.
