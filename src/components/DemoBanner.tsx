import Link from 'next/link';

export function DemoBanner() {
  return (
    <div className="bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)] text-sm font-bold">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5">
        <span>Données fictives · démonstration</span>
        <span className="flex gap-4">
          <Link prefetch={false} href="/demo" className="underline underline-offset-2">Comptes de démo</Link>
          <Link prefetch={false} href="/simulateur" className="underline underline-offset-2">Simulateur SMS</Link>
        </span>
      </div>
    </div>
  );
}
