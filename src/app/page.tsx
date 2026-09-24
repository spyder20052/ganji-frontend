import Link from 'next/link';
import { ArrowUpRight, LogIn } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { PrefsMenu } from '@/components/PrefsMenu';

const NO_ACCOUNT = [
  { href: '/orientation', icon: 'fever', title: "J'ai un symptôme", text: 'Où aller : maison, pharmacie, centre de santé ou urgence ?' },
  { href: '/urgence', icon: 'emergency', title: 'Urgence', text: 'Numéros, hôpital ouvert le plus proche, gestes à faire', danger: true },
  { href: '/medicaments', icon: 'pill', title: 'Trouver un médicament', text: 'Quelle pharmacie l’a, laquelle est de garde' },
  { href: '/carte', icon: 'map', title: 'Lieux de soin', text: 'Hôpitaux, maternités, centres de santé, sites de transfusion' },
];

const SITUATIONS = [
  ['pregnant', 'Je suis enceinte'], ['baby', 'Mon bébé est né'], ['heart', 'Je vis avec une maladie chronique'], ['blood', "J'ai besoin de sang"],
  ['mind', 'Je vais mal dans ma tête'], ['elderly', 'Je suis âgé ou dépendant'], ['shield', 'Une épidémie menace'], ['care', 'Je ne peux pas payer'],
];

// Pas de préchargement des pages liées : en 2G, chaque Ko compte (budget de la première page < 200 Ko).
export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <PrefsMenu />
          <Link prefetch={false} href="/connexion" className="btn btn-primary"><LogIn size={20} aria-hidden /> Se connecter</Link>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-6xl space-y-8 px-4 pb-16">
        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="card relative overflow-hidden !border-0 bg-[var(--color-brand-900)] p-6 text-white sm:p-10">
            <p className="label !text-[var(--color-brand-200)]">Alafia · « bien-être » en fon, yoruba et dendi</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">La santé de chaque Béninois, à chaque moment de la vie.</h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--color-brand-100)]">
              Un carnet qui voyage avec vous, relié à votre NPI et partagé seulement avec votre accord. Le bon soin au bon endroit. Du sang, des médicaments et un spécialiste mobilisés en temps réel.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link prefetch={false} href="/connexion" className="btn bg-white text-[var(--color-brand-900)]">Ouvrir mon carnet</Link>
              <ListenButton text="Bienvenue sur Alafia. Votre santé, près de chez vous. Sans compte, vous pouvez trouver où vous soigner, un médicament ou de l'aide en urgence." audioKey="welcome" />
            </div>
            <svg aria-hidden className="pointer-events-none absolute -right-10 -bottom-10 opacity-10" width="260" height="260" viewBox="0 0 32 32">
              <path d="M16 3c6 7 9.5 12 9.5 16a9.5 9.5 0 1 1-19 0C6.5 15 10 10 16 3Z" fill="#fff" />
            </svg>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-bold">Sans compte, tout de suite</h2>
            <ul className="mt-4 grid gap-3">
              {NO_ACCOUNT.map((a) => (
                <li key={a.href}>
                  <Link prefetch={false} href={a.href} className={`group flex items-center gap-4 rounded-2xl border p-3 hover:shadow-sm ${a.danger ? 'border-[var(--color-danger-600)]/30 bg-[var(--color-danger-50)]' : 'border-[var(--border)] bg-[var(--bg)]'}`}>
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${a.danger ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
                      <Pictogram name={a.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{a.title}</span>
                      <span className="block text-base text-[var(--fg-muted)]">{a.text}</span>
                    </span>
                    <ArrowUpRight aria-hidden className="shrink-0 text-[var(--fg-muted)] group-hover:text-[var(--fg)]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="h-5sans" className="card p-6">
          <h2 id="h-5sans" className="text-xl font-bold">Utile même sans…</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['réseau', 'Carnet, carte d’urgence et rappels consultables hors ligne'],
              ['smartphone', 'SMS, menu *229*25#, appel vocal, relais du village'],
              ['savoir lire', 'Pictogrammes et voix en fon, yoruba, bariba, dendi'],
              ['argent immédiat', 'Urgence vitale prise en charge, droits ARCH visibles'],
              ['compte', 'Orientation anonyme et carte QR d’urgence'],
            ].map(([k, v]) => (
              <li key={k} className="rounded-2xl bg-[var(--bg)] p-4">
                <p className="font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">Sans {k}</p>
                <p className="mt-1 text-base text-[var(--fg-muted)]">{v}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-sit">
          <h2 id="h-sit" className="text-xl font-bold">Chaque situation de vie, une réponse</h2>
          {/* Colonnes de 11rem au moins : une seule colonne quand le texte est agrandi à 200 %. */}
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))] gap-3">
            {SITUATIONS.map(([icon, label]) => (
              <li key={label} className="card flex items-center gap-3 p-4">
                <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={icon} size={22} /></span>
                <span className="text-base font-bold">{label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link prefetch={false} href="/demo" className="card p-5 hover:shadow-sm">
            <p className="label">Jury</p>
            <p className="mt-1 text-lg font-bold">Comptes de démonstration</p>
            <p className="text-base text-[var(--fg-muted)]">Patient, aidante, hématologue, pharmacie, ANTS, ministère, relais : connexion en un clic.</p>
          </Link>
          <Link prefetch={false} href="/simulateur" className="card p-5 hover:shadow-sm">
            <p className="label">Sans smartphone</p>
            <p className="mt-1 text-lg font-bold">Simulateur SMS et USSD</p>
            <p className="text-base text-[var(--fg-muted)]">Voir les messages reçus par un téléphone simple et y répondre.</p>
          </Link>
          <Link prefetch={false} href="/chantier" className="card p-5 hover:shadow-sm">
            <p className="label">Transparence</p>
            <p className="mt-1 text-lg font-bold">Suivi du chantier</p>
            <p className="text-base text-[var(--fg-muted)]">Avancement de chaque module, critères d’acceptation, commits.</p>
          </Link>
        </section>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-[var(--border)] pt-6 text-sm text-[var(--fg-muted)]">
          <p>Alafia ne remplace pas un avis médical. Urgence : sapeurs-pompiers 118.</p>
          <p>Prototype pour le challenge e-Santé du MTDI · données personnelles fictives.</p>
        </footer>
      </main>
    </>
  );
}
