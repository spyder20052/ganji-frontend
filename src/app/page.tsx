import { Poppins } from 'next/font/google';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Fragment } from 'react';
import { ArrowRight, ArrowUpRight, Check, Droplet, Heart, LogIn, ShieldX, X } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { GanjiSymbol } from '@/components/GanjiSymbol';
import { Logo } from '@/components/Logo';
import { Logotype } from '@/components/Logotype';
import { Pictogram } from '@/components/Pictogram';
import { PrefsMenu } from '@/components/PrefsMenu';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { hasIllustration, Illustration } from './_landing/Illustration';
import { DeferredImages } from './_landing/DeferredImages';
import { KoffiStory } from './_landing/KoffiStory';
import { HeroOnde } from './_landing/HeroOnde';
import { Intro } from './_landing/Intro';
import { PersonaTabs, type PersonaView } from './_landing/PersonaTabs';
import { ServiceRail } from './_landing/ServiceRail';

/* Charte : Poppins Regular pour le texte courant de l'accueil (les titres et les accents sont en Bricolage
   Grotesque, chargée par la mise en page). Préchargée sur cette page seulement. */
const poppinsText = Poppins({ subsets: ['latin'], weight: ['400'], variable: '--font-poppins-text', display: 'swap' });

/* Titre du hero : Bricolage Grotesque Bold, taille optique 96, réduite aux lettres du titre (2,5 Ko,
   scripts/polices/polices.py). Ses pièges à encre et son approche serrée donnent du caractère au titre. */
const titleFont = localFont({ src: './_landing/fonts/bricolage-titre.woff2', weight: '700', variable: '--font-titre', display: 'swap' });

/* Conteneur commun : mêmes marges que la barre de navigation, sur toutes les sections. */
const WRAP = 'mx-auto w-full max-w-6xl px-4';

const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#pour-qui', label: 'Pour qui' },
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#confiance', label: 'Confiance' },
];

/** Notifications du hero : un service chacune, en orbite autour du symbole, à un quart de tour l'une de l'autre. */
const HERO_CHIPS = [
  { icon: 'blood', label: 'Donneur trouvé', chip: 'bg-danger-600 text-white', angle: -120 },
  { icon: 'listen', label: 'Rappel en bariba', chip: 'bg-leaf text-brand-900', angle: -30 },
  { icon: 'pill', label: 'Ordonnance vérifiée', chip: 'bg-brand-500 text-white', angle: 150 },
  { icon: 'offline', label: 'Carte d’urgence hors ligne', chip: 'bg-brand-900 text-white', angle: 60 },
];

const NO_ACCOUNT = [
  { href: '/orientation', icon: 'fever', title: 'Symptôme', card: 'bg-brand-100 text-brand-900', chip: 'bg-brand-500 text-white' },
  { href: '/urgence', icon: 'emergency', title: 'Urgence', card: 'bg-danger-600 text-white', chip: 'bg-white text-[var(--color-danger-600)]' },
  { href: '/medicaments', icon: 'pill', title: 'Médicament', card: 'bg-brand-100 text-brand-900', chip: 'bg-brand-500 text-white' },
  { href: '/carte', icon: 'map', title: 'Lieux de soin', card: 'bg-brand-100 text-brand-900', chip: 'bg-brand-500 text-white' },
];

/** Les cinq ruptures du cahier des charges, et la réponse de Ganji. */
const PROBLEMS = [
  { icon: 'blood', title: 'Sang introuvable', before: 'La famille cherche elle-même des donneurs, dans l’urgence.', after: 'Les donneurs compatibles et proches sont alertés en quelques secondes.' },
  { icon: 'pill', title: 'Médicaments en rupture', before: 'On court de pharmacie en pharmacie, au risque d’acheter un faux.', after: 'On voit qui a le médicament ; l’ordonnance signée ne sert qu’une fois.' },
  { icon: 'carnet', title: 'Dossier éclaté', before: 'Résultats sur papier, histoire à répéter à chaque médecin.', after: 'Un carnet unique, partagé seulement avec votre accord.' },
  { icon: 'stethoscope', title: 'Spécialistes loin', before: 'Hématologues et oncologues sont concentrés à Cotonou.', after: 'L’infirmière de Djougou obtient un avis écrit ou vocal.' },
  { icon: 'emergency', title: 'Payer avant d’être soigné', before: 'L’urgence vitale attend souvent que la famille paie.', after: 'La carte d’urgence guide les secours ; les droits ARCH s’affichent (aperçu).' },
];

