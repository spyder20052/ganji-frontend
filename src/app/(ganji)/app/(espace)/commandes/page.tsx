import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search, Store, Bike } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { getLocale, getT } from '@/i18n/server';
import { fcfa, fmtDate, relative } from '@/lib/format';
import { AutoRefresh } from '../../_components/AutoRefresh';
import { Empty, ErrorNote, PageHead } from '../../_components/ui';
import { load } from '../../_lib/load';
import { OrderSteps, StatusPill } from './_components/OrderParts';
import { ACTIVE, orderStatusLabel, type Order } from './_lib/orders';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mes commandes') };
}

export default async function CommandesPage() {
  const t = await getT();
  const locale = await getLocale();
  const res = await load<Order[]>('/me/orders');
  const list = res.data ?? [];
  const current = list.filter((o) => ACTIVE.includes(o.status));
  const past = list.filter((o) => !ACTIVE.includes(o.status));

  const listen = current.length
    ? current.map((o) => t('Commande {ref} : {status}.', { ref: o.ref, status: t(orderStatusLabel(o.status, o.mode)) })).join(' ')
    : t('Aucune commande en cours. Pour commander, ouvrez Mes médicaments ou cherchez un médicament.');

  return (
    <>
      {current.length > 0 && <AutoRefresh seconds={8} />}
      <PageHead icon="delivery" title={t('Mes commandes')} listen={listen} audioKey="app.commandes">
        <Link href="/app/medicaments" className="btn btn-soft"><Pictogram name="pill" size={20} /> {t('Ordonnances')}</Link>
        <Link href="/medicaments" className="btn btn-soft"><Search size={20} aria-hidden /> {t('Chercher')}</Link>
      </PageHead>

      {res.error && <ErrorNote error={res.error} />}
      {res.data && list.length === 0 && <Empty>{t('Aucune commande pour le moment.')}</Empty>}

      {current.length > 0 && (
        <section aria-labelledby="h-en-cours" className="space-y-3">
          <h2 id="h-en-cours" className="text-xl font-bold">{t('En cours')}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {current.map((o) => (
              <li key={o.id}>
                <Link href={`/app/commandes/${o.id}`} className="card block space-y-4 p-5 hover:ring-2 hover:ring-[var(--color-brand-900)]/20">
                  <span className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
                      {o.mode === 'LIVRAISON' ? <Bike size={24} aria-hidden /> : <Store size={24} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold">{o.pharmacy.name}</span>
                      <span className="block text-base text-[var(--fg-muted)]">
                        <span className="num">{o.ref}</span> · {relative(o.createdAt, locale)}
                      </span>
                    </span>
                    <ChevronRight size={22} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
                  </span>
                  <OrderSteps order={o} />
                  <span className="flex items-center justify-between gap-3">
                    <StatusPill status={o.status} mode={o.mode} />
                    <span className="display text-2xl">{fcfa(o.totalFcfa, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="h-passees" className="space-y-3">
          <h2 id="h-passees" className="text-xl font-bold">{t('Passées')}</h2>
          <ul className="card divide-y divide-[var(--border)] px-5">
            {past.map((o) => (
              <li key={o.id}>
                <Link href={`/app/commandes/${o.id}`} className="flex min-h-16 items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{o.pharmacy.name}</span>
                    <span className="block text-base text-[var(--fg-muted)]">
                      {fmtDate(o.createdAt, { day: 'numeric', month: 'long' }, locale)} · <span className="num whitespace-nowrap">{fcfa(o.totalFcfa, locale)}</span>
                    </span>
                  </span>
                  <StatusPill status={o.status} mode={o.mode} />
                  <ChevronRight size={20} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
