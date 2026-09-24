import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { serverApi } from '@/lib/server-api';
import { ROLE_HOME, type Me } from '@/lib/types';

export const metadata: Metadata = { title: { default: 'Pilotage national', template: '%s · Ministère · Ganji' }, robots: { index: false } };

/** Espace ministère : réservé aux rôles MINISTRY et ADMIN (le contrôle réel est fait par l'API). */
export default async function MinistereLayout({ children }: { children: ReactNode }) {
  const me = await serverApi<Me>('/auth/me');
  if (me.role !== 'MINISTRY' && me.role !== 'ADMIN') redirect(ROLE_HOME[me.role] ?? '/');
  return (
    <>
      <TopBar
        home="/ministere"
        who={me.displayName}
        links={[
          { href: '/ministere', label: 'Tableau de bord', icon: 'heart' },
          { href: '/ministere#alertes', label: 'Alertes', icon: 'warning' },
          { href: '/ministere#signalements', label: 'Signalements', icon: 'people' },
          { href: '/carte', label: 'Lieux de soin', icon: 'map' },
          { href: '/simulateur', label: 'Simulateur SMS', icon: 'phone' },
        ]}
      />
      {children}
    </>
  );
}
