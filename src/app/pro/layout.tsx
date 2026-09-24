import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { requireRole } from './_lib/me';

export const metadata: Metadata = { title: 'Espace soignant' };

export default async function ProLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole(['PRACTITIONER', 'NURSE']);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/pro"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/pro', label: 'Patients', icon: 'people' },
          { href: '/pro/tele-expertise', label: 'Télé-expertise', icon: 'talk' },
        ]}
      />
      <p className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-center text-sm text-[var(--fg-muted)]">
        <ShieldCheck size={14} aria-hidden className="mr-1 inline align-[-2px]" />
        Session soignant : 30 min · chaque consultation est inscrite au journal du patient
      </p>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        {children}
      </main>
    </>
  );
}
