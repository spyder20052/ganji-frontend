import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { T } from '@/i18n/translate';
import { fmtDateTime } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import { BLOOD_GROUPS, BLOOD_PRODUCTS } from '../pro/_lib/labels';
import { getMe } from '../pro/_lib/me';
import type { LiveRequest } from '../pro/sang/[id]/types';
import { AntsRequests } from './AntsRequests';
import { OwnStockGrid } from './OwnStockGrid';
import { CRITICAL, LEVEL_CLASS, LOW, level, unitsOf, type StockSite } from './stock';

export default async function AntsPage() {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const [me, sites, requests] = await Promise.all([getMe(), tryServerApi<StockSite[]>('/blood/stocks'), tryServerApi<LiveRequest[]>('/blood/requests')]);
  const own = sites?.find((s) => s.id === me.facilityId) ?? null;
  const others = (sites ?? []).filter((s) => s.id !== own?.id);
  const openCount = (requests ?? []).filter((r) => ['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE', 'POCHES_RESERVEES'].includes(r.status)).length;
  const vital = (requests ?? []).filter((r) => r.urgency === 'VITALE' && ['OUVERTE', 'DONNEURS_ALERTES'].includes(r.status)).length;
  const national = (sites ?? []).reduce((n, s) => n + s.total, 0);
  const criticalCells = (sites ?? []).reduce((n, s) => n + BLOOD_PRODUCTS.reduce((m, p) => m + BLOOD_GROUPS.filter((g) => unitsOf(s, p.value, g) < CRITICAL).length, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">{t('Stocks et demandes de sang')}</h1>
          <p className="text-[var(--fg-muted)]">{t('Réseau national de transfusion : {n} sites. Les hôpitaux voient ces stocks au moment de leur demande.', { n: sites?.length ?? 0 })}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-[var(--card)] px-4 py-2 ring-1 ring-[var(--border)]">
            <dt className="text-sm font-bold text-[var(--fg-muted)]">{t('Poches (pays)')}</dt>
            <dd className="num text-2xl font-bold">{national}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-danger-50)] px-4 py-2 text-[var(--color-danger-800)]">
            <dt className="text-sm font-bold">{t('Cases critiques')}</dt>
            <dd className="num text-2xl font-bold">{criticalCells}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-ocre-100)] px-4 py-2 text-[var(--color-ocre-700)]">
            <dt className="text-sm font-bold">{t('Demandes ouvertes')}</dt>
            <dd className="num text-2xl font-bold">{openCount}</dd>
          </div>
        </dl>
      </div>

      <section id="stocks" aria-labelledby="h-own" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="h-own" className="flex-1 text-xl font-bold">
            {own ? t('Mon site : {name}', { name: own.shortName ?? own.name }) : t('Stocks par site')}
          </h2>
          <Legend t={t} />
        </div>
        {own ? (
          <>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">
              {own.commune} · {t('{n} poches', { n: own.total })}{own.updatedAt ? ` · ${t('dernière mise à jour {date}', { date: fmtDateTime(own.updatedAt, locale) })}` : ''}
            </p>
            <OwnStockGrid site={own} />
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
          {others.map((s) => {
            const crit = BLOOD_PRODUCTS.flatMap((p) => BLOOD_GROUPS.filter((g) => unitsOf(s, p.value, g) < CRITICAL).map((g) => `${t(p.short)} ${g}`));
            return (
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
                {crit.length > 0 && (
                  <p className="mt-2 text-sm text-[var(--color-danger-800)]">
                    <span className="font-bold">{t('Critique :')}</span> {crit.slice(0, 6).join(', ')}
                    {crit.length > 6 ? ` ${t('et {n} autres', { n: crit.length - 6 })}` : ''}
                  </p>
                )}
                <details className="mt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">{t('Détail par groupe')}</summary>
                  <ReadOnlyGrid site={s} t={t} />
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="demandes" aria-labelledby="h-req" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <h2 id="h-req" className="flex-1 text-xl font-bold">
            {t('Demandes des hôpitaux')}
          </h2>
          {vital > 0 && <p className="text-sm font-bold text-[var(--color-danger-800)]">{t('{n} demande(s) vitale(s) sans donneur', { n: vital })}</p>}
        </div>
        {requests === null ? <p className="mt-2 text-[var(--fg-muted)]">{t('Demandes indisponibles pour le moment.')}</p> : (
          <I18nScope area="sangPartage">
            <AntsRequests initial={requests} own={own} />
          </I18nScope>
        )}
      </section>
    </div>
  );
}

function Legend({ t }: { t: T }) {
  return (
    <ul className="flex flex-wrap gap-2 text-sm" aria-label={t('Légende des niveaux de stock')}>
      <li className={`pill border ${LEVEL_CLASS.critical}`}>{t('Critique < {n}', { n: CRITICAL })}</li>
      <li className={`pill border ${LEVEL_CLASS.low}`}>{t('Bas < {n}', { n: LOW })}</li>
      <li className={`pill border ${LEVEL_CLASS.ok}`}>{t('Suffisant')}</li>
    </ul>
  );
}

function ReadOnlyGrid({ site, t }: { site: StockSite; t: T }) {
  return (
    <table className="mt-1 w-full border-separate border-spacing-1 text-sm">
      <caption className="sr-only">{t('Stock de {name} par groupe et produit', { name: site.shortName ?? site.name })}</caption>
      <thead>
        <tr className="text-left text-[var(--fg-muted)]">
          <th scope="col" className="font-bold">
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
