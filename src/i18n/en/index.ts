import { common } from './common';
import { landing } from './landing';
import { orientation } from './orientation';
import { patient } from './patient';
import { patient2 } from './patient2';
import { patient3 } from './patient3';
import { pro } from './pro';
import { publicPages } from './public';
import { relay } from './relay';
import { structures } from './structures';

/** Dictionnaires anglais par domaine : chaque domaine n'envoie au navigateur que les siens. */
export const EN_AREAS = { common, landing, orientation, public: publicPages, relay, patient, patient2, patient3, pro, structures };
export type Area = keyof typeof EN_AREAS;

/**
 * Tout le dictionnaire, pour le rendu côté serveur (jamais envoyé au navigateur). Une même phrase peut
 * changer de sens selon l'espace (« Urgence » : Emergency pour le public, Urgency pour un niveau
 * d'urgence chez le soignant) : les espaces professionnels passent d'abord, le public et le commun en
 * dernier, donc le sens grand public l'emporte côté serveur. Côté client, chaque espace garde le sien.
 */
const SERVER_ORDER: Area[] = ['pro', 'structures', 'relay', 'patient3', 'patient2', 'patient', 'orientation', 'public', 'landing', 'common'];
export const EN = Object.assign({}, ...SERVER_ORDER.map((a) => EN_AREAS[a])) as Record<string, string>;