/** Neuf services, en mosaïque : la taille de chaque case suit son poids dans le parcours. */
/** Neuf services en deux rangées, chacune avec sa grande carte (la première, ouverte d'emblée). */
const SERVICE_GROUPS = [
  {
    title: 'Pour vous et vos proches',
    items: [
      { key: 'carnet', title: 'Carnet partagé', text: 'Fiche vitale, soins et analyses. Vous décidez qui voit quoi, et pour combien de temps.', icon: 'carnet', href: '/connexion', pos: '30% 50%' },
      { key: 'urgence', title: 'Urgence', text: 'Carte QR lisible par les secours, même en mode avion.', icon: 'emergency', href: '/urgence', pos: '40% 50%' },
      { key: 'orientation', title: 'Orientation', text: 'Des pictogrammes pour savoir où aller, sans compte.', icon: 'fever', href: '/orientation', pos: '45% 50%' },
      { key: 'medicaments', title: 'Médicaments', text: 'Qui a mon médicament, et laquelle est de garde.', icon: 'pill', href: '/medicaments', pos: '50% 50%' },
      { key: 'mere-enfant', title: 'Mère et enfant', text: 'Consultations prénatales, vaccins, rappels en langue nationale.', icon: 'pregnant', href: '/demo', pos: '50% 50%' },
    ],
  },
  {
    title: 'Pour les soignants et le pays',
    items: [
      { key: 'sang', title: 'Sang', text: 'Stocks de l’ANTS visibles, donneurs alertés, réponse par SMS.', icon: 'blood', href: '/demo', pos: '35% 50%' },
      { key: 'teleexpertise', title: 'Avis d’un spécialiste', text: 'Photos et résultats envoyés en 2G, réponse écrite ou vocale.', icon: 'talk', href: '/demo', pos: '50% 50%' },
      { key: 'relais', title: 'Relais et épidémies', text: 'Signaler en 3 gestes, même hors ligne ; alerte au médecin chef de zone.', icon: 'people', href: '/demo', pos: '40% 50%' },
      { key: 'pilotage', title: 'Pilotage national', text: 'Ruptures et besoins en sang par département, en données anonymes.', icon: 'map', href: '/demo', pos: '40% 50%' },
    ],
  },
];

/** Globules du tube de transfusion : taille, décalage, durée, départ. */
const CELLS = [
  { s: '8px', x: '-2px', dur: '5s', d: '0s' },
  { s: '6px', x: '3px', dur: '6.5s', d: '-2.1s' },
  { s: '9px', x: '1px', dur: '5.8s', d: '-3.7s' },
  { s: '7px', x: '-3px', dur: '7.2s', d: '-1.2s' },
  { s: '6px', x: '2px', dur: '4.6s', d: '-4.4s' },
  { s: '8px', x: '-1px', dur: '6.1s', d: '-5.3s' },
];

const PERSONAS: (PersonaView & { icon: string })[] = [
  {
    key: 'koffi',
    persona: 'koffi',
    name: 'Koffi',
    role: 'Patient au long cours, leucémie, Abomey-Calavi',
    need: 'Un carnet unique, du sang et des médicaments sans courir.',
    benefits: ['Montre son QR : le médecin a 24 h d’accès', 'Voit qui a lu son carnet', 'Garde sa carte d’urgence hors ligne'],
    icon: 'adult',
  },
  {
    key: 'afiavi',
    persona: 'afiavi',
    name: 'Afiavi',
    role: 'Aidante, mère de Koffi, parle fon',
    need: 'Agir pour son fils, même sans bien lire.',
    benefits: ['Messages vocaux en fon', 'Rappels des rendez-vous de Koffi', 'Prévenue quand un donneur est trouvé'],
    icon: 'care',
  },
  {
    key: 'rafiatou',
    persona: 'rafiatou',
    name: 'Rafiatou',
    role: 'Première grossesse, Kandi',
    need: 'Ne manquer aucune consultation prénatale.',
    benefits: ['Rappel de consultation en bariba', 'Signes de danger en pictogrammes', 'Le relais prévenu en cas de saignement'],
    icon: 'pregnant',
  },
  {
    key: 'houngbedji',
    persona: 'houngbedji',
    name: 'Dr Houngbédji',
    role: 'Hématologue, CNHU-HKM',
    need: 'Un dossier complet en 30 secondes.',
    benefits: ['Fiche vitale, chronologie et courbes', 'Demande de sang suivie en direct', 'Ordonnance signée en un geste'],
    icon: 'stethoscope',
  },
  {
    key: 'rachidatou',
    persona: 'rachidatou',
    name: 'Rachidatou',
    role: 'Infirmière, centre de santé de Djougou',
    need: 'L’avis d’un spécialiste sans déplacer le patient.',
    benefits: ['Photos compressées, envoi en 2G', 'Réponse écrite ou vocale', 'L’avis entre dans le carnet'],
    icon: 'talk',
  },
  {
    key: 'pharmacienne',
    persona: 'pharmacie-cotonou',
    name: 'La pharmacie',
    role: 'Pharmacie Camp Guézo, Cotonou',
    need: 'Délivrer sans risque de faux ni de revente.',
    benefits: ['Signature du QR vérifiée', 'Ordonnance déjà servie refusée', 'Stock et garde déclarés en un geste'],
    icon: 'pill',
  },
  {
    key: 'mathieu',
    persona: 'mathieu',
    name: 'Mathieu',
    role: 'Relais communautaire, Djougou',
    need: 'Suivre son village, même sans réseau.',
    benefits: ['Signalement en 3 gestes', 'Envoi au retour du réseau', 'Alerte au médecin chef de zone'],
    icon: 'people',
  },
  {
    key: 'ministere',
    persona: 'ministere',
    name: 'Le ministère',
    role: 'Direction de la santé publique',
    need: 'Voir les ruptures avant qu’elles ne coûtent des vies.',
    benefits: ['Carte nationale des stocks', 'Indicateurs anonymisés', 'Alertes par commune'],
    icon: 'map',
  },
];

