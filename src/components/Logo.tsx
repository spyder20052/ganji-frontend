import Link from 'next/link';

/** Logo : goutte-feuille (santé + vie), trait unique, lisible en 24 px. */
export function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold text-xl tracking-tight" aria-label="Alafia, accueil">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="10" fill={light ? '#ffffff' : '#0b4f3c'} />
        <path d="M16 6c4.5 5.2 7 8.9 7 12a7 7 0 1 1-14 0c0-3.1 2.5-6.8 7-12Z" fill={light ? '#0b4f3c' : '#e3f1eb'} />
        <path d="M16 25v-8m0 3.5 3-3" stroke={light ? '#e3f1eb' : '#0b4f3c'} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <span className={light ? 'text-white' : 'text-[var(--color-brand-900)] dark:text-[var(--fg)]'}>Alafia</span>
    </Link>
  );
}
