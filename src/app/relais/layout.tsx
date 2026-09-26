import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { serverApi } from '@/lib/server-api';
import { ROLE_HOME, type Me } from '@/lib/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: { default: t('Relais communautaire'), template: t('%s · Relais · Ganji') }, robots: { index: false } };
}

/** Espace du relais communautaire (le contrôle réel est fait par l'API). */
export default async function RelaisLayout({ children }: { children: ReactNode }) {
  const me = await serverApi<Me>('/auth/me');
  if (me.role !== 'RELAY') redirect(ROLE_HOME[me.role] ?? '/');
  const t = await getT();
  return (
    <>
      <TopBar
        home="/relais"
        who={me.displayName}
        links={[
          { href: '/relais', label: t('Signaler'), icon: 'warning' },
          { href: '/relais#activite', label: t('Historique'), icon: 'calendar' },
          { href: '/orientation', label: t('Orientation'), icon: 'stethoscope' },
          { href: '/urgence', label: t('Urgence'), icon: 'emergency', danger: true },
        ]}
      />
      <I18nScope area="relay">{children}</I18nScope>
    </>
  );
}
