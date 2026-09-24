import Link from 'next/link';
import { Logo } from './Logo';
import { LogoutButton } from './LogoutButton';
import { PrefsMenu } from './PrefsMenu';

export function TopBar({ home = '/', who, links = [] }: { home?: string; who?: string; links?: { href: string; label: string }[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Logo href={home} />
        <nav aria-label="Navigation principale" className="ml-4 hidden gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-base font-bold text-[var(--fg-muted)] hover:bg-[var(--card)] hover:text-[var(--fg)]">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {who && <span className="hidden text-base text-[var(--fg-muted)] sm:inline">{who}</span>}
          <PrefsMenu />
          {who && <LogoutButton />}
        </div>
      </div>
      {links.length > 0 && (
        <nav aria-label="Navigation principale (mobile)" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-bold">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
