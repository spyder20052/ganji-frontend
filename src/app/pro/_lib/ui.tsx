import type { ReactNode } from 'react';
import { TONE_CLASS, type Tone } from './labels';

/** Étiquette de statut compacte (couleur + texte : jamais la couleur seule). */
export function Pill({ tone = 'muted', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`pill whitespace-nowrap ${TONE_CLASS[tone]} ${className}`}>{children}</span>;
}

/** Message d'erreur annoncé aux lecteurs d'écran. */
export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-2xl border border-[var(--color-ocre-500)]/40 bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">
      {children}
    </p>
  );
}

/** Confirmation discrète après une action. */
export function OkNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="status" className="rounded-2xl bg-[var(--color-brand-100)] p-3 text-base font-bold text-[var(--color-brand-900)]">
      {children}
    </p>
  );
}
