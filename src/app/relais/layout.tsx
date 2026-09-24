import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { serverApi } from '@/lib/server-api';
import { ROLE_HOME, type Me } from '@/lib/types';

export const metadata: Metadata = { title: { default: 'Relais communautaire', template: '%s · Relais · Ganji' }, robots: { index: false } };

/** Espace du relais communautaire (le contrôle réel est fait par l'API). */
export default async function RelaisLayout({ children }: { children: ReactNode }) {
  const me = await serverApi<Me>('/auth/me');
  if (me.role !== 'RELAY') redirect(ROLE_HOME[me.role] ?? '/');
  return (
    <>
      <TopBar
        home="/relais"
        who={me.displayName}
        links={[
          { href: '/relais', label: 'Signaler', icon: 'warning' },
          { href: '/relais#activite', label: 'Mes signalements', icon: 'calendar' },
          { href: '/orientation', label: 'Orientation', icon: 'stethoscope' },
          { href: '/urgence', label: 'Urgence', icon: 'emergency', danger: true },
        ]}
      />
      {children}
    </>
  );
}
