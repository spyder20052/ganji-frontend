# Ganji · frontend

**La santé de chaque Béninois, à chaque moment de la vie.** Ganji est une plateforme nationale de suivi des patients, conçue pour le challenge e-Santé du Ministère de la Transformation Digitale et de l'Innovation (MTDI).

| | |
|---|---|
| Application | [Lien] |
| API et documentation Swagger | [Lien] · dépôt [`ganji-backend`](../../../ganji-backend) |
| Suivi du chantier | `/chantier` dans l'application |
| Cahier des charges | [`docs/CAHIER_DES_CHARGES.pdf`](docs/CAHIER_DES_CHARGES.pdf) · plan de conception [`docs/PLAN.md`](docs/PLAN.md) |

> **Données fictives.** Toutes les personnes, dossiers et stocks sont inventés (exigence légale pour des données de santé). Les établissements, communes, médicaments essentiels et le calendrier vaccinal sont réels.

## Le problème

Le patient au long cours (leucémie, drépanocytose, diabète, VIH) vit chaque mois les mêmes ruptures : **sang introuvable**, **médicaments en rupture** ou contrefaits, **dossier éclaté** sur papier, **spécialistes loin** à Cotonou, **paiement avant soin**. Les mêmes ruptures touchent la femme enceinte qui ne sait pas où accoucher, le parent dont l'enfant a 40 °C à minuit, la personne âgée seule, le blessé de la route.

## La réponse : un seul point d'entrée, la règle des « 5 sans »

Ganji reste utile **sans réseau** (PWA hors ligne, carte d'urgence), **sans smartphone** (SMS, USSD, appel vocal, relais communautaire), **sans savoir lire** (pictogrammes, bouton « écouter », voix en langue nationale), **sans argent immédiat** (urgence vitale, droits ARCH) et **sans compte** (orientation anonyme, carte QR).

## Parcours à essayer (comptes de démo en un clic sur `/demo`)

1. **Koffi a besoin de plaquettes demain** : Dr Houngbédji ouvre le carnet, demande 2 unités de plaquettes, le stock ANTS est insuffisant, 14 donneurs compatibles et proches sont alertés. Dans `/simulateur`, le donneur Rodrigue répond « 1 » depuis un téléphone simple : la demande passe à « donneur trouvé » en direct et Afiavi reçoit un message vocal en fon.
2. **Consentement** : Dr Dansou tente d'ouvrir le carnet de Koffi sans son accord : refus, tentative inscrite au journal que Koffi voit. Koffi montre son QR : accès de 24 h, révocable.
3. **Ordonnance** : délivrée à la Pharmacie Camp Guézo, puis refusée à la pharmacie de Parakou.
4. **Sans compte** : `/orientation` (fièvre de l'enfant, convulsions → urgence et hôpital ouvert le plus proche).
5. **Hors ligne** : mode avion, `/app/carte-urgence` s'affiche toujours.
6. **Épidémie** : Mathieu (relais, Djougou) signale des diarrhées ; le tableau de bord du ministère affiche l'alerte de regroupement.
7. **Grossesse et vaccination** : Rafiatou (Kandi, bariba), Serge et ses jumeaux (calendrier PEV).

| Persona | Rôle | Persona | Rôle |
|---|---|---|---|
| Koffi Agossou | Patient | Dr Zinsou / Dr Chabi | Pharmaciens |
| Afiavi Agossou | Aidante (fon) | ANTS Cotonou | Banque de sang |
| Dr Houngbédji | Hématologue CNHU-HKM | Mathieu Gounou | Relais communautaire |
| Dr Dansou | Médecin sans consentement | Rafiatou, Serge, Bio | Patients grand public |
| Rachidatou Salifou | Infirmière CSC Djougou | Direction de la santé publique | Ministère |

## Lancer en local

```bash
# 1. API (dans ganji-backend) : PostgreSQL + API + seed en une commande
docker compose up
# 2. Frontend
cp .env.example .env.local   # BACKEND_URL=http://localhost:4000
npm install && npm run dev   # http://localhost:3000
```

Tests : `npm test` (unitaires), `npm run test:e2e` (Playwright : parcours héros, consentement, orientation, axe-core).

## Architecture

Next.js 15 (App Router, Server Components) + Tailwind CSS 4, PWA avec service worker écrit à la main, stockage local chiffré par PIN (WebCrypto). Le navigateur ne parle qu'à son propre domaine : `/api/*` est réécrit vers l'API NestJS, donc les cookies de session restent first-party. Détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Sécurité : [`SECURITY.md`](SECURITY.md).

## Déploiement

Projet Vercel séparé ; variable `BACKEND_URL` = URL du projet Vercel `ganji-backend`.
