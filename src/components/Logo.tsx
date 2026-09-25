import Link from 'next/link';
import { GanjiSymbol } from './GanjiSymbol';

/**
 * Logo Ganji (charte) : symbole modulaire en escalier et logotype en Poppins Medium.
 * Hauteur du symbole ≥ 24 px à l'écran (taille minimale de la charte).
 */
export function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} prefetch={false} className="inline-flex items-center gap-2.5" aria-label="Ganji, accueil">
      <GanjiSymbol size={30} />
      <span className={`font-display text-[1.45rem] leading-none font-medium tracking-tight ${light ? 'text-white' : 'text-[var(--color-brand-900)] dark:text-[var(--fg)]'}`}>Ganji</span>
    </Link>
  );
}
