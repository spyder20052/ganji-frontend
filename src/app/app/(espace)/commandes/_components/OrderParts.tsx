import { Check } from 'lucide-react';
import { getT } from '@/i18n/server';
import { STATUS_ICON, STATUS_LABEL, STATUS_TONE, stepsFor, type Order, type OrderStatus } from '../_lib/orders';

/**
 * Code de remise : le « ticket » à montrer au livreur ou au comptoir. Quatre chiffres dans quatre
 * cases (Atkinson, zéro barré), sur la surface forêt : c'est le seul élément fort de l'écran.
 */
export async function HandoverTicket({ code, mode, compact = false }: { code: string; mode: Order['mode']; compact?: boolean }) {
  const t = await getT();
  return (
    <section
      aria-label={t('Code de remise : {code}', { code: code.split('').join(' ') })}
      className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-brand-900)] px-5 py-5 text-white"
    >
      {/* Encoches de ticket, dans la couleur du fond de page. */}
      <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--bg)]" />
      <span aria-hidden className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[var(--bg)]" />
      <p className="text-center text-base font-semibold text-[var(--color-sage)]">
        {mode === 'LIVRAISON' ? t('Code à donner au livreur') : t('Code à donner au comptoir')}
      </p>
      <p aria-hidden className="mt-3 flex justify-center gap-2.5">
        {code.split('').map((d, i) => (
          <span
            key={i}
            className={`num grid place-items-center rounded-2xl bg-white/10 font-sans font-bold text-[var(--color-leaf)] ring-1 ring-white/25 ${compact ? 'h-14 w-12 text-3xl' : 'h-[4.5rem] w-14 text-[2.6rem]'}`}
          >
            {d}
          </span>
        ))}
      </p>
      <p className="mt-3 text-center text-sm text-white/80">{t('Seulement quand vous avez la commande en main.')}</p>
    </section>
  );
}

/** Parcours de la commande : une pastille par étape, l'étape en cours en vert feuille. */
export async function OrderSteps({ order }: { order: Pick<Order, 'mode' | 'status'> }) {
  const t = await getT();
  const steps = stepsFor(order.mode);
  const current = steps.indexOf(order.status);
  return (
    <ol className="flex items-start justify-between gap-1" aria-label={t('Étapes de la commande')}>
      {steps.map((s, i) => {
        const Icon = STATUS_ICON[s];
        const done = i < current || (i === current && i === steps.length - 1);
        const now = i === current && !done;
        return (
          <li key={s} aria-current={now ? 'step' : undefined} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            {i > 0 && (
              <span aria-hidden className={`absolute right-1/2 top-6 h-1 w-full -translate-y-1/2 rounded-full ${i <= current ? 'bg-[var(--color-brand-900)] dark:bg-[var(--color-leaf)]' : 'bg-[var(--border)]'}`} />
            )}
            <span
              className={`relative grid h-12 w-12 place-items-center rounded-full ${
                now
                  ? 'bg-[var(--color-leaf)] text-[var(--color-ink)] ring-4 ring-[var(--color-leaf)]/30'
                  : done
                    ? 'bg-[var(--color-brand-900)] text-white dark:bg-[var(--color-brand-200)] dark:text-[var(--color-ink)]'
                    : 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]'
              }`}
            >
              {done && i !== current ? <Check size={22} aria-hidden /> : <Icon size={22} aria-hidden />}
            </span>
            <span className={`text-sm leading-tight ${now ? 'font-bold' : done ? 'font-semibold' : 'text-[var(--fg-muted)]'}`}>
              {t(STATUS_LABEL[s])}
              <span className="sr-only">{done ? t(' : fait') : now ? t(' : en cours') : t(' : à venir')}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export async function StatusPill({ status }: { status: OrderStatus }) {
  const t = await getT();
  const Icon = STATUS_ICON[status];
  return (
    <span className={`pill whitespace-nowrap ${STATUS_TONE[status]}`}>
      <Icon size={16} aria-hidden /> {t(STATUS_LABEL[status])}
    </span>
  );
}
