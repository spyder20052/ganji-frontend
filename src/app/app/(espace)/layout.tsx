import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { ROLE_HOME } from '@/lib/types';
import { NetworkStatus } from '../_components/NetworkStatus';
import { getMe } from '../_lib/load';

const LINKS = [
  { href: '/app', label: 'Accueil' },
  { href: '/app/carnet', label: 'Carnet' },
  { href: '/app/partage', label: 'Partage' },
  { href: '/app/medicaments', label: 'Médicaments' },
  { href: '/app/sang', label: 'Sang' },
  { href: '/app/carte-urgence', label: 'Urgence' },
];

/**
 * Espace patient et aidant. La carte d'urgence (/app/carte-urgence) est hors de ce
 * groupe : elle doit s'afficher sans session ni réseau.
 */
export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (me.role !== 'PATIENT' && me.role !== 'CAREGIVER') redirect(ROLE_HOME[me.role]);
  return (
    <>
      <TopBar home="/app" who={me.displayName} links={LINKS} />
      <NetworkStatus />
      <main id="contenu" className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {children}
      </main>
    </>
  );
}
