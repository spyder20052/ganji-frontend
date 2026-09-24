import Link from 'next/link';

/** Bandeau permanent exigé par le cahier : données fictives. Une ligne, discret. */
export function DemoBanner() {
  return (
    <div className="bg-[var(--color-ocre-100)] text-sm text-[var(--color-ocre-700)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1">
        <span className="font-semibold">Démo · données fictives</span>
        <span className="flex gap-3">
          <Link prefetch={false} href="/demo" className="underline underline-offset-2">Comptes</Link>
          <Link prefetch={false} href="/simulateur" className="underline underline-offset-2">Simulateur SMS</Link>
        </span>
      </div>
    </div>
  );
}
