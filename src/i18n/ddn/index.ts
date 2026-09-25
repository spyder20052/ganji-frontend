import { droits } from './droits';
import { ecoute } from './ecoute';
import { livraison } from './livraison';
import { sangPartage } from './sang-partage';
import { compte } from './compte';
import { common } from './common';
import { landing } from './landing';
import { landingClient } from './landing-client';
import { orientation } from './orientation';
import { publicPages } from './public';
import { relay } from './relay';
import { patient } from './patient';
import { patient2 } from './patient2';
import { patient3 } from './patient3';
import { pro } from './pro';
import { structures } from './structures';

/** Dictionnaires en dendi, par domaine (même découpage que l'anglais). */
export const AREAS = { compte, sangPartage, livraison, ecoute, droits, common, landing, landingClient, orientation, public: publicPages, relay, patient, patient2, patient3, pro, structures };
