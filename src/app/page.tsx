import Link from 'next/link';
import { ArrowUpRight, ChevronRight, LogIn } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { PrefsMenu } from '@/components/PrefsMenu';

/** Sans compte : quatre gestes, un mot chacun. */
const NO_ACCOUNT = [
  { href: '/orientation', icon: 'fever', title: 'Symptôme', card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  { href: '/urgence', icon: 'emergency', title: 'Urgence', card: 'bg-[var(--color-danger-600)] text-white', chip: 'bg-white text-[var(--color-danger-600)]' },
  { href: '/medicaments', icon: 'pill', title: 'Médicament', card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  { href: '/carte', icon: 'map', title: 'Lieux de soin', card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', chip: 'bg-[var(--color-brand-500)] text-white' },
];

/** La règle des « 5 sans » du cahier, en un mot chacune. */
const FIVE_WITHOUT = [
  { icon: 'offline', label: 'réseau' },
  { icon: 'phone', label: 'smartphone' },
  { icon: 'listen', label: 'savoir lire' },
  { icon: 'care', label: 'argent' },
  { icon: 'no-account', label: 'compte' },
];

const DEMO = [
  { href: '/demo', label: 'Comptes de démo' },
  { href: '/simulateur', label: 'Simulateur SMS' },
  { href: '/chantier', label: 'Suivi du chantier' },
];

// Pas de préchargement des pages liées : en 2G, chaque Ko compte (budget de la première page < 200 Ko).
export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <PrefsMenu />
          <Link prefetch={false} href="/connexion" className="btn btn-primary">
            <LogIn size={20} aria-hidden /> Se connecter
          </Link>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16">
        <section className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div className="space-y-5 pt-2">
            <p className="text-base text-[var(--fg-muted)]">Ganji · plateforme nationale de santé</p>
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 text-[2.6rem] leading-[1.05] font-light tracking-tight sm:text-[3.4rem]">
                La santé de chaque Béninois, <span className="font-medium">près de chez vous.</span>
              </h1>
              <ListenButton
                compact
                text="Bienvenue sur Ganji. Votre santé, près de chez vous. Sans compte, vous pouvez trouver où vous soigner, un médicament ou de l'aide en urgence."
                audioKey="welcome"
              />
            </div>
            <Link
              prefetch={false}
              href="/connexion"
              className="motif-foret flex items-center gap-4 rounded-[var(--radius-card)] p-5 text-white"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15">
                <Pictogram name="carnet" size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-semibold">Mon carnet</span>
                <span className="block text-base text-white/85">Partagé seulement avec votre accord</span>
              </span>
              <ChevronRight size={22} aria-hidden />
            </Link>
          </div>

          <nav aria-labelledby="h-sans-compte">
            <h2 id="h-sans-compte" className="mb-3 text-lg font-semibold">
              Sans compte, tout de suite
            </h2>
            <ul className="grid grid-cols-2 gap-3">
              {NO_ACCOUNT.map((a) => (
                <li key={a.href}>
                  <Link
                    prefetch={false}
                    href={a.href}
                    className={`flex aspect-[1/0.9] flex-col justify-between rounded-[var(--radius-card)] p-4 transition-transform active:scale-[0.98] lg:aspect-[1.6/1] ${a.card}`}
                  >
                    <span className="flex items-start justify-between">
                      <span className={`grid h-14 w-14 place-items-center rounded-full ${a.chip}`}>
                        <Pictogram name={a.icon} size={28} />
                      </span>
                      <ArrowUpRight size={22} aria-hidden className="opacity-60" />
                    </span>
                    <span className="text-[1.3rem] leading-tight font-semibold">{a.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section aria-labelledby="h-5sans" className="card p-5">
          <h2 id="h-5sans" className="text-lg font-semibold">
            Utile même sans…
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {FIVE_WITHOUT.map((x) => (
              <li key={x.label} className="flex items-center gap-2 rounded-full bg-[var(--bg)] py-2 pr-4 pl-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-ink)]">
                  <Pictogram name={x.icon} size={16} />
                </span>
                <span className="font-medium">{x.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-base text-[var(--fg-muted)]">SMS, menu *229*25#, voix en langues nationales, carte QR imprimée.</p>
        </section>

        <nav aria-label="Pour le jury" className="flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <Link key={d.href} prefetch={false} href={d.href} className="btn btn-ghost">
              {d.label}
            </Link>
          ))}
        </nav>

        <footer className="space-y-1 pt-4 text-sm text-[var(--fg-muted)]">
          <p>Ganji ne remplace pas un avis médical. Urgence : sapeurs-pompiers 118.</p>
          <p>Prototype pour le challenge e-Santé du MTDI · données personnelles fictives.</p>
        </footer>
      </main>
    </>
  );
}
