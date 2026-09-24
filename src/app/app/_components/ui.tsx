import { AlertTriangle, Info, ShieldAlert, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';

/** En-tête d'écran patient : pictogramme d'abord, puis le mot, puis « écouter ». */
export function PageHead({
  icon,
  title,
  intro,
  listen,
  audioKey,
  danger = false,
  children,
}: {
  icon: string;
  title: string;
  intro?: ReactNode;
  listen?: string;
  audioKey?: string;
  danger?: boolean;
  children?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-4">
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${danger ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}
        >
          <Pictogram name={icon} />
        </span>
        <h1 className="text-3xl font-bold simple-big">{title}</h1>
      </div>
      {intro && <p className="max-w-2xl text-[var(--fg-muted)]">{intro}</p>}
      {(listen || children) && (
        <div className="flex flex-wrap items-center gap-2">
          {listen && <ListenButton text={listen} audioKey={audioKey} />}
          {children}
        </div>
      )}
    </header>
  );
}

export function Section({ id, title, icon, children, className = '', action }: { id: string; title: string; icon?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-3 text-xl font-bold">
          {icon && (
            <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
              <Pictogram name={icon} size={22} />
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const TONE = {
  info: 'border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-900)]',
  warn: 'border-[var(--color-ocre-500)]/50 bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  danger: 'border-[var(--color-danger-600)]/40 bg-[var(--color-danger-50)] text-[var(--color-danger-800)]',
} as const;

const TONE_ICON = { info: Info, warn: AlertTriangle, danger: ShieldAlert } as const;

export function Notice({ tone = 'info', title, children, role }: { tone?: keyof typeof TONE; title?: string; children?: ReactNode; role?: 'status' | 'alert' }) {
  const Icon = TONE_ICON[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-2xl border p-4 text-base ${TONE[tone]}`}>
      <Icon aria-hidden size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

/** Erreur d'un bloc : message clair en français, sans casser le reste de l'écran. */
export function ErrorNote({ error, what }: { error: string; what?: string }) {
  return (
    <Notice tone="warn" role="status" title={what ? `${what} : indisponible` : undefined}>
      {error}
    </Notice>
  );
}

export function PreviewBadge() {
  return (
    <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
      <Sparkles size={16} aria-hidden /> Aperçu · maquette cliquable
    </span>
  );
}

/** Bandeau honnête pour les écrans M8, M12, M14, M15. */
export function PreviewNotice({ children }: { children: ReactNode }) {
  return (
    <Notice tone="warn" title="Aperçu : ce parcours n’est pas encore branché">
      {children}
    </Notice>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-[var(--bg)] p-4 text-base text-[var(--fg-muted)]">{children}</p>;
}
