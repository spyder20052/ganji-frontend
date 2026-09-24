import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { requireRole } from '../pro/_lib/me';

export const metadata: Metadata = { title: 'Banque de sang' };

export default async function AntsLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole(['BLOOD_BANK']);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/ants"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/ants#stocks', label: 'Stocks' },
          { href: '/ants#demandes', label: 'Demandes' },
        ]}
      />
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        {children}
      </main>
    </>
  );
}
