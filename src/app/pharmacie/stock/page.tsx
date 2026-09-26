import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../../app/_components/ui';
import { StockTable } from '../StockTable';
import type { StockResponse } from '../types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Stock') };
}

/** Stock déclaré (ce que voit le public dans « Trouver un médicament ») et ruptures. */
export default async function StockPage() {
  const t = await getT();
  const stock = await tryServerApi<StockResponse>('/pharmacy/stock');
  const ruptures = stock?.items.filter((i) => i.quantity === 0) ?? [];
  return (
    <div className="space-y-5">
      <PageHead
        icon="pill"
        title={t('Stock')}
        listen={
          ruptures.length
            ? t('{n} médicaments en rupture. Mettez le stock à jour : le public voit s’il est disponible, jamais la quantité.', { n: ruptures.length })
            : t('Mettez le stock à jour : le public voit s’il est disponible, jamais la quantité.')
        }
        audioKey="pharmacie.stock"
      />
      {ruptures.length > 0 && (
        <section aria-labelledby="h-rupt" className="card p-5">
          <h2 id="h-rupt" className="text-xl font-bold">
            {t('En rupture ({n})', { n: ruptures.length })}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-[0.95rem]">
            {ruptures.map((r) => (
              <li key={r.medication.id} className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
                {r.medication.dci} {r.medication.strength}
              </li>
            ))}
          </ul>
        </section>
      )}
      {stock ? <StockTable initial={stock.items} /> : <p className="card p-5 text-[var(--fg-muted)]">{t('Stock indisponible pour le moment.')}</p>}
    </div>
  );
}
