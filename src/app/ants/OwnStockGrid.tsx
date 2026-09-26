'use client';
import { AlertTriangle, ArrowDown, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { BLOOD_GROUPS, BLOOD_PRODUCTS } from '../pro/_lib/labels';
import { LEVEL_CLASS, LEVEL_LABEL, level, unitsOf, type StockSite } from './stock';

type CellState = { draft: string; saved: number; saving: boolean; ok: boolean; error: string | null };
const key = (p: string, g: string) => `${p}:${g}`;
/** En-têtes courts : trois colonnes tiennent sur un téléphone de 360 px. */
const SHORT: Record<string, string> = { CGR: 'CGR', PLAQUETTES: 'Plaq.', PLASMA: 'Plasma' };

/**
 * Stock du site connecté : une ligne par groupe, une case par produit (globules rouges, plaquettes,
 * plasma), modifiable sur place. Enregistré en quittant la case ou avec Entrée ; Échap annule.
 */
export function OwnStockGrid({ site }: { site: StockSite }) {
  const t = useT();
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const init: Record<string, CellState> = {};
    for (const p of BLOOD_PRODUCTS)
      for (const g of BLOOD_GROUPS) {
        const u = unitsOf(site, p.value, g);
        init[key(p.value, g)] = { draft: String(u), saved: u, saving: false, ok: false, error: null };
      }
    return init;
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const patch = (k: string, p: Partial<CellState>) => setCells((c) => ({ ...c, [k]: { ...c[k], ...p } }));

  async function commit(product: string, group: string) {
    const k = key(product, group);
    const c = cells[k];
    const units = Number(c.draft);
    if (c.draft.trim() === '' || !Number.isInteger(units) || units < 0 || units > 5000) {
      patch(k, { draft: String(c.saved), error: t('Valeur invalide') });
      return;
    }
    if (units === c.saved) return;
    patch(k, { saving: true, error: null, ok: false });
    try {
      await api('/blood/stocks', { method: 'PUT', json: { siteId: site.id, product, bloodGroup: group, units } });
      patch(k, { saved: units, saving: false, ok: true });
      setLastError(null);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t('Non enregistré');
      patch(k, { saving: false, error: msg, draft: String(c.saved) });
      setLastError(t('{product} {group} : {message}', { product, group, message: msg }));
    }
  }

  const totals = BLOOD_PRODUCTS.map((p) => BLOOD_GROUPS.reduce((n, g) => n + cells[key(p.value, g)].saved, 0));

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1.5">
        <caption className="sr-only">{t('Stock de {name}, en poches, modifiable', { name: site.shortName ?? site.name })}</caption>
        <thead>
          <tr className="text-sm text-[var(--fg-muted)]">
            <th scope="col" className="w-11 text-left font-bold">
              <span className="sr-only">{t('Groupe')}</span>
            </th>
            {BLOOD_PRODUCTS.map((p, i) => (
              <th key={p.value} scope="col" className="text-center font-bold">
                <abbr title={t(p.label)} className="no-underline">
                  {t(SHORT[p.value] ?? p.short)}
                </abbr>
                <span className="sr-only"> ({t(p.label)})</span>
                <span className="num block text-xs font-normal">{t('{n} poches', { n: totals[i] })}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BLOOD_GROUPS.map((g) => (
            <tr key={g}>
              <th scope="row" className="num text-left text-lg font-bold">
                {g}
              </th>
              {BLOOD_PRODUCTS.map((p) => {
                const k = key(p.value, g);
                const c = cells[k];
                const lv = level(c.saved);
                const Mark = c.saving ? Loader2 : c.ok ? Check : lv === 'critical' ? AlertTriangle : lv === 'low' ? ArrowDown : null;
                return (
                  <td key={k} className={`rounded-xl border p-1 ${LEVEL_CLASS[lv]}`}>
                    <div className="flex items-center gap-1">
                      <span aria-hidden className="grid w-4 shrink-0 place-items-center">
                        {Mark && <Mark size={14} className={c.saving ? 'animate-spin' : ''} />}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        inputMode="numeric"
                        value={c.draft}
                        onChange={(e) => patch(k, { draft: e.target.value, ok: false })}
                        onBlur={() => commit(p.value, g)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') patch(k, { draft: String(c.saved) });
                        }}
                        aria-label={t('{product} {group} : poches en stock (niveau {level})', { product: t(p.label), group: g, level: t(LEVEL_LABEL[lv]) })}
                        aria-invalid={c.error ? true : undefined}
                        className="num min-h-11 w-full min-w-0 rounded-lg border border-current/20 bg-[var(--card)] px-1.5 text-right text-lg font-bold text-[var(--fg)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {lastError && (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--color-ocre-700)]">
          {lastError}
        </p>
      )}
    </div>
  );
}
