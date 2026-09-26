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
  return { title: { default: t('Pilotage national'), template: t('%s · Ministère · Ganji') }, robots: { index: false } };
}

/** Espace ministère : réservé aux rôles MINISTRY et ADMIN (le contrôle réel est fait par l'API). */
export default async function MinistereLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const me = await serverApi<Me>('/auth/me');
  if (me.role !== 'MINISTRY' && me.role !== 'ADMIN') redirect(ROLE_HOME[me.role] ?? '/');
  return (
    <>
      <TopBar
        home="/ministere"
        who={me.displayName}
        links={[
          { href: '/ministere', label: t('Accueil'), icon: 'heart' },
          { href: '/ministere#alertes', label: t('Alertes'), icon: 'warning' },
          { href: '/ministere#signalements', label: t('Signalements'), icon: 'people' },
          { href: '/carte', label: t('Lieux de soin'), icon: 'map' },
          { href: '/simulateur', label: t('Simulateur SMS'), icon: 'phone' },
        ]}
      />
      <I18nScope area="structures">{children}</I18nScope>
    </>
  );
}
