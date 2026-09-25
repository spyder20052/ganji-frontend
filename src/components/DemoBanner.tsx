import Link from 'next/link';
import { getT } from '@/i18n/server';

/** Bandeau permanent exigé par le cahier : données fictives. Une ligne, discret. */
export async function DemoBanner() {
  const t = await getT();
  return (
    <div className="bg-[var(--color-ocre-100)] text-sm text-[var(--color-ocre-700)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 py-1">
        <span className="font-semibold [hyphens:manual]">{t('Démo · données fictives')}</span>
        <span className="flex flex-wrap gap-x-3 [hyphens:manual]">
          <Link prefetch={false} href="/demo" className="underline underline-offset-2">{t('Comptes')}</Link>
          <Link prefetch={false} href="/simulateur" className="underline underline-offset-2">{t('Simulateur SMS')}</Link>
        </span>
      </div>
    </div>
  );
}
