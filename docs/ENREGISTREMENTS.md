# Enregistrements vocaux en langues nationales

Le cahier des charges demande des messages vocaux dans au moins deux langues nationales. La chaîne est prête ; il manque les enregistrements, qui doivent être faits par un locuteur natif (une traduction automatique du fon ou du bariba n’est pas fiable, et un message de santé mal compris est dangereux).

## Comment ça marche

- Le bouton « Écouter » cherche `public/audio/<langue>/<clé>.mp3` dans la langue choisie par la personne (Réglages → Voix). S’il ne le trouve pas, il lit le texte en français avec la synthèse du navigateur et l’indique à l’écran.
- Les appels vocaux du simulateur portent la même clé (`audioKey`) : le jour où le fichier existe, c’est lui qui est joué.
- Langues : `fon`, `bariba` en priorité, puis `yoruba`, `dendi`.
- Format : MP3 mono, 32 kbit/s, 16 kHz, moins de 20 secondes. Pas de musique. Un fichier par clé et par langue.
- Variables (`{prenom}`, `{date}`, `{lieu}`…) : enregistrer une version générique, sans la variable (« Votre consultation prénatale est prévue demain matin au centre de santé »). La date exacte reste dans le SMS.

## Priorité pour la démonstration (10 fichiers)

| Clé | Langue et situation | Texte de référence (français) |
|---|---|---|
| `reminder.cpn` | bariba · Rafiatou reçoit le rappel de sa 3e consultation prénatale | Bonjour {prenom}. Votre consultation prénatale est prévue le {date} à {heure} à {lieu}. Apportez votre carnet. |
| `donor.found` | fon · Afiavi apprend qu’un donneur est trouvé pour Koffi | Bonne nouvelle : un donneur compatible a été trouvé. Présentez-vous à {lieu}. |
| `donor.call` | fon · Rodrigue reçoit l’appel au don sur son téléphone simple | Appel au don de sang : un patient a besoin du groupe {groupe} à {lieu}. Pouvez-vous venir aujourd'hui ? |
| `reminder.vaccine` | fon · rappel de vaccin pour les parents qui parlent fon | Votre enfant doit recevoir le vaccin {vaccin} le {date} à {lieu}. La vaccination est gratuite. |
| `welcome` | fon et bariba · accueil | Bienvenue sur Ganji. Votre santé, près de chez vous. |
| `app.home` | fon et bariba · accueil patient | Texte lu par le bouton « Écouter » de l’accueil |
| `triage.who` | fon et bariba · orientation | Qui est malade ? Un enfant de moins de 5 ans, un adulte, une femme enceinte, une personne âgée. |

Chemins attendus : `public/audio/bariba/reminder.cpn.mp3`, `public/audio/fon/donor.found.mp3`, etc.

## Messages envoyés par SMS vocal et appel

| Clé | Texte de référence (français) |
|---|---|
| `welcome` | Bienvenue sur Ganji. Votre santé, près de chez vous. |
| `consent.request` | Acceptez-vous qu'un agent de santé consulte votre dossier ? Répondez oui ou non. |
| `consent.granted` | Merci. Vous avez autorisé {lieu} à consulter votre dossier. Vous pouvez retirer cet accord à tout moment. |
| `consent.revoked` | Votre accord a été retiré. Votre dossier n'est plus partagé avec {lieu}. |
| `reminder.cpn` | Bonjour {prenom}. Votre consultation prénatale est prévue le {date} à {heure} à {lieu}. Apportez votre carnet. |
| `reminder.cpn.missed` | Vous n'êtes pas venue à votre consultation prénatale. Passez à {lieu} dès que possible. |
| `reminder.vaccine` | Votre enfant doit recevoir le vaccin {vaccin} le {date} à {lieu}. La vaccination est gratuite. |
| `reminder.vaccine.missed` | Le vaccin {vaccin} de votre enfant est en retard. Il n'est pas trop tard : allez à {lieu}. |
| `reminder.medication` | C'est l'heure de prendre votre {medicament}. Ne l'arrêtez pas sans avis du soignant. |
| `reminder.refill` | Votre traitement {medicament} se termine bientôt. Pensez à le renouveler avant le {date}. |
| `donor.call` | Appel au don de sang : un patient a besoin du groupe {groupe} à {lieu}. Pouvez-vous venir aujourd'hui ? |
| `donor.found` | Bonne nouvelle : un donneur compatible a été trouvé. Présentez-vous à {lieu}. |
| `donor.thanks` | Merci pour votre don de sang. Vous avez peut-être sauvé une vie. Prochain don possible après le {date}. |
| `advice.emergency` | Signe de danger. Allez tout de suite aux urgences de l'hôpital le plus proche : {lieu}. |
| `advice.fever` | En cas de fièvre, faites le test rapide du paludisme au centre de santé avant de prendre un traitement. |
| `advice.diarrhea` | En cas de diarrhée, donnez des SRO et du zinc à l'enfant, et continuez à le nourrir. |
| `advice.pregnancy.danger` | Saignement, maux de tête violents, perte des eaux ou bébé qui ne bouge plus : allez vite à la maternité. |
| `advice.bednet` | Dormez chaque nuit sous une moustiquaire imprégnée, surtout les enfants et les femmes enceintes. |
| `appointment.confirmed` | Votre rendez-vous est confirmé le {date} à {heure} à {lieu}. |
| `pharmacy.on_duty` | Pharmacie de garde la plus proche : {lieu}. Numéro : {numero}. |
| `triage.disclaimer` | Ce service vous oriente mais ne remplace pas un soignant. En cas de doute, consultez. |
| `pregnancy.week` | Vous êtes à {semaines} semaines de grossesse. Pensez au fer-acide folique chaque jour. |

## Orientation par symptômes

Le texte de chaque question est dans `ganji-backend/src/data/triage.ts` (champ `text` et libellés des réponses) ; les conseils de fin dans `TRIAGE_ADVICE`.

`triage.who`, `triage.child_danger`, `triage.child_symptom`, `triage.child_fever`, `triage.child_diarrhea`, `triage.child_cough`, `triage.adult_danger`, `triage.adult_symptom`, `triage.adult_fever`, `triage.adult_diarrhea`, `triage.adult_cough`, `triage.preg_danger`, `triage.preg_other`, `triage.bleeding`, `triage.pain`, `triage.injury`, `triage.mental`, `triage.outcome.MAISON`, `triage.outcome.PHARMACIE`, `triage.outcome.CENTRE_SANTE`, `triage.outcome.URGENCE`

## Boutons « Écouter » des écrans

Le texte à lire est celui que l’écran passe au bouton (`ListenButton text=…`) ; le plus simple est de l’écouter en français dans l’application puis de l’enregistrer dans la langue visée.

`app.home`, `app.carnet`, `app.medicaments`, `app.sang`, `app.carte-urgence`, `app.sos`, `app.symptomes`, `app.partage`, `app.aidants`, `app.grossesse`, `app.enfants`, `app.ecoute`, `app.droits`, `app.assistant`, `app.cercle`, `emergency.card`, `emergency.page`, `map.intro`, `meds.intro`, `meds.result`, `alerts.summary`, `relay.step1`, `relay.step2`, `relay.step3`, `triage.come_back_if`
