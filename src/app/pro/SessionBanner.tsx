'use client';
import { ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * Rappel « session soignant, chaque consultation est journalisée » : il concerne les carnets.
 * La cellule d'écoute (/pro/ecoute) est anonyme et ne touche à aucun carnet : pas de bandeau.
 */
export function SessionBanner({ text }: { text: string }) {
  const path = usePathname();
  if (path.startsWith('/pro/ecoute')) return null;
  return (
    <p className="border-b border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-center text-sm text-[var(--fg-muted)]">
      <ShieldCheck size={14} aria-hidden className="mr-1 inline align-[-2px]" />
      {text}
    </p>
  );
}
