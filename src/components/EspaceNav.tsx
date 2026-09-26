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
  /** Seulement dans les pilules de l'ordinateur (sur téléphone, le lien est dans l'en-tête). */
  desktopOnly?: boolean;
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

/**
 * Téléphone : barre d'onglets en bas, à portée de pouce. Cases de même largeur (rien ne bouge d'un
 * écran à l'autre) : pictogramme et nom court dans chacune, l'onglet actif teinté. L'urgence est
 * toujours dans la case du milieu, en bouton rouge surélevé.
 */
export function TabBar({ links }: { links: NavLink[] }) {
  const t = useT();
  const current = activeHref(usePathname(), links);
  const shown = links.filter((l) => !l.desktopOnly);
  const danger = shown.filter((l) => l.danger);
  const rest = shown.filter((l) => !l.danger);
  const middle = Math.ceil(rest.length / 2);
  const ordered = danger.length ? [...rest.slice(0, middle), ...danger, ...rest.slice(middle)] : rest;
  return (
    <nav aria-label={t('Navigation principale')} className="tabbar fixed inset-x-0 bottom-0 z-40 px-[12px] pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
      <ul className="mx-auto grid max-w-[448px] items-center rounded-[28px] bg-[var(--card)] p-[6px] shadow-[var(--shadow-soft)]" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))` }}>
        {ordered.map((l) => {
          if (l.danger) {
            return (
              <li key={l.href} className="grid place-items-center">
                <Link
                  prefetch={false}
                  href={l.href}
                  aria-label={l.label}
                  className="-my-[18px] grid h-[62px] w-[62px] place-items-center rounded-full bg-[var(--color-danger-600)] text-white shadow-[0_10px_24px_-8px_rgb(198_40_40_/_0.6)] ring-4 ring-[var(--bg)] active:scale-95"
                >
                  <Pictogram name={l.icon} size={28} />
                </Link>
              </li>
            );
          }
          const active = l.href === current;
          return (
            <li key={l.href} className="min-w-0">
              <Link
                prefetch={false}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                aria-label={l.label}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-[2px] rounded-[22px] px-[2px] active:scale-95 ${active ? 'text-[var(--color-brand-900)] dark:text-[var(--color-leaf)]' : 'text-[var(--fg-muted)]'}`}
              >
                <span className={`grid h-[32px] w-[52px] place-items-center rounded-full transition-colors ${active ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : ''}`}>
                  <Pictogram name={l.icon} size={22} />
                </span>
                <span aria-hidden className={`tabbar-label max-w-full truncate text-[min(0.72rem,2.8vw)] leading-tight tracking-[-0.01em] ${active ? 'font-bold' : 'font-medium'}`}>
                  {l.label}
                </span>
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
