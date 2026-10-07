import type { Metadata } from 'next';
import { AlertTriangle, ArrowDown } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { T } from '@/i18n/translate';
import { fmtDateTime } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../../app/_components/ui';
import { BLOOD_GROUPS, BLOOD_PRODUCTS } from '../../pro/_lib/labels';
import { getMe } from '../../pro/_lib/me';
import { OwnStockGrid } from '../OwnStockGrid';
import { CRITICAL, LEVEL_CLASS, LOW, level, unitsOf, type StockSite } from '../stock';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Stocks de sang') };
}

/** Stocks de sang : le site connecté (modifiable case par case), puis les autres sites du pays. */
export default async function AntsStocksPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [me, sites] = await Promise.all([getMe(), tryServerApi<StockSite[]>('/blood/stocks')]);
  const own = sites?.find((s) => s.id === me.facilityId) ?? null;
  const others = (sites ?? []).filter((s) => s.id !== own?.id);
  const national = (sites ?? []).reduce((n, s) => n + s.total, 0);
  const low = (sites ?? []).reduce((n, s) => n + BLOOD_PRODUCTS.reduce((m, p) => m + BLOOD_GROUPS.filter((g) => unitsOf(s, p.value, g) < LOW).length, 0), 0);

  return (
    <div className="space-y-5">
      <PageHead
        icon="blood"
        danger
        title={t('Stocks de sang')}
        listen={t(
          'Votre stock, groupe par groupe : globules rouges, plaquettes, plasma. Touchez un nombre, corrigez-le, puis quittez la case : c’est enregistré et les hôpitaux le voient tout de suite. Rouge : moins de {critical} poches. Orange : moins de {low}. Les autres sites du réseau sont en dessous.',
          { critical: CRITICAL, low: LOW },
        )}
      />

      <dl className="grid grid-cols-2 gap-2 text-center">
        <div className="card px-4 py-3">
          <dt className="text-sm font-bold text-[var(--fg-muted)]">{t('Poches (pays)')}</dt>
          <dd className="num text-3xl font-light">{national}</dd>
        </div>
        <div className="rounded-[var(--radius-card)] bg-[var(--color-danger-50)] px-4 py-3 text-[var(--color-danger-800)]">
          <dt className="text-sm font-bold">{t('Stocks bas')}</dt>
          <dd className="num text-3xl font-light">{low}</dd>
        </div>
      </dl>

      <section aria-labelledby="h-own" className="card p-4 sm:p-5">
        <h2 id="h-own" className="text-xl font-bold">
          {own ? own.shortName ?? own.name : t('Stocks par site')}
        </h2>
        {own ? (
          <>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">
              <span className="num">{t('{n} poches', { n: own.total })}</span>
              {own.updatedAt ? ` · ${t('mis à jour {date}', { date: fmtDateTime(own.updatedAt, locale) })}` : ''}
            </p>
            <I18nScope area="sangPartage">
              <OwnStockGrid site={own} />
            </I18nScope>
            <Legend t={t} />
          </>
        ) : (
          <p className="mt-2 text-[var(--fg-muted)]">{t('Votre compte n’est rattaché à aucun site : lecture seule.')}</p>
        )}
      </section>

      <section aria-labelledby="h-others">
        <h2 id="h-others" className="text-xl font-bold">
          {t('Autres sites')}
        </h2>
        {sites === null && <p className="mt-2 text-[var(--fg-muted)]">{t('Stocks indisponibles pour le moment.')}</p>}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((s) => (
            <li key={s.id} className="card p-4">
              <p className="font-bold">{s.shortName ?? s.name}</p>
              <p className="text-sm text-[var(--fg-muted)]">
                {s.commune} · <span className="num font-bold text-[var(--fg)]">{s.total}</span> {t('poches')}
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                {BLOOD_PRODUCTS.map((p) => {
                  const n = BLOOD_GROUPS.reduce((m, g) => m + unitsOf(s, p.value, g), 0);
                  return (
                    <div key={p.value} className="rounded-xl bg-[var(--bg)] px-1 py-1.5">
                      <dt className="text-xs font-bold text-[var(--fg-muted)]">{t(p.short)}</dt>
                      <dd className="num text-lg font-bold">{n}</dd>
                    </div>
                  );
                })}
              </dl>
              <details className="mt-2">
                <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">{t('Détail par groupe')}</summary>
                <ReadOnlyGrid site={s} t={t} />
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Le niveau se lit aussi sans la couleur : un pictogramme pour « critique » et pour « bas ». */
function Legend({ t }: { t: T }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-sm" aria-label={t('Légende des niveaux de stock')}>
      <li className={`pill border ${LEVEL_CLASS.critical}`}>
        <AlertTriangle size={14} aria-hidden /> {t('Critique < {n}', { n: CRITICAL })}
      </li>
      <li className={`pill border ${LEVEL_CLASS.low}`}>
        <ArrowDown size={14} aria-hidden /> {t('Bas < {n}', { n: LOW })}
      </li>
      <li className={`pill border ${LEVEL_CLASS.ok}`}>{t('Suffisant')}</li>
    </ul>
  );
}

function ReadOnlyGrid({ site, t }: { site: StockSite; t: T }) {
  return (
    <table className="mt-1 w-full table-fixed border-separate border-spacing-1 text-sm">
      <caption className="sr-only">{t('Stock de {name} par groupe et produit', { name: site.shortName ?? site.name })}</caption>
      <thead>
        <tr className="text-[var(--fg-muted)]">
          <th scope="col" className="w-12 text-left font-bold">
            <span className="sr-only">{t('Groupe')}</span>
          </th>
          {BLOOD_PRODUCTS.map((p) => (
            <th key={p.value} scope="col" className="text-center font-bold">
              {t(p.short)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BLOOD_GROUPS.map((g) => (
          <tr key={g}>
            <th scope="row" className="num text-left font-bold">
              {g}
            </th>
            {BLOOD_PRODUCTS.map((p) => {
              const u = unitsOf(site, p.value, g);
              return (
                <td key={p.value} className={`num rounded-md border py-0.5 text-center font-bold ${LEVEL_CLASS[level(u)]}`}>
                  {u}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
