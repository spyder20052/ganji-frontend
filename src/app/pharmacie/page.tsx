import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PharmacyOrders } from './_commandes/PharmacyOrders';
import { DispenseDesk } from './DispenseDesk';
import { OnDutyToggle } from './OnDutyToggle';
import { StockTable } from './StockTable';
import type { StockResponse } from './types';

export default async function PharmaciePage() {
  const t = await getT();
  const stock = await tryServerApi<StockResponse>('/pharmacy/stock');
  const ruptures = stock?.items.filter((i) => i.quantity === 0) ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{stock?.pharmacy.name ?? t('Ma pharmacie')}</h1>
      <PharmacyOrders />
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <DispenseDesk />
        <div className="space-y-5">
          {stock && <OnDutyToggle initial={stock.pharmacy.onDuty} />}
          {ruptures.length > 0 && (
            <section aria-labelledby="h-rupt" className="card p-5">
              <h2 id="h-rupt" className="text-xl font-bold">
                {t('En rupture ({n})', { n: ruptures.length })}
              </h2>
              <ul className="mt-2 space-y-1 text-[0.95rem]">
                {ruptures.slice(0, 8).map((r) => (
                  <li key={r.medication.id}>
                    <span className="font-bold">{r.medication.dci}</span> {r.medication.strength} <span className="text-[var(--fg-muted)]">· {t(r.medication.form)}</span>
                  </li>
                ))}
              </ul>
              {ruptures.length > 8 && <p className="mt-1 text-sm text-[var(--fg-muted)]">{t('et {n} autres, dans le tableau ci-dessous.', { n: ruptures.length - 8 })}</p>}
            </section>
          )}
        </div>
      </div>
      {stock ? <StockTable initial={stock.items} /> : <p className="card p-5 text-[var(--fg-muted)]">{t('Stock indisponible pour le moment.')}</p>}
    </div>
  );
}
