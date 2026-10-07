import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { requireRole } from '../pro/_lib/me';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Banque de sang') };
}

export default async function AntsLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const me = await requireRole(['BLOOD_BANK']);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/ants"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/ants', label: t('Demandes'), icon: 'hospital' },
          { href: '/ants/stocks', label: t('Stocks'), icon: 'blood' },
        ]}
      />
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        <I18nScope area="structures">{children}</I18nScope>
      </main>
    </>
  );
}
