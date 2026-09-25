import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Check, LogIn, ShieldX, X } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Logo } from '@/components/Logo';
import { Pictogram } from '@/components/Pictogram';
import { PrefsMenu } from '@/components/PrefsMenu';
import { hasIllustration, Illustration } from './_landing/Illustration';
import { DeferredImages } from './_landing/DeferredImages';
import { KoffiStory } from './_landing/KoffiStory';
import { Onde } from './_landing/Onde';
import { PersonaTabs, type PersonaView } from './_landing/PersonaTabs';

/* Conteneur commun : mêmes marges que la barre de navigation, sur toutes les sections. */
const WRAP = 'mx-auto w-full max-w-6xl px-4';

const NAV = [
  { href: '#services', label: 'Services' },
  { href: '#pour-qui', label: 'Pour qui' },
  { href: '#comment', label: 'Comment ça marche' },
  { href: '#confiance', label: 'Confiance' },
];

/** Notifications du hero : un service chacune, placées autour du symbole sans le couvrir. */
const HERO_CHIPS = [
  { icon: 'blood', label: 'Donneur trouvé', chip: 'bg-danger-600 text-white', at: 'top-[5%] left-0' },
  { icon: 'listen', label: 'Rappel en bariba', chip: 'bg-leaf text-brand-900', at: 'top-[19%] right-0' },
  { icon: 'pill', label: 'Ordonnance vérifiée', chip: 'bg-brand-500 text-white', at: 'bottom-[17%] left-0' },
  { icon: 'offline', label: 'Carte d’urgence hors ligne', chip: 'bg-brand-900 text-white', at: 'right-[4%] bottom-[3%]' },
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
const SERVICES = [
  {
    key: 'carnet',
    frame: 'aspect-[4/3] md:aspect-auto md:w-[56%] md:shrink-0',
    title: 'Carnet partagé',
    text: 'Fiche vitale, soins et analyses. Vous décidez qui voit quoi, et pour combien de temps.',
    icon: 'carnet',
    href: '/connexion',
    span: 'md:col-span-4 md:*:flex-row',
    tone: 'bg-card',
  },
  { key: 'sang', title: 'Sang', text: 'Stocks de l’ANTS visibles, donneurs alertés, réponse par SMS.', icon: 'blood', href: '/demo', span: 'md:col-span-2', frame: 'aspect-[4/3]', tone: 'bg-danger-50 text-danger-800' },
  { key: 'medicaments', title: 'Médicaments', text: 'Qui a mon médicament, et laquelle est de garde.', icon: 'pill', href: '/medicaments', span: 'md:col-span-2', frame: 'aspect-[4/3]', tone: 'bg-brand-100' },
  { key: 'urgence', title: 'Urgence', text: 'Carte QR lisible par les secours, même en mode avion.', icon: 'emergency', href: '/urgence', span: 'md:col-span-2', frame: 'aspect-[4/3]', tone: 'bg-card' },
  { key: 'orientation', title: 'Orientation', text: 'Des pictogrammes pour savoir où aller, sans compte.', icon: 'fever', href: '/orientation', span: 'md:col-span-2', frame: 'aspect-[4/3]', tone: 'bg-brand-100' },
  { key: 'mere-enfant', title: 'Mère et enfant', text: 'Consultations prénatales, vaccins, rappels en langue nationale.', icon: 'pregnant', href: '/demo', span: 'md:col-span-3', frame: 'aspect-[16/9]', tone: 'bg-ocre-100 text-ocre-700' },
  { key: 'teleexpertise', title: 'Avis d’un spécialiste', text: 'Photos et résultats envoyés en 2G, réponse écrite ou vocale.', icon: 'talk', href: '/demo', span: 'md:col-span-3', frame: 'aspect-[16/9]', tone: 'bg-card' },
  { key: 'relais', title: 'Relais et épidémies', text: 'Signaler en 3 gestes, même hors ligne ; alerte au médecin chef de zone.', icon: 'people', href: '/demo', span: 'md:col-span-3', frame: 'aspect-[16/9]', tone: 'bg-card' },
  { key: 'pilotage', title: 'Pilotage national', text: 'Ruptures et besoins en sang par département, en données anonymes.', icon: 'map', href: '/demo', span: 'md:col-span-3', frame: 'aspect-[16/9]', tone: 'motif-foret text-white' },
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

/** La règle des « 5 sans » ; les chiffres viennent du cahier des charges et de leurs sources. */
const FIVE_WITHOUT = [
  { icon: 'offline', title: 'Sans réseau', text: 'Carnet, carte d’urgence et rappels restent consultables hors ligne.' },
  { icon: 'phone', title: 'Sans smartphone', text: 'SMS, menu *229*25# et appel vocal. Les femmes ne sont que 22 % des abonnés à l’internet mobile (ARCEP, 2025).' },
  { icon: 'listen', title: 'Sans savoir lire', text: 'Pictogrammes et voix en langue nationale : 51 % des adultes savent lire (2022).' },
  { icon: 'care', title: 'Sans argent immédiat', text: 'L’urgence vitale d’abord : la carte QR guide les secours.' },
  { icon: 'no-account', title: 'Sans compte', text: 'Orientation et lieux de soin ouverts, sans rien créer.' },
];

const JOURNAL = [
  { tone: 'ok', text: 'Dr Houngbédji a consulté votre fiche vitale', when: 'Hier, 14 h 02' },
  { tone: 'denied', text: 'Tentative refusée : Dr Dansou n’avait pas votre accord', when: 'Hier, 18 h 04' },
  { tone: 'ok', text: 'La pharmacie Camp Guézo a délivré votre ordonnance', when: 'Aujourd’hui, 9 h 30' },
] as const;

const FOOTER = [
  {
    title: 'Sans compte',
    links: [
      ['/orientation', 'J’ai un symptôme'],
      ['/urgence', 'Urgence'],
      ['/medicaments', 'Trouver un médicament'],
      ['/carte', 'Lieux de soin'],
    ],
  },
  {
    title: 'Démonstration',
    links: [
      ['/demo', 'Comptes de démo'],
      ['/simulateur', 'Simulateur SMS'],
      ['/chantier', 'Suivi du chantier'],
    ],
  },
  {
    title: 'Projet',
    links: [
      ['https://github.com/spyder20052/ganji-frontend', 'Code de l’application'],
      ['https://github.com/spyder20052/ganji-backend', 'Code de l’API'],
      ['https://ganji-api.vercel.app/docs', 'Documentation de l’API'],
    ],
  },
] as const;

// Pas de préchargement des pages liées : en 2G, chaque Ko compte (budget de la première page < 200 Ko).
export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className={`${WRAP} flex flex-wrap items-center gap-3 py-3`}>
          <Logo />
          <nav aria-label="Sections de la page" className="ml-6 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-full px-4 py-2 text-base font-medium text-fg-muted hover:bg-card hover:text-fg">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
            <PrefsMenu />
            <Link prefetch={false} href="/connexion" className="btn btn-primary">
              <LogIn size={20} aria-hidden /> Se connecter
            </Link>
          </div>
        </div>
      </header>

      <main id="contenu">
        {/* ── Hero : le slogan de la charte et l'onde Ganji ── */}
        <section className={`${WRAP} grid items-center gap-8 pt-6 pb-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-12 md:pt-12 md:pb-20`}>
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="rise-in min-w-0 text-[min(2.9rem,12.5vw)] leading-[1.02] font-medium tracking-tight [hyphens:manual] sm:text-[min(4rem,9vw)]" style={{ '--i': 0 } as React.CSSProperties}>
                Votre santé, suivie partout.
              </h1>
              <ListenButton compact text="Ganji. Votre santé, suivie partout. Carnet partagé, sang, médicaments, urgences : Ganji relie patients, soignants et pharmacies, même sans réseau ni smartphone." audioKey="welcome" />
            </div>
            <p className="rise-in max-w-[34ch] text-xl text-fg-muted" style={{ '--i': 1 } as React.CSSProperties}>
              Carnet partagé, sang, médicaments, urgences : Ganji relie patients, soignants et pharmacies, même sans réseau ni smartphone.
            </p>
            <div className="rise-in flex flex-wrap gap-3" style={{ '--i': 2 } as React.CSSProperties}>
              <Link prefetch={false} href="/connexion" className="btn btn-primary !min-h-14 !px-6 text-lg">
                Ouvrir mon carnet
              </Link>
              <Link prefetch={false} href="/orientation" className="btn btn-ghost !min-h-14 !px-6 text-lg">
                J’ai un symptôme
              </Link>
            </div>
          </div>
          {/* Onde en SVG (aucune image à télécharger : budget de 200 Ko) et quatre notifications
              qui flottent autour : ce que Ganji fait, avant même de lire. */}
          <div aria-hidden className="relative">
            <Onde />
            {HERO_CHIPS.map((c, i) => (
              <span
                key={c.label}
                className={`hero-chip absolute flex items-center gap-2 rounded-2xl bg-card py-1.5 pr-3 pl-1.5 text-sm font-semibold whitespace-nowrap shadow-[var(--shadow-soft)] sm:text-base ${c.at}`}
                style={{ '--i': i + 3 } as React.CSSProperties}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-full ${c.chip}`}>
                  <Pictogram name={c.icon} size={16} />
                </span>
                {c.label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Sans compte, tout de suite ── */}
        <section aria-labelledby="h-sans-compte" className={`${WRAP} reveal pb-16 md:pb-24`}>
          <h2 id="h-sans-compte" className="mb-4 text-2xl font-medium">
            Sans compte, tout de suite
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {NO_ACCOUNT.map((a) => (
              <li key={a.href}>
                <Link prefetch={false} href={a.href} className={`flex aspect-[1/0.9] flex-col justify-between rounded-card p-4 transition-transform hover:-translate-y-0.5 active:scale-[0.98] md:aspect-[1.3/1] ${a.card}`}>
                  <span className="flex items-start justify-between">
                    <span className={`grid h-14 w-14 place-items-center rounded-full ${a.chip}`}>
                      <Pictogram name={a.icon} size={28} />
                    </span>
                    <ArrowUpRight size={22} aria-hidden className="opacity-60" />
                  </span>
                  <span className="font-display text-[1.3rem] leading-tight font-medium">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Le problème, la réponse ── */}
        <section aria-labelledby="h-probleme" className="below-fold bg-card py-16 md:py-24">
          <div className={`${WRAP} grid gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-14`}>
            <div className="reveal space-y-5 md:sticky md:top-28 md:self-start">
              <h2 id="h-probleme" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
                Les mêmes ruptures, chaque mois.
              </h2>
              <p className="max-w-[40ch] text-lg text-fg-muted">Le patient au long cours les vit toutes. Ganji les règle une par une.</p>
              <div className="overflow-hidden rounded-card">
                <Illustration name="probleme-course" icon="warning" alt="Une famille court à moto-taxi avec une poche de sang vide pendant qu’un homme trouve une pharmacie fermée" />
              </div>
            </div>
            <ol className="space-y-4">
              {PROBLEMS.map((p) => (
                <li key={p.title} className="reveal rounded-card bg-bg p-5">
                  <h3 className="flex items-center gap-3 text-xl font-medium">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${p.icon === 'blood' || p.icon === 'emergency' ? 'bg-danger-50 text-[var(--color-danger-600)]' : 'bg-brand-100 text-brand-900'}`}>
                      <Pictogram name={p.icon} size={22} />
                    </span>
                    {p.title}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <p className="flex gap-2 text-base text-fg-muted">
                      <X size={18} aria-hidden className="mt-1 shrink-0" />
                      <span>
                        <span className="sr-only">Aujourd’hui : </span>
                        {p.before}
                      </span>
                    </p>
                    <p className="flex gap-2 rounded-2xl bg-brand-100 p-3 text-base font-medium text-brand-900">
                      <Check size={18} aria-hidden className="mt-1 shrink-0" />
                      <span>
                        <span className="sr-only">Avec Ganji : </span>
                        {p.after}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Signature : l'histoire de Koffi ── */}
        <section aria-labelledby="h-koffi" className={`${WRAP} py-16 md:py-24`}>
          <div className="reveal mb-10 max-w-[40rem] space-y-3">
            <h2 id="h-koffi" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
              Koffi a besoin de plaquettes demain.
            </h2>
            <p className="text-lg text-fg-muted">Suivez sa demande, de l’hématologue au donneur. À une étape, c’est vous qui répondez.</p>
          </div>
          <KoffiStory />
        </section>

        {/* ── Ce que Ganji permet : mosaïque de neuf services ── */}
        <section id="services" aria-labelledby="h-services" className="below-fold scroll-mt-20 bg-card py-16 md:py-24">
          <div className={WRAP}>
            <h2 id="h-services" className="reveal mb-8 max-w-[18ch] text-[2.2rem] leading-tight font-medium sm:text-5xl">
              Tout ce qui touche à la santé, au même endroit.
            </h2>
            <ul className="grid gap-3 md:grid-cols-6">
              {SERVICES.map((s) => (
                <li key={s.key} className={`reveal ${s.span}`}>
                  <Link prefetch={false} href={s.href} className={`group flex h-full flex-col overflow-hidden rounded-card transition-transform hover:-translate-y-0.5 ${s.tone} ${s.tone.includes('bg-card') ? 'ring-1 ring-border' : ''}`}>
                    <Illustration name={`service-${s.key}`} icon={s.icon} alt="" frame={s.frame} sizes="(min-width: 768px) 33vw, 100vw" />
                    <span className="flex flex-1 flex-col gap-1 p-5">
                      <span className="font-display flex items-center justify-between gap-2 text-xl font-medium">
                        {s.title}
                        <ArrowUpRight size={20} aria-hidden className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                      <span className="text-base">{s.text}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Pour chacun : un onglet par profil, essai en un clic ── */}
        <section id="pour-qui" aria-labelledby="h-pour-qui" className={`below-fold ${WRAP} scroll-mt-20 py-16 md:py-24`}>
          <div className="reveal mb-8 grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] md:gap-12">
            <div className="space-y-3">
              <h2 id="h-pour-qui" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
                Pensé pour chacun.
              </h2>
              <p className="max-w-[40ch] text-lg text-fg-muted">Choisissez un profil, puis essayez-le avec son compte de démonstration.</p>
            </div>
            <Illustration name="hero-communaute" icon="people" alt="" sizes="(min-width: 768px) 36vw, 90vw" className="mx-auto max-w-[440px]" />
          </div>
          <PersonaTabs personas={PERSONAS} available={Object.fromEntries(PERSONAS.map((p) => [p.key, hasIllustration(`persona-${p.key}`)]))} />
        </section>

        {/* ── Comment ça marche : trois gestes, dans l'ordre ── */}
        <section id="comment" aria-labelledby="h-comment" className="below-fold scroll-mt-20 bg-card py-16 md:py-24">
          <div className={WRAP}>
            <h2 id="h-comment" className="reveal mb-10 text-[2.2rem] leading-tight font-medium sm:text-5xl">
              Trois gestes pour commencer.
            </h2>
            <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.name} className="reveal space-y-4">
                  <div className="overflow-hidden rounded-[8%]">
                    <Illustration name={s.name} icon={s.icon} alt="" sizes="(min-width: 768px) 30vw, 90vw" />
                  </div>
                  <h3 className="flex items-center gap-3 text-2xl font-medium">
                    <span aria-hidden className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-900 text-lg text-white">
                      {i + 1}
                    </span>
                    {s.title}
                  </h3>
                  <p className="text-lg text-fg-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── La règle des 5 sans : un seul bloc Forêt sur la page ── */}
        <section aria-labelledby="h-5sans" className="below-fold bg-brand-900 text-white">
          <div className="motif-foret py-16 md:py-24">
            <div className={WRAP}>
              <h2 id="h-5sans" className="reveal mb-3 text-[2.2rem] leading-tight font-medium sm:text-5xl">
                Utile même sans…
              </h2>
              <p className="reveal mb-10 max-w-[44ch] text-lg text-white/85">Ganji est conçu pour la personne la plus éloignée du numérique, pas pour l’usager connecté des villes.</p>
              <ul tabIndex={0} aria-label="Les cinq situations, à faire défiler" className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0">
                {FIVE_WITHOUT.map((f) => (
                  <li key={f.title} className="reveal w-[78%] shrink-0 snap-start rounded-card bg-white/8 p-5 ring-1 ring-white/15 md:w-auto">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf text-brand-900">
                      <Pictogram name={f.icon} size={22} />
                    </span>
                    <h3 className="mt-4 text-xl font-medium">{f.title}</h3>
                    <p className="mt-2 text-base text-white/85">{f.text}</p>
                  </li>
                ))}
              </ul>
              <p className="reveal mt-8 max-w-[60ch] text-base text-white/80">Et plus de 12 000 relais communautaires servent de point d’accès à ceux qui n’ont pas de téléphone.</p>
            </div>
          </div>
        </section>

        {/* ── Confiance : un vrai journal d'accès ── */}
        <section id="confiance" aria-labelledby="h-confiance" className={`below-fold ${WRAP} scroll-mt-20 grid gap-10 py-16 md:grid-cols-2 md:items-center md:gap-14 md:py-24`}>
          <div className="reveal space-y-6">
            <h2 id="h-confiance" className="text-[2.2rem] leading-tight font-medium sm:text-5xl">
              Personne ne lit votre carnet sans votre accord.
            </h2>
            <ul className="space-y-3">
              {['Un accès limité dans le temps, que vous retirez quand vous voulez', 'Chaque lecture écrite dans un journal que personne ne peut effacer', 'Des données chiffrées, hébergées au Bénin en production'].map((t) => (
                <li key={t} className="flex gap-3 text-lg">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-leaf text-brand-900">
                    <Check size={16} aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal relative">
            <div className="w-2/3 overflow-hidden rounded-[8%] md:w-3/5">
              <Illustration name="confiance-journal" icon="shield" alt="" sizes="(min-width: 768px) 30vw, 60vw" />
            </div>
            <figure className="relative -mt-16 ml-auto w-[92%] rounded-card bg-card p-4 shadow-[var(--shadow-soft)] md:-mt-24 md:w-4/5">
              <figcaption className="mb-3 text-sm font-semibold text-fg-muted">Journal d’accès de Koffi</figcaption>
              <ul className="space-y-2">
                {JOURNAL.map((j) => (
                  <li key={j.text} className={`flex gap-3 rounded-2xl px-3 py-2 text-base ${j.tone === 'denied' ? 'bg-ocre-100 text-ocre-700' : 'bg-bg'}`}>
                    {j.tone === 'denied' ? <ShieldX size={18} aria-hidden className="mt-1 shrink-0" /> : <Check size={18} aria-hidden className="mt-1 shrink-0 text-brand-500" />}
                    <span className="min-w-0">
                      <span className="block font-medium">{j.text}</span>
                      <span className="block text-sm">{j.when}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </figure>
          </div>
        </section>

        {/* ── Appel final ── */}
        <section aria-labelledby="h-cta" className={`below-fold ${WRAP} pb-16 md:pb-24`}>
          {/* Fond de la carte = ciel Brume de l'illustration, pour qu'elle s'y fonde. */}
          <div className="reveal overflow-hidden rounded-card bg-[#e0ede5] [&_:focus-visible]:!outline-brand-900">
            <div className="flex flex-wrap items-end justify-between gap-6 p-6 pb-2 md:p-10 md:pb-0">
              <div className="max-w-[34rem] space-y-3">
                <h2 id="h-cta" className="text-[2.2rem] leading-tight font-medium text-brand-900 sm:text-5xl">
                  Essayez Ganji maintenant.
                </h2>
                <p className="text-lg text-brand-900">Sans compte pour vous orienter, ou en un clic avec un compte de démonstration.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link prefetch={false} href="/connexion" className="btn btn-primary !min-h-14 !px-6 text-lg">
                  Ouvrir mon carnet
                </Link>
                <Link prefetch={false} href="/demo" className="btn !min-h-14 bg-white !px-6 text-lg text-brand-900">
                  Comptes de démo <ArrowRight size={18} aria-hidden />
                </Link>
              </div>
            </div>
            <Illustration name="cta-ensemble" icon="people" alt="" frame="aspect-[16/9] md:aspect-[12/5]" position="50% 100%" sizes="(min-width: 1152px) 1152px, 100vw" />
          </div>
        </section>
      </main>
      <DeferredImages />

      <footer className="below-fold border-t border-border bg-card">
        <div className={`${WRAP} grid gap-10 py-12 md:grid-cols-[1.2fr_repeat(3,1fr)]`}>
          <div className="space-y-3">
            <Logo />
            <p className="font-display text-xl font-medium">Votre santé, suivie partout.</p>
            <p className="max-w-[32ch] text-base text-fg-muted">Plateforme nationale de suivi des patients, prototype pour le challenge e-Santé du MTDI.</p>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.title} aria-label={col.title} className="space-y-3">
              <h2 className="text-base font-semibold">{col.title}</h2>
              <ul className="space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={href}>
                    {href.startsWith('http') ? (
                      <a href={href} className="text-base text-fg-muted underline-offset-4 hover:text-fg hover:underline" rel="noopener">
                        {label}
                      </a>
                    ) : (
                      <Link prefetch={false} href={href} className="text-base text-fg-muted underline-offset-4 hover:text-fg hover:underline">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={WRAP}>
          <div className="flex flex-wrap justify-between gap-2 border-t border-border py-5 text-sm text-fg-muted">
            <p>Ganji ne remplace pas un avis médical. Urgence : sapeurs-pompiers 118.</p>
            <p>Données personnelles fictives, pour la démonstration.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
