import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { DemoPicker, type PersonaCard } from './DemoPicker';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Comptes de démonstration') };
}

const PERSONAS: PersonaCard[] = [
  { persona: 'koffi', name: 'Koffi Agossou', role: 'Patient · 34 ans, leucémie, Abomey-Calavi', story: 'Patient au long cours : un carnet unique, du sang et des médicaments à trouver chaque mois.', shows: 'carnet, QR de partage, journal d’accès, carte d’urgence hors ligne, ordonnance' },
  { persona: 'houngbedji', name: 'Dr Houngbédji', role: 'Hématologue · CNHU-HKM', story: 'Dossier complet en 30 s, demande de plaquettes, avis à distance.', shows: 'fiche patient, demande de sang en direct, télé-expertise' },
  { persona: 'afiavi', name: 'Afiavi Agossou', role: 'Aidante · mère de Koffi, parle fon', story: 'Lit peu, agit pour son fils. Mode simple, voix en fon.', shows: 'délégation, mode simple, message vocal « donneur trouvé »' },
  { persona: 'dr-sans-consentement', name: 'Dr Dansou', role: 'Médecin · HZ Suru-Léré', story: 'Médecin sans lien de soin avec Koffi.', shows: 'accès refusé sans consentement, tentative journalisée, bris de glace' },
  { persona: 'pharmacie-cotonou', name: 'Dr Zinsou (pharmacie)', role: 'Pharmacien · Pharmacie Camp Guézo', story: 'Vérifie et délivre une ordonnance signée.', shows: 'délivrance tracée, stock, garde' },
  { persona: 'pharmacie-parakou', name: 'Dr Chabi (pharmacie)', role: 'Pharmacien · Parakou', story: 'Deuxième pharmacie : l’ordonnance déjà délivrée est refusée.', shows: 'lutte contre la revente' },
  { persona: 'ants', name: 'ANTS · site de Cotonou', role: 'Banque de sang', story: 'Publie ses stocks, lance des appels aux donneurs.', shows: 'stocks par site et par groupe, demandes en cours' },
  { persona: 'rachidatou', name: 'Rachidatou Salifou', role: 'Infirmière · CSC Djougou', story: 'Loin des spécialistes, demande un avis en faible débit.', shows: 'télé-expertise asynchrone, orientation' },
  { persona: 'mathieu', name: 'Mathieu Gounou', role: 'Relais communautaire · Djougou', story: 'Suit les familles de son village, même hors ligne.', shows: 'signalement en 3 gestes, alerte épidémique' },
  { persona: 'ecoutante', name: 'Mme Hounkpè', role: 'Psychologue · cellule d’écoute, CNHU-HKM', story: 'Répond aux personnes qui écrivent à l’écoute, d’abord à celles en détresse.', shows: 'file d’écoute, anonymat, détresse détectée, demande de rappel', home: '/pro/ecoute' },
  { persona: 'rafiatou', name: 'Rafiatou Yessoufou', role: 'Patiente · 1re grossesse, Kandi, parle bariba', story: 'Suit ses consultations prénatales, reconnaît les signes de danger.', shows: 'suivi de grossesse, rappel SMS et voix' },
  { persona: 'serge', name: 'Serge Dossou', role: 'Parent · jumeaux, Porto-Novo', story: 'Carnet de vaccination des jumeaux.', shows: 'calendrier PEV, preuve de vaccination QR' },
  { persona: 'bio', name: 'Bio Orou', role: 'Patient · 61 ans, diabétique, Natitingou, téléphone simple', story: 'Pas de smartphone : tout passe par SMS, USSD et appel vocal.', shows: 'rappels SMS et voix, carte QR imprimée' },
  { persona: 'ministere', name: 'Direction de la santé publique', role: 'Ministère', story: 'Voit ruptures, besoins en sang et alertes par département.', shows: 'tableau de bord national, alertes géolocalisées' },
];

export default async function DemoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).suite;
  // Retour après connexion (chemin interne seulement).
  const suite = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\') ? raw : undefined;
  const t = await getT();
  // Les noms sont des données (non traduits), sauf les mentions génériques entre parenthèses.
  const personas = PERSONAS.map((p) => ({ ...p, name: t(p.name), role: t(p.role), story: t(p.story), shows: t(p.shows) }));
  return (
    <I18nScope area="public">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold">{t('Comptes de démonstration')}</h1>
          <p className="mt-2 max-w-2xl text-[var(--fg-muted)]">
            {t('Chaque profil a son espace et ses droits. Toutes les personnes sont fictives ; les établissements, communes, médicaments et le calendrier vaccinal sont réels. Les soignants ont une session de 30 minutes.')}
          </p>
        </div>
        <DemoPicker personas={personas} suite={suite} />
      </main>
    </I18nScope>
  );
}
