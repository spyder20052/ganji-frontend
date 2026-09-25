import Link from 'next/link';
import { getT } from '@/i18n/server';
import { GanjiSymbol } from './GanjiSymbol';
import { Logotype } from './Logotype';

/**
 * Logo Ganji (charte) : symbole modulaire en escalier et logotype en Poppins Medium (tracé).
 * Hauteur du symbole ≥ 24 px à l'écran (taille minimale de la charte). Sur fond Forêt (`light`) :
 * logotype blanc et symbole en Pousse.
 */
export async function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  const t = await getT();
  return (
    <Link href={href} prefetch={false} className="inline-flex items-center gap-2.5" aria-label={t('Ganji, accueil')}>
      <GanjiSymbol size={30} color={light ? '#5FD08F' : undefined} />
      <Logotype className={`text-[1.45rem] ${light ? 'text-white' : 'text-[var(--color-brand-900)] dark:text-[var(--fg)]'}`} />
    </Link>
  );
}
