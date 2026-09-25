'use client';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { BLOOD_GROUPS, BLOOD_PRODUCTS } from '../pro/_lib/labels';
import { LEVEL_CLASS, LEVEL_LABEL, level, unitsOf, type StockSite } from './stock';

type CellState = { draft: string; saved: number; saving: boolean; ok: boolean; error: string | null };
const key = (p: string, g: string) => `${p}:${g}`;

/** Stock du site connecté, modifiable case par case (enregistré en quittant la case ou avec Entrée). */
export function OwnStockGrid({ site }: { site: StockSite }) {
  const t = useT();
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const init: Record<string, CellState> = {};
    for (const p of BLOOD_PRODUCTS) for (const g of BLOOD_GROUPS) {
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-separate border-spacing-1.5">
          <caption className="sr-only">{t('Stock de {name}, en poches, modifiable', { name: site.shortName ?? site.name })}</caption>
          <thead>
            <tr className="text-left text-sm text-[var(--fg-muted)]">
              <th scope="col" className="w-16 font-bold">
                {t('Groupe')}
              </th>
              {BLOOD_PRODUCTS.map((p, i) => (
                <th key={p.value} scope="col" className="font-bold">
                  {t(p.label)} <span className="num font-normal">· {t('{n} poches', { n: totals[i] })}</span>
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
                  return (
                    <td key={k} className={`rounded-xl border p-1.5 ${LEVEL_CLASS[lv]}`}>
                      <div className="flex items-center gap-2">
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
                          className="num min-h-11 w-20 rounded-lg border border-current/20 bg-[var(--card)] px-2 text-right text-lg font-bold text-[var(--fg)]"
                        />
                        <span className="text-sm font-bold" aria-hidden>
                          {c.saving ? '…' : c.ok ? <Check size={16} /> : t(LEVEL_LABEL[lv])}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lastError && (
        <p role="alert" className="mt-2 text-sm font-bold text-[var(--color-ocre-700)]">
          {lastError}
        </p>
      )}
      <p className="mt-2 text-sm text-[var(--fg-muted)]">{t('Modifiez une case puis quittez-la (ou Entrée) : l’enregistrement est immédiat et visible des hôpitaux. Échap annule.')}</p>
    </div>
  );
}
