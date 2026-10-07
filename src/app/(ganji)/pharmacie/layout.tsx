import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { requireRole } from '../pro/_lib/me';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Espace pharmacie') };
}

export default async function PharmacieLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const me = await requireRole(['PHARMACIST']);
  const site = me.practitioner?.facility?.shortName ?? me.practitioner?.facility?.name;
  return (
    <>
      <TopBar
        home="/pharmacie"
        who={site ? `${me.displayName} · ${site}` : me.displayName}
        links={[
          { href: '/pharmacie', label: t('Commandes'), icon: 'delivery' },
          { href: '/pharmacie/delivrer', label: t('Délivrer'), icon: 'qr' },
          { href: '/pharmacie/stock', label: t('Stock'), icon: 'pill' },
        ]}
      />
      <p className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-center text-sm text-[var(--fg-muted)]">
        <ShieldCheck size={14} aria-hidden className="mr-1 inline align-[-2px]" />
        {t('Vous voyez l’ordonnance, jamais le dossier médical · chaque vérification est inscrite au journal du patient')}
      </p>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6 text-base">
        <I18nScope area="structures">{children}</I18nScope>
      </main>
    </>
  );
}
