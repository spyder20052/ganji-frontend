'use client';
import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useT } from '@/i18n/client';

/**
 * Parcours en étapes (accueil, prise de rendez-vous) : une question par écran, retour à gauche,
 * avancement en segments, question lue à voix haute. Le titre reçoit le focus à chaque étape.
 */
export function StepShell({
  step,
  total,
  title,
  listen,
  icon,
  onBack,
  backLabel,
  children,
  footer,
}: {
  step: number;
  total: number;
  title: string;
  listen?: string;
  icon?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="chip-round !h-12 !w-12 shrink-0" aria-label={backLabel ?? t('Retour')}>
            <ChevronLeft size={24} aria-hidden />
          </button>
        ) : (
          <span className="h-12 w-12 shrink-0" aria-hidden />
        )}
        <ol className="flex flex-1 gap-1.5" aria-label={t('Étape {n} sur {total}', { n: step + 1, total })}>
          {Array.from({ length: total }, (_, i) => (
            <li
              key={i}
              aria-current={i === step ? 'step' : undefined}
              className={`h-2 flex-1 rounded-full transition-colors motion-reduce:transition-none ${i <= step ? 'bg-[var(--color-leaf)]' : 'bg-[var(--border)]'}`}
            />
          ))}
        </ol>
        <span className="num shrink-0 text-base font-semibold text-[var(--fg-muted)]" aria-hidden>
          {step + 1}/{total}
        </span>
      </div>

      <div className="flex items-start gap-3">
        {icon && (
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--card)] text-[var(--color-brand-900)] shadow-[var(--shadow-soft)] dark:text-[var(--color-leaf)]">
            {icon}
          </span>
        )}
        <h1 ref={heading} tabIndex={-1} style={{ outline: 'none' }} className="min-w-0 flex-1 pt-1 text-[1.75rem] leading-tight font-medium tracking-tight">
          {/* Espace insécable avant « ? ! : » : la ponctuation ne part jamais seule à la ligne. */}
          {title.replace(/ ([?!:;])/g, '\u00a0$1')}
        </h1>
        {listen && <ListenButton text={listen} compact />}
      </div>

      <div className="space-y-4">{children}</div>
      {footer && <div className="space-y-2 pt-1">{footer}</div>}
    </div>
  );
}
