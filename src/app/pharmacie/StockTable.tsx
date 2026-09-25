'use client';
import { Check, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Pill } from '../pro/_lib/ui';
import type { StockItem } from './types';

const LOW = 5;

interface Row extends StockItem {
  qDraft: string;
  pDraft: string;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

function fold(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function toRow(i: StockItem): Row {
  return { ...i, qDraft: String(i.quantity), pDraft: i.priceFcfa == null ? '' : String(i.priceFcfa), saving: false, saved: false, error: null };
}

/** Stock de l'officine : recherche, correction en ligne des quantités et des prix, ruptures signalées. */
export function StockTable({ initial }: { initial: StockItem[] }) {
  const t = useT();
  const locale = useLocale();
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [q, setQ] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  const ruptures = rows.filter((r) => r.quantity === 0).length;
  const lows = rows.filter((r) => r.quantity > 0 && r.quantity < LOW).length;

  const visible = useMemo(() => {
    const term = fold(q.trim());
    return rows.filter(
      (r) =>
        (!onlyAlerts || r.quantity < LOW) &&
        (!term || fold(`${r.medication.dci} ${r.medication.strength} ${r.medication.form} ${r.medication.category ?? ''}`).includes(term)),
    );
  }, [rows, q, onlyAlerts]);

  function patch(id: string, p: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.medication.id === id ? { ...r, ...p } : r)));
  }

  async function save(r: Row) {
    const quantity = Number(r.qDraft);
    const priceFcfa = r.pDraft.trim() === '' ? undefined : Number(r.pDraft);
    if (!Number.isInteger(quantity) || quantity < 0 || (priceFcfa !== undefined && (!Number.isInteger(priceFcfa) || priceFcfa < 0))) {
      return patch(r.medication.id, { error: t('Nombre entier positif attendu') });
    }
    patch(r.medication.id, { saving: true, error: null, saved: false });
    try {
      const res = await api<{ quantity: number; priceFcfa: number | null; updatedAt: string }>('/pharmacy/stock', {
        method: 'PUT',
        json: { medicationId: r.medication.id, quantity, ...(priceFcfa !== undefined ? { priceFcfa } : {}) },
      });
      patch(r.medication.id, {
        quantity: res.quantity,
        priceFcfa: res.priceFcfa,
        low: res.quantity < LOW,
        updatedAt: res.updatedAt,
        qDraft: String(res.quantity),
        pDraft: res.priceFcfa == null ? '' : String(res.priceFcfa),
        saving: false,
        saved: true,
      });
    } catch (e) {
      patch(r.medication.id, { saving: false, error: e instanceof ApiError ? e.message : t('Non enregistré') });
    }
  }

  return (
    <section id="stock" aria-labelledby="h-stock" className="card scroll-mt-24 p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="h-stock" className="flex-1 text-xl font-bold">
          {t('Mon stock')}
        </h2>
        <p className="num text-sm text-[var(--fg-muted)]">
          {t('{n} références', { n: rows.length })} · <span className="font-bold text-[var(--color-ocre-700)]">{t('{n} en rupture', { n: ruptures })}</span> · {lows > 1 ? t('{n} stocks faibles', { n: lows }) : t('{n} stock faible', { n: lows })}
        </p>
      </div>
      <p className="text-sm text-[var(--fg-muted)]">{t('Le public voit seulement « disponible » ou « stock faible », jamais vos quantités. Les ruptures remontent au tableau de bord national.')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <label htmlFor={`${uid}-q`} className="sr-only">
            {t('Filtrer le stock')}
          </label>
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input id={`${uid}-q`} className="input !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Filtrer : DCI, forme, classe…')} autoComplete="off" />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-[var(--border)] px-4 font-bold">
          <input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} className="h-4 w-4" />
          {t('Ruptures et stocks faibles')}
        </label>
      </div>

      <div className="mt-4 max-h-[36rem] overflow-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[44rem] text-[0.95rem]">
          <caption className="sr-only">{t('Stock de l’officine, modifiable')}</caption>
          <thead className="sticky top-0 z-10 bg-[var(--card)]">
            <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
              <th scope="col" className="px-3 py-2 font-bold">{t('Médicament')}</th>
              <th scope="col" className="px-3 py-2 font-bold">{t('État')}</th>
              <th scope="col" className="px-3 py-2 text-right font-bold">{t('Quantité')}</th>
              <th scope="col" className="px-3 py-2 text-right font-bold">{t('Prix (FCFA)')}</th>
              <th scope="col" className="px-3 py-2 font-bold">
                <span className="sr-only">{t('Enregistrer')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {visible.map((r) => {
              const dirty = r.qDraft !== String(r.quantity) || r.pDraft !== (r.priceFcfa == null ? '' : String(r.priceFcfa));
              const name = `${r.medication.dci} ${r.medication.strength}`;
              const onKey = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' && dirty) void save(r);
              };
              return (
                <tr key={r.medication.id} className={r.quantity === 0 ? 'bg-[var(--color-ocre-100)]/60' : ''}>
                  <td className="px-3 py-2">
                    <span className="font-bold">{name}</span>
                    <span className="block text-sm text-[var(--fg-muted)]">
                      {t(r.medication.form)}
                      {r.medication.category ? ` · ${r.medication.category}` : ''} · {t('mis à jour le {date}', { date: fmtDate(r.updatedAt, { day: 'numeric', month: 'short' }, locale) })}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.quantity === 0 ? <Pill tone="ocre">{t('Rupture')}</Pill> : r.quantity < LOW ? <Pill tone="ocre">{t('Stock faible')}</Pill> : <Pill tone="brand">{t('Disponible')}</Pill>}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      inputMode="numeric"
                      className="input num !min-h-11 w-24 text-right"
                      value={r.qDraft}
                      onChange={(e) => patch(r.medication.id, { qDraft: e.target.value, saved: false })}
                      onKeyDown={onKey}
                      aria-label={t('Quantité en stock : {name}', { name })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      inputMode="numeric"
                      className="input num !min-h-11 w-28 text-right"
                      value={r.pDraft}
                      placeholder={r.medication.priceFcfa != null ? String(r.medication.priceFcfa) : '—'}
                      onChange={(e) => patch(r.medication.id, { pDraft: e.target.value, saved: false })}
                      onKeyDown={onKey}
                      aria-label={t('Prix de vente en FCFA : {name}', { name })}
                    />
                  </td>
                  <td className="w-36 px-3 py-2">
                    {dirty ? (
                      <button type="button" className="btn btn-primary !min-h-11 !px-4 text-base" onClick={() => save(r)} disabled={r.saving}>
                        {r.saving ? '…' : t('Enregistrer')}
                      </button>
                    ) : r.saved ? (
                      <span role="status" className="inline-flex items-center gap-1 text-sm font-bold text-[var(--color-brand-700)]">
                        <Check size={16} aria-hidden /> {t('Enregistré')}
                      </span>
                    ) : null}
                    {r.error && (
                      <span role="alert" className="block text-sm font-bold text-[var(--color-ocre-700)]">
                        {r.error}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--fg-muted)]">
                  {t('Aucune référence ne correspond.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
