import { fmtDateTime } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import type { BloodRequestView } from '@/lib/types';
import { BLOOD_GROUPS, BLOOD_PRODUCTS } from '../pro/_lib/labels';
import { getMe } from '../pro/_lib/me';
import { AntsRequests } from './AntsRequests';
import { OwnStockGrid } from './OwnStockGrid';
import { CRITICAL, LEVEL_CLASS, LOW, level, unitsOf, type StockSite } from './stock';

export default async function AntsPage() {
  const [me, sites, requests] = await Promise.all([getMe(), tryServerApi<StockSite[]>('/blood/stocks'), tryServerApi<BloodRequestView[]>('/blood/requests')]);
  const own = sites?.find((s) => s.id === me.facilityId) ?? null;
  const others = (sites ?? []).filter((s) => s.id !== own?.id);
  const openCount = (requests ?? []).filter((r) => ['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE'].includes(r.status)).length;
  const vital = (requests ?? []).filter((r) => r.urgency === 'VITALE' && ['OUVERTE', 'DONNEURS_ALERTES'].includes(r.status)).length;
  const national = (sites ?? []).reduce((n, s) => n + s.total, 0);
  const criticalCells = (sites ?? []).reduce((n, s) => n + BLOOD_PRODUCTS.reduce((m, p) => m + BLOOD_GROUPS.filter((g) => unitsOf(s, p.value, g) < CRITICAL).length, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">Stocks et demandes de sang</h1>
          <p className="text-[var(--fg-muted)]">Réseau national de transfusion : {sites?.length ?? 0} sites. Les hôpitaux voient ces stocks au moment de leur demande.</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-[var(--card)] px-4 py-2 ring-1 ring-[var(--border)]">
            <dt className="text-sm font-bold text-[var(--fg-muted)]">Poches (pays)</dt>
            <dd className="num text-2xl font-bold">{national}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-danger-50)] px-4 py-2 text-[var(--color-danger-800)]">
            <dt className="text-sm font-bold">Cases critiques</dt>
            <dd className="num text-2xl font-bold">{criticalCells}</dd>
          </div>
          <div className="rounded-2xl bg-[var(--color-ocre-100)] px-4 py-2 text-[var(--color-ocre-700)]">
            <dt className="text-sm font-bold">Demandes ouvertes</dt>
            <dd className="num text-2xl font-bold">{openCount}</dd>
          </div>
        </dl>
      </div>

      <section id="stocks" aria-labelledby="h-own" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="h-own" className="flex-1 text-xl font-bold">
            {own ? `Mon site : ${own.shortName ?? own.name}` : 'Stocks par site'}
          </h2>
          <Legend />
        </div>
        {own ? (
          <>
            <p className="mb-3 text-sm text-[var(--fg-muted)]">
              {own.commune} · {own.total} poches{own.updatedAt ? ` · dernière mise à jour ${fmtDateTime(own.updatedAt)}` : ''}
            </p>
            <OwnStockGrid site={own} />
          </>
        ) : (
          <p className="mt-2 text-[var(--fg-muted)]">Votre compte n’est rattaché à aucun site : lecture seule.</p>
        )}
      </section>

      <section aria-labelledby="h-others">
        <h2 id="h-others" className="text-xl font-bold">
          Autres sites
        </h2>
        {sites === null && <p className="mt-2 text-[var(--fg-muted)]">Stocks indisponibles pour le moment.</p>}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((s) => {
            const crit = BLOOD_PRODUCTS.flatMap((p) => BLOOD_GROUPS.filter((g) => unitsOf(s, p.value, g) < CRITICAL).map((g) => `${p.short} ${g}`));
            return (
              <li key={s.id} className="card p-4">
                <p className="font-bold">{s.shortName ?? s.name}</p>
                <p className="text-sm text-[var(--fg-muted)]">
                  {s.commune} · <span className="num font-bold text-[var(--fg)]">{s.total}</span> poches
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  {BLOOD_PRODUCTS.map((p) => {
                    const n = BLOOD_GROUPS.reduce((m, g) => m + unitsOf(s, p.value, g), 0);
                    return (
                      <div key={p.value} className="rounded-xl bg-[var(--bg)] px-1 py-1.5">
                        <dt className="text-xs font-bold text-[var(--fg-muted)]">{p.short}</dt>
                        <dd className="num text-lg font-bold">{n}</dd>
                      </div>
                    );
                  })}
                </dl>
                {crit.length > 0 && (
                  <p className="mt-2 text-sm text-[var(--color-danger-800)]">
                    <span className="font-bold">Critique :</span> {crit.slice(0, 6).join(', ')}
                    {crit.length > 6 ? ` et ${crit.length - 6} autres` : ''}
                  </p>
                )}
                <details className="mt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold">Détail par groupe</summary>
                  <ReadOnlyGrid site={s} />
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="demandes" aria-labelledby="h-req" className="card scroll-mt-24 p-5">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <h2 id="h-req" className="flex-1 text-xl font-bold">
            Demandes des hôpitaux
          </h2>
          {vital > 0 && <p className="text-sm font-bold text-[var(--color-danger-800)]">{vital} demande(s) vitale(s) sans donneur</p>}
        </div>
        {requests === null ? <p className="mt-2 text-[var(--fg-muted)]">Demandes indisponibles pour le moment.</p> : <AntsRequests initial={requests} />}
      </section>
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-2 text-sm" aria-label="Légende des niveaux de stock">
      <li className={`pill border ${LEVEL_CLASS.critical}`}>Critique &lt; {CRITICAL}</li>
      <li className={`pill border ${LEVEL_CLASS.low}`}>Bas &lt; {LOW}</li>
      <li className={`pill border ${LEVEL_CLASS.ok}`}>Suffisant</li>
    </ul>
  );
}

function ReadOnlyGrid({ site }: { site: StockSite }) {
  return (
    <table className="mt-1 w-full border-separate border-spacing-1 text-sm">
      <caption className="sr-only">Stock de {site.shortName ?? site.name} par groupe et produit</caption>
      <thead>
        <tr className="text-left text-[var(--fg-muted)]">
          <th scope="col" className="font-bold">
            <span className="sr-only">Groupe</span>
          </th>
          {BLOOD_PRODUCTS.map((p) => (
            <th key={p.value} scope="col" className="text-center font-bold">
              {p.short}
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
