import type { Metadata, Viewport } from 'next';
import { EmergencyCardView } from './EmergencyCardView';

export const metadata: Metadata = {
  title: 'Carte d’urgence',
  description: 'Groupe sanguin, allergies, traitement et personne à prévenir : lisible par les secours, même sans réseau.',
};

export const viewport: Viewport = { themeColor: '#c62828' };

/**
 * Carte d'urgence : volontairement hors du layout connecté (aucun appel serveur).
 * Elle doit s'afficher en mode avion, écran verrouillé ou session expirée.
 */
export default function CarteUrgencePage() {
  return <EmergencyCardView />;
}