const STEPS = [
  { name: 'tuto-carnet', icon: 'carnet', title: 'Créez votre carnet', text: 'Votre NPI et votre téléphone : un code arrive par SMS. Pas de mot de passe.' },
  { name: 'tuto-partage', icon: 'qr', title: 'Partagez-le par QR', text: 'Le soignant scanne, l’accès dure 24 h, vous le retirez quand vous voulez.' },
  { name: 'tuto-rappels', icon: 'calendar', title: 'Recevez vos rappels', text: 'Rendez-vous, médicaments, vaccins : par SMS, appel vocal ou notification.' },
];

/** La règle des « 5 sans » ; les chiffres viennent du cahier des charges et de leurs sources. Chaque carte :
 *  une illustration recadrée sur le détail utile (pos, zoom), ses couleurs (fond, texte), son inclinaison et son
 *  décalage vertical (en quinconce, comme un jeu de cartes posé). */
const FIVE_WITHOUT = [
  { art: 'service-relais', pos: '60% 10%', zoom: 1.25, icon: 'offline', title: 'Sans réseau', text: 'Carnet, carte d’urgence et rappels restent consultables hors ligne.', href: '/app/carte-urgence', bg: '#0a1a14', fg: '#ffffff', tilt: '0deg', lift: '3rem' },
  { art: 'service-sang', pos: '30% 0%', zoom: 1.25, icon: 'phone', title: 'Sans smartphone', text: 'SMS, menu *229*25# et appel vocal. Les femmes ne sont que 22 % des abonnés à l’internet mobile (ARCEP, 2025).', href: '/simulateur', bg: '#e6f0e9', fg: '#0a1a14', tilt: '-2deg', lift: '0rem' },
  { art: 'persona-afiavi', pos: '50% 0%', zoom: 1, icon: 'listen', title: 'Sans savoir lire', text: 'Pictogrammes et voix en langue nationale : 51 % des adultes savent lire (2022).', href: '/orientation', bg: '#5fd08f', fg: '#0b3d2c', tilt: '1.5deg', lift: '2.75rem' },
  { art: 'service-urgence', pos: '60% 25%', zoom: 1.08, icon: 'care', title: 'Sans argent immédiat', text: 'L’urgence vitale d’abord : la carte QR guide les secours.', href: '/urgence', bg: '#0a1a14', fg: '#ffffff', tilt: '0deg', lift: '0.5rem' },
  { art: 'service-orientation', pos: '100% 55%', zoom: 1.6, icon: 'no-account', title: 'Sans compte', text: 'Orientation et lieux de soin ouverts, sans rien créer.', href: '/carte', bg: '#b7d3c1', fg: '#0a1a14', tilt: '-1.75deg', lift: '2.25rem' },
];

const JOURNAL = [
  { tone: 'ok', text: 'Dr Houngbédji a consulté votre fiche vitale', when: 'Hier, 14 h 02' },
  { tone: 'denied', text: 'Tentative refusée : Dr Dansou n’avait pas votre accord', when: 'Hier, 18 h 04' },
  { tone: 'ok', text: 'La pharmacie Camp Guézo a délivré votre ordonnance', when: 'Aujourd’hui, 9 h 30' },
] as const;

/** Pied de page : liens rapides (deux colonnes), liens du projet (externes), garanties vérifiées. */
const QUICK_LINKS = [
  ['/medicaments', 'Médicaments'],
  ['/demo', 'Comptes de démo'],
  ['/carte', 'Lieux de soin'],
  ['/simulateur', 'Simulateur SMS'],
  ['/alertes', 'Alertes'],
  ['/chantier', 'Suivi du chantier'],
] as const;
const PROJECT_LINKS = [
  ['https://github.com/spyder20052/ganji-frontend', 'Code de l’app'],
  ['https://github.com/spyder20052/ganji-backend', 'Code de l’API'],
  ['https://ganji-api.vercel.app/docs', 'Doc de l’API'],
] as const;
const PROOFS = ['WCAG 2.2 AA', 'Première page < 200 Ko', 'Utilisable hors ligne'];

