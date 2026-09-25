import type { Messages } from '../translate';
import { landing } from './landing';

/** Traductions en fon (landing-client). Clé = phrase française exacte. À valider par un locuteur natif. */
const KEYS = [
  'Demande de sang · Koffi A.',
  '2 poches',
  'Plaquettes · groupe O+',
  'Stock insuffisant à moins de 60 km : 1 poche',
  'Appel aux donneurs',
  'donneurs alertés',
  'en attente',
  'SMS · Ganji',
  'Rodrigue, votre don de sang peut sauver une vie à CNHU-HKM, à 1 km. Répondez 1 pour OUI ou 2 pour NON.',
  'Merci Rodrigue ! Rendez-vous demain à 8 h à CNHU-HKM.',
  'Clavier du téléphone',
  'Répondre 1 : oui, je donne mon sang',
  'Touche {k}',
  'Réponse envoyée. Le médecin voit : donneur trouvé.',
  'Donneur trouvé',
  'Rodrigue viendra demain à 8 h.',
  'Message vocal en fon envoyé à',
  'Carnet de Koffi · mes soins',
  'Aujourd’hui · CNHU-HKM',
  'Transfusion',
  '2 poches de plaquettes (O+)',
  'Ordonnance · il y a 2 jours',
  'Visible aussi par son équipe de soins',
  'Le médecin demande des plaquettes',
  'Dr Houngbédji demande 2 poches pour Koffi. Ganji vérifie aussitôt les stocks de l’ANTS.',
  '14 donneurs alertés',
  'Stock insuffisant : les donneurs compatibles, disponibles et proches reçoivent un appel au don.',
  'Rodrigue répond « 1 »',
  'Sur un simple téléphone à touches, sans internet. À vous : appuyez sur 1.',
  'Donneur trouvé, en direct',
  'Le médecin le voit tout de suite. Afiavi, la mère de Koffi, reçoit un message vocal en fon.',
  'La transfusion entre au carnet',
  'Koffi la retrouve dans sa chronologie de soins, avec la date et le lieu.',
  'Connexion impossible. Réessayez.',
  'Profils',
  'Portrait : {nom}, {role}',
  'Connexion…',
  'Essayer comme {nom}',
];

/** Même découpage que l'anglais : la part de l'accueil lue par des composants clients, reprise du dictionnaire fon de l'accueil. */
export const landingClient: Messages = Object.fromEntries(KEYS.map((k) => [k, landing[k]]));
