'use client';
import { useT } from '@/i18n/client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Pictogram } from './Pictogram';

export interface NavLink {
  href: string;
  label: string;
  icon: string;
  /** Lien d'urgence : bouton rouge surélevé au centre de la barre du téléphone. */
  danger?: boolean;
}

/**
 * Le lien le plus précis qui contient la page courante. La racine d'un espace (/app, /pro…), dont
 * les autres liens sont des sous-pages, n'est active que sur elle-même ; les ancres #… jamais.
 */
function activeHref(path: string, links: NavLink[]) {
  const isRoot = (l: NavLink) => links.some((o) => o !== l && o.href.startsWith(`${l.href}/`));
  return links
    .filter((l) => !l.href.includes('#') && (path === l.href || (!isRoot(l) && path.startsWith(`${l.href}/`))))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Téléphone : barre d'onglets flottante en bas, à portée de pouce. L'onglet actif montre son nom. */
export function TabBar({ links }: { links: NavLink[] }) {
  const t = useT();
  const current = activeHref(usePathname(), links);
  return (
    <nav aria-label={t('Navigation principale')} className="tabbar fixed inset-x-0 bottom-0 z-40 px-[12px] pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto flex max-w-[448px] items-center justify-around gap-[4px] rounded-full bg-[var(--card)] p-[6px] shadow-[var(--shadow-soft)]">
        {links.map((l) => {
          if (l.danger) {
            return (
              <li key={l.href}>
                <Link
                  prefetch={false}
                  href={l.href}
                  aria-label={l.label}
                  className="-my-[20px] grid h-[64px] w-[64px] place-items-center rounded-full bg-[var(--color-danger-600)] text-white shadow-[0_10px_24px_-8px_rgb(198_40_40_/_0.6)] ring-4 ring-[var(--bg)] active:scale-95"
                >
                  <Pictogram name={l.icon} size={28} />
                </Link>
              </li>
            );
          }
          const active = l.href === current;
          return (
            <li key={l.href}>
              <Link
                prefetch={false}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                aria-label={l.label}
                className={`flex h-[48px] min-w-[48px] items-center justify-center gap-[8px] rounded-full ${active ? 'bg-[var(--color-leaf)] px-[16px] text-[var(--color-ink)]' : 'text-[var(--fg-muted)] hover:bg-[var(--color-brand-100)]'}`}
              >
                <Pictogram name={l.icon} size={22} />
                {active && (
                  <span aria-hidden className="tabbar-label text-base font-semibold">
                    {l.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Ordinateur et tablette : pilules dans l'en-tête, comme un onglet de navigateur. */
export function NavPills({ links }: { links: NavLink[] }) {
  const t = useT();
  const current = activeHref(usePathname(), links);
  // L'urgence est au centre de la barre du téléphone ; en haut de l'écran, elle ferme la liste.
  const ordered = [...links.filter((l) => !l.danger), ...links.filter((l) => l.danger)];
  return (
    <nav aria-label={t('Navigation principale')} className="hidden items-center gap-1 rounded-full bg-[var(--card)] p-1 md:flex">
      {ordered.map((l) => {
        const active = l.href === current;
        return (
          <Link
            prefetch={false}
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-base font-medium ${
              active
                ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]'
                : l.danger
                  ? 'text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]'
                  : 'text-[var(--fg-muted)] hover:bg-[var(--color-brand-100)] hover:text-[var(--fg)]'
            }`}
          >
            <Pictogram name={l.icon} size={18} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