// Pas de préchargement des pages liées : en 2G, chaque Ko compte (budget de la première page < 200 Ko).
export default async function Home() {
  const t = await getT();
  return (
    <div className={`${poppinsText.variable} ${titleFont.variable} landing-text`}>
      <Intro />
      {/* En-tête fondu dans le hero : même Forêt, rien ne le sépare du titre ; il garde ce fond en
          descendant, et la barre de lecture Pousse apparaît sous lui. */}
      <header className="sticky top-0 z-30 bg-brand-900 [&_:focus-visible]:!outline-leaf">
        <span aria-hidden className="scroll-progress absolute inset-x-0 bottom-0 h-[3px] bg-leaf" />
        <div className={`${WRAP} flex flex-wrap items-center gap-3 py-3`}>
          <Logo light />
          <nav aria-label={t('Sections de la page')} className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-full px-4 py-2 text-base font-medium text-sage transition-colors hover:bg-white/10 hover:text-white">
                {t(n.label)}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 [&_summary]:!bg-white/10 [&_summary]:text-white [&_summary]:!shadow-none [&_summary]:transition-colors [&_summary:hover]:!bg-white/20">
            <PrefsMenu />
            <Link prefetch={false} href="/connexion" className="btn bg-white text-brand-900 transition-colors hover:bg-leaf max-sm:!px-4 max-[380px]:[&>svg]:hidden">
              <LogIn size={20} aria-hidden /> {t('Se connecter')}
            </Link>
          </div>
        </div>
      </header>

      <I18nScope area="landingClient">
      <main id="contenu">
        {/* ── Hero : fond Forêt et onde de l'affiche de la charte ; les notifications tournent lentement autour du symbole ── */}
        <section className="relative overflow-hidden bg-brand-900 text-white [&_:focus-visible]:!outline-leaf">
          <div className={`${WRAP} relative grid items-center gap-10 pt-10 pb-24 md:pt-16 md:pb-32 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12`}>
            <div className="space-y-7">
              <div className="flex items-center gap-3">
                <p className="rise-in inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-4 pl-3 text-sm font-semibold ring-1 ring-white/15" style={{ '--i': 0 } as React.CSSProperties}>
                  <span aria-hidden className="h-2 w-2 rounded-full bg-leaf" />
                  {t('Même sans réseau ni smartphone')}
                </p>
                <ListenButton compact text={t('Ganji. Votre santé, suivie partout. Carnet partagé, sang, médicaments, urgences : Ganji relie patients, soignants et pharmacies, même sans réseau ni smartphone.')} audioKey="welcome" />
              </div>
              <div>
                <h1 className="hero-title min-w-0 text-[min(3.3rem,13.5vw)] font-bold [hyphens:manual] sm:text-[min(4.6rem,9.8vw)]">
                  {t('Votre santé, suivie partout.')
                    .split(' ')
                    .map((w, i, all) => (
                      <Fragment key={i}>
                        <span className={`hw ${i === all.length - 1 ? 'hw-accent' : ''}`}>
                          <span style={{ '--i': i + 1 } as React.CSSProperties}>{w}</span>
                        </span>
                        {i < all.length - 1 ? ' ' : ''}
                      </Fragment>
                    ))}
                </h1>
              </div>
              <p className="rise-in max-w-[34ch] text-xl text-sage" style={{ '--i': 5 } as React.CSSProperties}>
                {t('Carnet partagé, sang, médicaments, urgences : Ganji relie patients, soignants et pharmacies.')}
              </p>
              <div className="rise-in flex flex-wrap gap-3 max-sm:[&>a]:w-full" style={{ '--i': 6 } as React.CSSProperties}>
                {/* Au survol, le rond de la flèche s'étend et remplit le bouton ; la flèche avance. */}
                <Link prefetch={false} href="/connexion" className="cta-fill btn !min-h-14 bg-leaf !pr-2 !pl-6 text-lg text-brand-900 max-sm:justify-between">
                  <span>{t('Ouvrir mon carnet')}</span>
                  <span className="cta-arrow grid h-10 w-10 place-items-center rounded-full text-leaf">
                    <ArrowRight size={18} aria-hidden />
                  </span>
                </Link>
                {/* Au survol, le blanc balaie le bouton de gauche à droite. */}
                <Link prefetch={false} href="/orientation" className="cta-sweep btn !min-h-14 !px-6 text-lg text-white ring-1 ring-white/40">
                  <Pictogram name="fever" size={20} />
                  <span>{t('J’ai un symptôme')}</span>
                </Link>
              </div>
            </div>
            <div aria-hidden className="relative">
              <HeroOnde chips={HERO_CHIPS.map((c) => ({ ...c, label: t(c.label) }))} />
            </div>
          </div>
        </section>

        {/* ── Sans compte, tout de suite ── */}
        <section aria-labelledby="h-sans-compte" className="sheet bg-bg pt-12 pb-16 md:pt-16 md:pb-24">
          <div className={`${WRAP} reveal`}>
          <h2 id="h-sans-compte" className="mb-4 text-2xl font-medium">
            {t('Sans compte, tout de suite')}
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {NO_ACCOUNT.map((a) => (
              <li key={a.href}>
                <Link prefetch={false} href={a.href} className={`group flex aspect-[1/0.9] flex-col justify-between rounded-card p-4 transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:aspect-[1.3/1] ${a.card}`}>
                  <span className="flex items-start justify-between">
                    <span className={`grid h-14 w-14 place-items-center rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${a.chip}`}>
                      <Pictogram name={a.icon} size={28} />
                    </span>
                    <ArrowUpRight size={22} aria-hidden className="opacity-60" />
                  </span>
                  <span className="font-display text-[1.3rem] leading-tight font-medium">{t(a.title)}</span>
                </Link>
              </li>
            ))}
          </ul>
          </div>
        </section>

        {/* ── Le problème, la réponse ── */}
        <section aria-labelledby="h-probleme" className="below-fold sheet bg-card py-16 md:py-24">
          <div className={`${WRAP} grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14`}>
            <div className="reveal space-y-5 md:sticky md:top-28 md:self-start">
              <p className="eyebrow">{t('Le problème')}</p>
              <h2 id="h-probleme" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
                {t('Les mêmes ruptures, chaque mois.')}
              </h2>
              <p className="max-w-[40ch] text-lg text-fg-muted">{t('Avec une maladie chronique, ces cinq problèmes reviennent sans cesse. Voici ce que Ganji change pour chacun.')}</p>
              <div className="zoom-in overflow-hidden rounded-card">
                <Illustration name="probleme-course" icon="warning" alt={t('Une famille court à moto-taxi avec une poche de sang vide pendant qu’un homme trouve une pharmacie fermée')} />
              </div>
            </div>
            <ol className="space-y-4">
              {PROBLEMS.map((p) => (
                <li key={t(p.title)} className="reveal rounded-card bg-bg p-5">
                  <h3 className="flex items-center gap-3 text-xl font-medium">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${p.icon === 'blood' || p.icon === 'emergency' ? 'bg-danger-50 text-[var(--color-danger-600)]' : 'bg-brand-100 text-brand-900'}`}>
                      <Pictogram name={p.icon} size={22} />
                    </span>
                    {t(p.title)}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <p className="flex gap-2 text-base text-fg-muted">
                      <X size={18} aria-hidden className="mt-1 shrink-0" />
                      <span>
                        <span className="sr-only">{t('Aujourd’hui :')} </span>
                        <span className="strike">{t(p.before)}</span>
                      </span>
                    </p>
                    <p className="slide-in flex gap-2 rounded-2xl bg-brand-100 p-3 text-base font-medium text-brand-900">
                      <Check size={18} aria-hidden className="mt-1 shrink-0" />
                      <span>
                        <span className="sr-only">{t('Avec Ganji :')} </span>
                        {t(p.after)}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Signature : l'histoire de Koffi ── */}
        <section aria-labelledby="h-koffi" className="sheet bg-bg py-16 md:py-24">
          <div className={WRAP}>
          <div className="reveal mb-10 max-w-[40rem] space-y-3">
            <p className="eyebrow">{t('L’histoire de Koffi')}</p>
            <h2 id="h-koffi" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
              {t('Koffi a besoin de plaquettes demain.')}
            </h2>
            <p className="text-lg text-fg-muted">{t('Suivez sa demande, de l’hématologue au donneur. À une étape, c’est vous qui répondez.')}</p>
          </div>
          <KoffiStory />
          </div>
        </section>

        {/* ── Ce que Ganji permet : deux rails d'illustrations, la carte survolée s'ouvre ── */}
        <section id="services" aria-labelledby="h-services" className="below-fold sheet scroll-mt-20 bg-brand-100 py-16 md:py-24 dark:bg-brand-950">
          <div className={WRAP}>
            <div className="reveal mb-12 space-y-4 text-center">
              <p className="eyebrow">{t('Services')}</p>
              <h2 id="h-services" className="mx-auto max-w-[18ch] text-[2.2rem] leading-tight font-medium sm:text-5xl">
                {t('Tout ce qui touche à la santé, au même endroit.')}
              </h2>
              <p className="mx-auto max-w-[44ch] text-lg text-fg-muted">{t('Neuf services, un seul carnet.')}</p>
            </div>
            <div className="space-y-10">
              {SERVICE_GROUPS.map((g) => (
                <div key={g.title} className="reveal space-y-4">
                  <h3 className="font-display text-xl font-medium">{t(g.title)}</h3>
                  <ServiceRail label={t(g.title)}>
                    {g.items.map((s, i) => (
                      <li key={s.key} data-i={i} data-open={i === 0 ? '' : undefined} className="svc-item">
                        <Link prefetch={false} href={s.href} className="svc-link group relative block h-full overflow-hidden rounded-card bg-brand-900 text-white">
                          <span className="svc-img absolute inset-0">
                            <Illustration name={`service-${s.key}`} icon={s.icon} alt="" frame="h-full" position={s.pos} sizes="(min-width: 768px) 560px, 82vw" />
                          </span>
                          <span aria-hidden className="svc-scrim absolute inset-0" />
                          <span className="svc-more absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 py-1.5 pr-1.5 pl-3.5 text-sm font-semibold text-brand-900">
                            {t('Découvrir')}
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-900 text-white">
                              <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </span>
                          <span aria-hidden className="svc-mini absolute inset-x-3 bottom-4 flex-col items-start gap-2">
                            <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-brand-900">
                              <Pictogram name={s.icon} size={17} />
                            </span>
                            <span className="font-display text-base leading-tight font-medium">{t(s.title)}</span>
                          </span>
                          <span className="svc-full absolute bottom-0 left-0 flex max-w-full flex-col gap-1.5 p-6">
                            <span className="font-display text-3xl leading-tight font-medium">{t(s.title)}</span>
                            <span className="text-base text-white/90">{t(s.text)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ServiceRail>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pour chacun : un onglet par profil, essai en un clic ── */}
        <section id="pour-qui" aria-labelledby="h-pour-qui" className="below-fold sheet scroll-mt-20 bg-bg py-16 md:py-24">
          <div className={WRAP}>
          <div className="reveal mb-8 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:gap-12">
            <div className="space-y-3">
              <p className="eyebrow">{t('Profils')}</p>
              <h2 id="h-pour-qui" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
                {t('Pensé pour chacun.')}
              </h2>
              <p className="max-w-[40ch] text-lg text-fg-muted">{t('Choisissez un profil, puis essayez-le avec son compte de démonstration.')}</p>
            </div>
            <Illustration name="hero-communaute" icon="people" alt="" sizes="(min-width: 768px) 36vw, 90vw" className="mx-auto max-w-[440px]" />
          </div>
          <PersonaTabs personas={PERSONAS.map((x) => ({ ...x, name: t(x.name), role: t(x.role), need: t(x.need), benefits: x.benefits.map((b) => t(b)) }))} available={Object.fromEntries(PERSONAS.map((p) => [p.key, hasIllustration(`persona-${p.key}`)]))} />
          </div>
        </section>

        {/* ── Comment ça marche : trois étapes le long d'un tube de transfusion où le sang monte au défilement ── */}
        <section id="comment" aria-labelledby="h-comment" className="below-fold sheet scroll-mt-20 bg-card py-16 md:py-24">
          <div className={WRAP}>
            <div className="reveal mb-12 space-y-4 md:mb-16 md:text-center">
              <p className="eyebrow">{t('Parcours')}</p>
              <h2 id="h-comment" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
                {t('Trois gestes pour commencer.')}
              </h2>
            </div>
            <div className="flow relative pb-20">
              {/* Le tube : verre, sang qui monte, reflet qui coule, globules qui circulent. */}
              <div aria-hidden className="flow-tube absolute top-5 bottom-10 left-5 w-[18px] -translate-x-1/2 md:left-1/2">
                <span className="flow-blood absolute inset-0">
                  {CELLS.map((c) => (
                    <span key={c.d} className="flow-cell" style={{ '--s': c.s, '--x': c.x, '--dur': c.dur, '--d': c.d } as React.CSSProperties} />
                  ))}
                </span>
              </div>
              <span aria-hidden className="absolute top-0 left-5 grid h-11 w-11 -translate-x-1/2 place-items-center rounded-full bg-danger-600 text-white shadow-[0_0_0_6px_rgb(198_40_40_/_0.14)] md:left-1/2">
                <Droplet size={20} />
              </span>
              <ol className="relative space-y-16 pt-20 md:space-y-24">
                {STEPS.map((s, i) => (
                  <li key={s.name} className="relative grid gap-6 pl-14 md:grid-cols-2 md:gap-28 md:pl-0">
                    <span aria-hidden className="flow-node font-display absolute top-0 left-5 z-10 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full text-base font-medium md:left-1/2">
                      {i + 1}
                    </span>
                    <div className={`reveal space-y-3 ${i % 2 ? 'md:order-2' : 'md:text-right'}`}>
                      <p className="text-sm font-semibold tracking-wide text-[var(--color-danger-600)] uppercase">{t('Étape {n}', { n: `0${i + 1}` })}</p>
                      <h3 className="font-display text-3xl leading-tight font-medium">{t(s.title)}</h3>
                      <p className={`max-w-[36ch] text-lg text-fg-muted ${i % 2 ? '' : 'md:ml-auto'}`}>{t(s.text)}</p>
                    </div>
                    <div className={`zoom-in w-full max-w-[20rem] overflow-hidden rounded-[8%] ${i % 2 ? 'md:order-1 md:justify-self-end' : ''}`}>
                      <Illustration name={s.name} icon={s.icon} alt="" sizes="(min-width: 768px) 320px, 70vw" />
                    </div>
                  </li>
                ))}
              </ol>
              <span aria-hidden className="flow-end absolute bottom-0 left-5 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full bg-danger-600 text-white md:left-1/2">
                <Heart size={22} />
              </span>
            </div>
          </div>
        </section>

        {/* ── La règle des 5 sans : bandeau Forêt, la trame de la marque en filigrane ; chaque carte mène à l'outil ── */}
        <section id="inclusion" aria-labelledby="h-5sans" className="below-fold sheet filigrane scroll-mt-24 bg-brand-900 py-16 text-white md:py-24 [&_:focus-visible]:!outline-leaf">
          {/* Deux calques de filigrane à des vitesses différentes : la trame, et le symbole géant qui tourne. */}
          <span aria-hidden className="filigrane-mark">
            <GanjiSymbol size="100%" color="#0f4a35" />
          </span>
          <div className={`${WRAP} relative`}>
            <div className="reveal mb-10 max-w-[44rem] space-y-5 md:mb-14">
              <h2 id="h-5sans" className="text-[2.6rem] leading-[1.05] font-medium sm:text-6xl">
                {t('Utile même sans…')}
              </h2>
              <p className="max-w-[46ch] text-lg">{t('Ganji est conçu pour la personne la plus éloignée du numérique, pas pour l’usager connecté des villes.')}</p>
            </div>
            {/* Cartes de couleur inclinées, en quinconce ; au survol (ou au clavier) la carte se redresse et monte,
                son illustration s'avance, la flèche tourne, et les autres s'effacent un peu.
                Téléphone et tablette : on les fait défiler au doigt. */}
            <ul tabIndex={0} aria-label={t('Les cinq situations, à faire défiler')} className="sans-deck">
              {FIVE_WITHOUT.map((f, i) => (
                <li key={f.href} className="sans-card" style={{ '--i': i, '--tilt': f.tilt, '--lift': f.lift, '--z': f.zoom, '--o': f.pos, '--sc-bg': f.bg, '--sc-fg': f.fg } as React.CSSProperties}>
                  <Link prefetch={false} href={f.href} className="sans-face">
                    <span className="sans-art">
                      <Illustration name={f.art} icon={f.icon} alt="" frame="aspect-[5/4]" position={f.pos} sizes="(min-width: 1280px) 400px, 520px" />
                      <span aria-hidden className="sans-badge">
                        <Pictogram name={f.icon} size={20} />
                      </span>
                      <span aria-hidden className="sans-arrow">
                        <ArrowUpRight size={18} />
                      </span>
                    </span>
                    <span className="mt-4 block px-2 text-xl leading-tight font-semibold">{t(f.title)}</span>
                    <span className="mt-2 block px-2 pb-2 text-[0.95rem] leading-snug">{t(f.text)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="reveal mt-8 max-w-[60ch] text-lg md:mt-10">{t('Et plus de 12 000 relais communautaires servent de point d’accès à ceux qui n’ont pas de téléphone.')}</p>
          </div>
        </section>

        {/* ── Confiance : un vrai journal d'accès ── */}
        <section id="confiance" aria-labelledby="h-confiance" className="below-fold sheet scroll-mt-20 bg-card py-16 md:py-24">
          <div className={`${WRAP} grid gap-10 md:grid-cols-2 md:items-center md:gap-14`}>
          <div className="reveal space-y-6">
            <p className="eyebrow">{t('Confiance')}</p>
            <h2 id="h-confiance" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
              {t('Personne ne lit votre carnet sans votre accord.')}
            </h2>
            <ul className="space-y-3">
              {['Un accès limité dans le temps, que vous retirez quand vous voulez', 'Chaque lecture écrite dans un journal que personne ne peut effacer', 'Des données chiffrées, hébergées au Bénin en production'].map((item) => (
                <li key={item} className="flex gap-3 text-lg">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf text-brand-900">
                    <Check size={16} aria-hidden />
                  </span>
                  {t(item)}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal relative">
            <div className="zoom-in w-2/3 overflow-hidden rounded-[8%] md:w-3/5">
              <Illustration name="confiance-journal" icon="shield" alt="" sizes="(min-width: 768px) 30vw, 60vw" />
            </div>
            <figure className="relative -mt-16 ml-auto w-[92%] rounded-card bg-card p-4 shadow-[var(--shadow-soft)] md:-mt-24 md:w-4/5">
              <figcaption className="mb-3 text-sm font-semibold text-fg-muted">{t('Journal d’accès de Koffi')}</figcaption>
              <ul className="space-y-2">
                {JOURNAL.map((j) => (
                  <li key={t(j.text)} className={`slide-in flex gap-3 rounded-2xl px-3 py-2 text-base ${j.tone === 'denied' ? 'bg-ocre-100 text-ocre-700' : 'bg-bg'}`}>
                    {j.tone === 'denied' ? <span className="pulse-ring mt-0.5 grid h-6 w-6 shrink-0 place-items-center"><ShieldX size={18} aria-hidden /></span> : <Check size={18} aria-hidden className="mt-1 shrink-0 text-brand-500" />}
                    <span className="min-w-0">
                      <span className="block font-medium">{t(j.text)}</span>
                      <span className="block text-sm">{t(j.when)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
          </div>
        </section>

        {/* ── Appel final ── */}
        <section aria-labelledby="h-cta" className="below-fold sheet bg-bg py-16 md:py-24">
          <div className={WRAP}>
          {/* Fond de la carte = ciel Brume de l'illustration, pour qu'elle s'y fonde. */}
          <div className="reveal overflow-hidden rounded-card bg-[#e0ede5] [&_:focus-visible]:!outline-brand-900">
            <div className="flex flex-wrap items-end justify-between gap-6 p-6 pb-2 md:p-10 md:pb-0">
              <div className="max-w-[34rem] space-y-3">
                <h2 id="h-cta" className="text-[2.2rem] leading-tight font-medium text-brand-900 sm:text-5xl">
                  {t('Essayez Ganji maintenant.')}
                </h2>
                <p className="text-lg text-brand-900">{t('Sans compte pour vous orienter, ou en un clic avec un compte de démonstration.')}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link prefetch={false} href="/connexion" className="btn btn-primary !min-h-14 !px-6 text-lg">
                  {t('Ouvrir mon carnet')}
                </Link>
                <Link prefetch={false} href="/demo" className="btn !min-h-14 bg-white !px-6 text-lg text-brand-900">
                  {t('Comptes de démo')} <ArrowRight size={18} aria-hidden />
                </Link>
              </div>
            </div>
            <Illustration name="cta-ensemble" icon="people" alt="" className="zoom-in" frame="aspect-[16/9] md:aspect-[12/5]" position="50% 100%" sizes="(min-width: 1152px) 1152px, 100vw" />
          </div>
          </div>
        </section>
      </main>
      <DeferredImages />
      </I18nScope>

      {/* Pied de page : carte Forêt tramée, symbole Ganji à cheval sur son bord (il respire), la
          marque au centre, l'aide sans compte, les liens de part et d'autre. */}
      <footer className="below-fold pt-20">
        <div className="motif-foret relative rounded-t-[2rem] pt-20 pb-6 text-white md:rounded-t-[3rem] md:pt-24 [&_:focus-visible]:!outline-leaf">
          <div className={WRAP}>
            <GanjiSymbol size={144} color="#5FD08F" className="onde-heart absolute top-0 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 md:h-36 md:w-36" />
            <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end md:gap-8">
              <div className="text-center md:order-2">
                <p className="flex justify-center text-[3.4rem] md:text-7xl">
                  <Logotype label="Ganji" />
                </p>
                <p className="mt-3 text-lg text-sage">{t('Votre santé, suivie partout.')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link prefetch={false} href="/orientation" className="btn bg-leaf !pr-2 text-brand-900 hover:bg-leaf-strong">
                    {t('J’ai un symptôme')}
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-900 text-leaf">
                      <ArrowRight size={18} aria-hidden />
                    </span>
                  </Link>
                  <Link prefetch={false} href="/urgence" className="btn bg-brand-700 !pr-2 text-white ring-1 ring-white/20">
                    {t('Urgence')}
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-danger-600 text-white">
                      <ArrowRight size={18} aria-hidden />
                    </span>
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 md:order-1">
                <div className="space-y-1.5">
                  <h2 className="font-display text-xl font-medium">{t('Sans internet')}</h2>
                  <p className="text-base text-sage">
                    {t('Menu')} <span className="font-semibold whitespace-nowrap text-white">*229*25#</span>
                  </p>
                  <p className="text-base text-sage">{t('SMS et appel vocal')}</p>
                  <p className="text-base text-sage">
                    {t('Urgence :')} <span className="font-semibold text-white">118</span>
                  </p>
                </div>
                <nav aria-label={t('Le projet')} className="self-end">
                  <ul className="space-y-1.5">
                    {PROJECT_LINKS.map(([href, label]) => (
                      <li key={href}>
                        <a href={href} rel="noopener" className="inline-flex items-center gap-1 text-base underline-offset-4 hover:underline">
                          {label} <ArrowUpRight size={16} aria-hidden className="shrink-0 text-leaf" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
              <nav aria-labelledby="h-aller-vite" className="md:order-3 md:justify-self-end">
                <h2 id="h-aller-vite" className="font-display mb-1.5 text-xl font-medium">
                  {t('Aller vite à')}
                </h2>
                <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {QUICK_LINKS.map(([href, label]) => (
                    <li key={href}>
                      <Link prefetch={false} href={href} className="text-base text-sage underline-offset-4 hover:text-white hover:underline">
                        {t(label)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <ul aria-label={t('Garanties vérifiées')} className="flex flex-wrap gap-2">
                {PROOFS.map((proof) => (
                  <li key={proof} className="flex items-center gap-1.5 rounded-full bg-brand-700 py-1 pr-3 pl-1.5 text-sm font-semibold">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-leaf text-brand-900">
                      <Check size={13} aria-hidden />
                    </span>
                    {t(proof)}
                  </li>
                ))}
              </ul>
              <p className="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl bg-surface px-4 py-2 text-sm text-brand-900">
                <span>{t('Données fictives')}</span>
                <span>{t('Ne remplace pas un avis médical')}</span>
                <span>{t('© 2026 Ganji')}</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
