import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { requireRole } from './_lib/me';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Espace soignant') };
}

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const [me, t] = await Promise.all([requireRole(['PRACTITIONER', 'NURSE']), getT()]);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/pro"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/pro', label: t('Patients'), icon: 'people' },
          { href: '/pro/tele-expertise', label: t('Télé-expertise'), icon: 'talk' },
        ]}
      />
      <p className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-center text-sm text-[var(--fg-muted)]">
        <ShieldCheck size={14} aria-hidden className="mr-1 inline align-[-2px]" />
        {t('Session soignant : 30 min · chaque consultation est inscrite au journal du patient')}
      </p>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        <I18nScope area="pro">{children}</I18nScope>
      </main>
    </>
  );
}
