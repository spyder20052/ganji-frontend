import { NavPills, TabBar, type NavLink } from './EspaceNav';
import { Logo } from './Logo';
import { LogoutButton } from './LogoutButton';
import { PrefsMenu } from './PrefsMenu';

/** En-tête commun : logo, navigation (pilules sur ordinateur, onglets en bas sur téléphone), réglages. */
export function TopBar({ home = '/', who, links = [] }: { home?: string; who?: string; links?: NavLink[] }) {
  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--bg)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Logo href={home} />
          {links.length > 0 && (
            <div className="ml-4">
              <NavPills links={links} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {who && <span className="hidden max-w-[16rem] truncate text-base text-[var(--fg-muted)] xl:inline">{who}</span>}
            <PrefsMenu />
            {who && <LogoutButton />}
          </div>
        </div>
      </header>
      {links.length > 0 && <TabBar links={links} />}
    </>
  );
}
