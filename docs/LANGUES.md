# Langues de Ganji

L'interface existe en **six langues** : français (langue des clés), anglais, et quatre langues nationales du Bénin :
**fon** (Fɔngbè), **yoruba** (Yorùbá), **bariba** (Baatɔnum) et **dendi**. La langue se choisit dans les réglages
(icône en haut à droite) ; elle est aussi enregistrée sur le compte, pour que les SMS et messages vocaux suivent.

## Comment ça marche

- La clé de chaque texte est la phrase française, telle qu'affichée (`t('Ouvrir mon carnet')`).
- Dictionnaires par langue et par domaine : `src/i18n/<langue>/<domaine>.ts` (`en`, `fon`, `yo`, `bba`, `ddn`).
  Côté serveur, tout le dictionnaire de la langue ; côté navigateur, seulement le domaine de la page (`I18nScope`).
- Une phrase sans traduction s'affiche **en français** (langue officielle) : rien ne disparaît.
- Vérification : `npx jiti scripts/i18n/verifier.ts [langue] [domaine…]` (toutes les phrases présentes, variables
  `{x}` conservées, aucune traduction vide).
- Lettres propres aux langues nationales (ɔ, ɛ, ɖ, ŋ, ɲ, ẹ, ọ, ṣ, tons) : les polices de l'app ne les ont pas toutes ;
  une mini Noto Sans (5 Ko par graisse) les fournit, téléchargée seulement quand une page en affiche (`unicode-range`).
- Dates : Intl n'a pas de données pour le fon, le bariba et le dendi ; les dates y sont écrites à la française.

## Statut des traductions

Les quatre langues nationales ont été **traduites par IA** et doivent être **validées par des locuteurs natifs**
avant tout usage réel ; le menu des langues l'indique. Pour une application de santé, la priorité de relecture est :
les consignes d'urgence et de premiers secours, les signes de danger (grossesse, enfant), puis le reste.

| Langue | Couverture | Confiance (auto-évaluation) | À relire en premier |
|--------|------------|------------------------------|---------------------|
| Yoruba | complète | bonne sur la navigation, les boutons, les premiers secours | « ojú ara » (signes de saignement), « gìrì » (convulsions de l'adulte), donneur (olùfẹ̀jẹ̀ṣètọrẹ), relais (aṣojú ìlera àdúgbò), commune (ìjọba ìbílẹ̀), département (ẹkùn), noms des maladies du calendrier vaccinal |
| Fon | complète | correcte sur la navigation, le sang, les SMS (vocabulaire repris des messages vocaux) ; tons non relus | urgence et signes de danger (orientation, public, grossesse), symptômes (« xomɛ̀ yìyì », « kpɛ̀n », « sisɛ », « gǔdo », « sɛ́ »), « alɔdótɔ́ » employé pour aidant et secouriste, salutations |
| Dendi | complète | moyenne : vocabulaire proche du zarma (songhay), pas du dendi du Bénin | premiers secours et signes de danger (« funsu », « zinji », « jeeri », « gaaham koron »), ordre des mots (« 118 ce »), pluriels (-ey, yaŋ), « Oho / Aa’a », donneur (« kuri no boro ») |
| Bariba | complète | faible à moyenne : vocabulaire tiré surtout de la Bible bariba (1996) et de la Déclaration universelle des droits de l'homme en bariba | gestes de premiers secours (public), signes de danger (orientation, grossesse), textes de crise et de suicide (patient3, orientation), mots formés : « faaba » (urgence), « yɛm kɛ̃o » (donneur), « yaayasiabu » (rappel), « wurabu » (consentement), « wɛ̃siara » (respiration), « wasi diiribu » (convulsions), accords et salutations |

Termes médicaux sans équivalent courant : les traductions gardent souvent l'emprunt français tel qu'il se dit au
Bénin (ordonnance, pharmacie, vaccin, maternité, relais…), surtout sur les écrans des soignants.

## Messages vocaux

Les messages vocaux enregistrés (`public/audio/<langue>/<clé>.mp3`) existent en yoruba (34) et en fon (12), en voix
de synthèse à valider (voir `docs/ENREGISTREMENTS.md`). Sans enregistrement, le bouton « Écouter » lit le texte avec
la synthèse vocale du téléphone.

## Ajouter ou corriger une traduction

1. Modifier la valeur dans `src/i18n/<langue>/<domaine>.ts` (ne jamais toucher la clé française).
2. Lancer `npx jiti scripts/i18n/verifier.ts <langue>`.
3. Pour une nouvelle phrase de l'interface : l'ajouter d'abord en anglais dans `src/i18n/en/<domaine>.ts` (référence
   des clés), puis dans chaque langue.
