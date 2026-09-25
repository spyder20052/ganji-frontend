import Link from 'next/link';
import { getT } from '@/i18n/server';
import { GanjiSymbol } from './GanjiSymbol';

/**
 * Logo Ganji (charte) : symbole modulaire en escalier et logotype en Poppins Medium.
 * Hauteur du symbole ≥ 24 px à l'écran (taille minimale de la charte). Sur fond Forêt (`light`) :
 * logotype blanc et symbole en Pousse.
 */
export async function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  const t = await getT();
  return (
    <Link href={href} prefetch={false} className="inline-flex items-center gap-2.5" aria-label={t('Ganji, accueil')}>
      <GanjiSymbol size={30} color={light ? '#5FD08F' : undefined} />
      <span className={`font-display text-[1.45rem] leading-none font-medium tracking-tight ${light ? 'text-white' : 'text-[var(--color-brand-900)] dark:text-[var(--fg)]'}`}>Ganji</span>
    </Link>
  );
}
