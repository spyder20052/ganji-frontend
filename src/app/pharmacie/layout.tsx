import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { requireRole } from '../pro/_lib/me';

export const metadata: Metadata = { title: 'Espace pharmacie' };

export default async function PharmacieLayout({ children }: { children: React.ReactNode }) {
  const me = await requireRole(['PHARMACIST']);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/pharmacie"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/pharmacie#delivrer', label: 'Délivrer', icon: 'qr' },
          { href: '/pharmacie#stock', label: 'Mon stock', icon: 'pill' },
        ]}
      />
      <p className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-center text-sm text-[var(--fg-muted)]">
        <ShieldCheck size={14} aria-hidden className="mr-1 inline align-[-2px]" />
        Vous voyez l’ordonnance, jamais le dossier médical · chaque vérification est inscrite au journal du patient
      </p>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        {children}
      </main>
    </>
  );
}
