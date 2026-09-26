import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import type { NavLink } from '@/components/EspaceNav';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { ROLE_HOME } from '@/lib/types';
import { NetworkStatus } from '../_components/NetworkStatus';
import { getMe } from '../_lib/load';

const LINKS: NavLink[] = [
  { href: '/app', label: 'Accueil', icon: 'home' },
  { href: '/app/carnet', label: 'Carnet', icon: 'carnet' },
  { href: '/app/sos', label: 'Urgence', icon: 'emergency', danger: true },
  { href: '/app/medicaments', label: 'Médicaments', icon: 'pill' },
  { href: '/app/sang', label: 'Sang', icon: 'blood' },
  { href: '/app/profil', label: 'Profil', icon: 'adult', desktopOnly: true },
];

/**
 * Espace patient et aidant. La carte d'urgence (/app/carte-urgence) est hors de ce
 * groupe : elle doit s'afficher sans session ni réseau.
 */
export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const [me, t] = await Promise.all([getMe(), getT()]);
  if (me.role !== 'PATIENT' && me.role !== 'CAREGIVER') redirect(ROLE_HOME[me.role]);
  const links = LINKS.map((l) => ({ ...l, label: t(l.label) }));
  return (
    <>
      <TopBar home="/app" who={me.displayName} links={links} account={{ href: '/app/profil', label: t('Mon profil') }} />
      <I18nScope area="patient">
        <NetworkStatus />
        <main id="contenu" className="mx-auto max-w-6xl space-y-5 px-4 pb-6 pt-2">
          {children}
        </main>
      </I18nScope>
    </>
  );
}
