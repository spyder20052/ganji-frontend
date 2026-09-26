import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { getT } from '@/i18n/server';

/**
 * En-tête d'écran patient : pictogramme, titre, bouton « écouter ». L'introduction n'est plus
 * affichée (trop de texte à l'écran) : elle reste lue par le bouton Écouter et les lecteurs d'écran.
 */
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
    <header className="space-y-4 pt-2">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${danger ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--card)] text-[var(--color-brand-900)] dark:text-[var(--color-leaf)]'}`}
        >
          <Pictogram name={icon} size={24} />
        </span>
        <h1 className="min-w-0 flex-1 text-[1.9rem] leading-tight font-medium tracking-tight">{title}</h1>
        {listen && <ListenButton text={listen} audioKey={audioKey} compact />}
      </div>
      {intro && <p className="sr-only">{intro}</p>}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Section({ id, title, icon, children, className = '', action }: { id: string; title: string; icon?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`card p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-3 text-xl font-semibold">
          {icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
              <Pictogram name={icon} size={20} />
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
  info: 'bg-[var(--color-brand-100)] text-[var(--color-ink)]',
  warn: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  danger: 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]',
} as const;

const TONE_ICON = { info: Info, warn: AlertTriangle, danger: ShieldAlert } as const;

export function Notice({ tone = 'info', title, children, role }: { tone?: keyof typeof TONE; title?: string; children?: ReactNode; role?: 'status' | 'alert' }) {
  const Icon = TONE_ICON[tone];
  return (
    <div role={role} className={`flex gap-3 rounded-3xl p-4 text-base ${TONE[tone]}`}>
      <Icon aria-hidden size={22} className="mt-0.5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

/**
 * Erreur d'un bloc : message clair, sans casser le reste de l'écran. Les messages connus
 * (ceux de load()) sont traduits ; ceux du serveur restent tels quels s'ils n'ont pas de traduction.
 */
export async function ErrorNote({ error, what }: { error: string; what?: string }) {
  const t = await getT();
  return (
    <Notice tone="warn" role="status" title={what ? t('{what} : indisponible', { what }) : undefined}>
      {t(error)}
    </Notice>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-3xl bg-[var(--bg)] p-4 text-base text-[var(--fg-muted)]">{children}</p>;
}
