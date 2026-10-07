import type { Metadata, Viewport } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { EmergencyCardView } from './EmergencyCardView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Carte d’urgence'),
    description: t('Groupe sanguin, allergies, traitement et personne à prévenir : lisible par les secours, même sans réseau.'),
  };
}

export const viewport: Viewport = { themeColor: '#c62828' };

/**
 * Carte d'urgence : volontairement hors du layout connecté (aucun appel serveur).
 * Elle doit s'afficher en mode avion, écran verrouillé ou session expirée.
 */
export default function CarteUrgencePage() {
  return (
    <I18nScope area="patient">
      <EmergencyCardView />
    </I18nScope>
  );
}
