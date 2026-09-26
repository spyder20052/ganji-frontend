'use client';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Megaphone, Radio, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertCard } from '@/components/AlertCard';
import { CommuneSelect } from '@/components/CommuneSelect';
import { MapView, type MapMarker } from '@/components/MapView';
import { Pictogram } from '@/components/Pictogram';
import { useLocale, useT } from '@/i18n/client';
import { INTL, type Locale } from '@/i18n/translate';
import { api, ApiError } from '@/lib/api';
import { ALERT_KIND, SEVERITY, type CommunityReport, type HealthAlert } from '@/lib/alerts';
import { fmtDateTime, fmtTime } from '@/lib/format';
import { escapeHtml, MAP_COLORS } from '@/lib/places';

type Masked = number | '<10';

interface DeptRow {
  code: string;
  name: string;
  lat: number;
  lng: number;
  bloodUnits: number;
  bloodSites: number;
  openBloodRequests: number;
  medicationRuptures: number;
  patientsFollowed: Masked;
  communityCases7d: number;
}

export interface National {
  generatedAt: string;
  anonymization: { minCell: number; note: string };
  kpis: {
    bloodRequests30d: number;
    medianMinutesToDonor: number | null;
    teleExpertiseWithin48h: number | null;
    teleExpertisePending: number;
    patientsFollowed: Masked;
    activeAlerts: number;
    pharmacyRuptures: number;
    essentialMedicines: number;
  };
  departments: DeptRow[];
  topRuptures: { medication: string; pharmacies: number }[];
}

const POLL_MS = 10_000;

const fmtMasked = (v: Masked, locale: Locale) => (v === '<10' ? '< 10' : v.toLocaleString(INTL[locale]));
const sortValue = (v: number | string) => (v === '<10' ? 5 : v);

function ruptureColor(n: number) {
  if (n === 0) return MAP_COLORS.brand;
  if (n <= 3) return MAP_COLORS.ocre;
  return MAP_COLORS.danger;
}

export function Dashboard({ initial }: { initial: National | null }) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<National | null>(initial);
  const [alerts, setAlerts] = useState<HealthAlert[] | null>(null);
  const [reports, setReports] = useState<CommunityReport[] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<string | null>(initial?.generatedAt ?? null);
  const [problem, setProblem] = useState<'session' | 'network' | null>(null);
  const seen = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [d, a, r] = await Promise.all([
        api<National>('/dashboard/national'),
        api<HealthAlert[]>('/alerts'),
        api<CommunityReport[]>('/community-reports?days=14'),
      ]);
      setData(d);
      setReports(r);
      setUpdatedAt(d.generatedAt);
      // Repère les alertes apparues depuis l'ouverture de la page (ex. regroupement détecté).
      if (seen.current) {
        const known = seen.current;
        const added = a.filter((x) => !known.has(x.id)).map((x) => x.id);
        if (added.length) setFresh((f) => new Set([...f, ...added]));
      }
      seen.current = new Set(a.map((x) => x.id));
      setAlerts(a);
      setProblem(null);
    } catch (e) {
      setProblem(e instanceof ApiError && (e.status === 401 || e.status === 403) ? 'session' : 'network');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const k = data?.kpis;
  const [liveBefore, liveAfter] = t('En direct · mis à jour à {time} · toutes les 10 s').split('{time}');

  return (
    <>
      {/* Le titre (PageHead) est rendu par la page ; ici, l'état du direct. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="flex items-center gap-2 text-base text-[var(--fg-muted)]" aria-live="off">
          <span className="relative flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-brand-500)] opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-brand-500)]" />
          </span>
          <span>
            {liveBefore}
            <span className="num">{updatedAt ? fmtTime(updatedAt, locale) : '—'}</span>
            {liveAfter}
          </span>
        </p>
      </div>

      {problem === 'session' && (
        <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-4 font-bold text-[var(--color-ocre-700)]">
          {t('Session expirée.')} <Link href="/connexion" className="underline">{t('Se reconnecter')}</Link>
        </p>
      )}
      {problem === 'network' && (
        <p role="status" className="rounded-2xl bg-[var(--color-ocre-100)] p-4 font-bold text-[var(--color-ocre-700)]">
          {t('Connexion à l’API perdue : nouvelle tentative dans 10 s. Les chiffres affichés sont les derniers reçus.')}
        </p>
      )}

      {!data ? (
        <p className="flex items-center gap-2 text-[var(--fg-muted)]" role="status"><Loader2 className="animate-spin" aria-hidden /> {t('Chargement des indicateurs…')}</p>
      ) : (
        <>
          <section aria-labelledby="h-kpi" className="space-y-3">
            <h2 id="h-kpi" className="sr-only">{t('Indicateurs clés')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon="blood" tone="danger" label={t('Demandes de sang')} sub={t('30 derniers jours')} value={k!.bloodRequests30d.toLocaleString(INTL[locale])} />
              <Kpi
                icon="calendar"
                label={t('Délai médian demande → donneur')}
                sub={t('premier donneur qui accepte')}
                value={k!.medianMinutesToDonor != null ? k!.medianMinutesToDonor.toLocaleString(INTL[locale]) : '—'}
                unit={k!.medianMinutesToDonor != null ? 'min' : undefined}
              />
              <Kpi
                icon="stethoscope"
                label={t('Télé-expertises < 48 h')}
                sub={t('{n} en attente de réponse', { n: k!.teleExpertisePending })}
                value={k!.teleExpertiseWithin48h != null ? String(k!.teleExpertiseWithin48h) : '—'}
                unit={k!.teleExpertiseWithin48h != null ? '%' : undefined}
              />
              <Kpi icon="people" label={t('Patients suivis')} sub={t('carnet Ganji actif')} value={fmtMasked(k!.patientsFollowed, locale)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SmallTile label={t('Alertes actives')} value={k!.activeAlerts} href="#alertes" />
              <SmallTile label={t('Ruptures en pharmacie')} value={k!.pharmacyRuptures} hint={t('lignes de stock à zéro')} />
              <SmallTile label={t('Médicaments essentiels suivis')} value={k!.essentialMedicines} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <DeptMap departments={data.departments} />
            <section aria-labelledby="h-rup" className="card space-y-3 p-5">
              <h2 id="h-rup" className="flex items-center gap-2 text-xl font-bold"><Pictogram name="pill" size={22} /> {t('Ruptures les plus fréquentes')}</h2>
              {data.topRuptures.length === 0 ? (
                <p className="text-[var(--fg-muted)]">{t('Aucune rupture signalée.')}</p>
              ) : (
                <ol className="space-y-2">
                  {data.topRuptures.map((r, i) => {
                    const max = data.topRuptures[0].pharmacies || 1;
                    return (
                      <li key={r.medication} className="space-y-1">
                        <div className="flex items-baseline justify-between gap-3 text-base">
                          <span><span className="num text-[var(--fg-muted)]">{i + 1}.</span> {r.medication.replace(/(\d) (mg|g|ml|µg)\b/g, '$1\u00a0$2')}</span>
                          <span className="num shrink-0 font-bold">{t('{n} pharm.', { n: r.pharmacies })}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg)]" aria-hidden>
                          <div className="h-2 rounded-full bg-[var(--color-ocre-500)]" style={{ width: `${(100 * r.pharmacies) / max}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>

          <DeptTable departments={data.departments} />
        </>
      )}

      <section id="alertes" aria-labelledby="h-alerts" className="scroll-mt-24 space-y-4">
        <h2 id="h-alerts" className="flex items-center gap-2 text-2xl font-bold"><Megaphone size={26} aria-hidden /> {t('Alertes sanitaires')}</h2>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {!alerts && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
            {alerts?.length === 0 && <p className="text-[var(--fg-muted)]">{t('Aucune alerte active.')}</p>}
            {alerts && (
              <div className="space-y-3" aria-live="polite">
                {[...alerts]
                  .sort((a, b) => Number(b.auto) - Number(a.auto) || +new Date(b.createdAt) - +new Date(a.createdAt))
                  .map((a) => (
                    <AlertCard key={a.id} alert={a} fresh={fresh.has(a.id)} listen={false} />
                  ))}
              </div>
            )}
          </div>
          <NewAlertForm onCreated={refresh} />
        </div>
      </section>

      <Reports reports={reports} />

      <footer className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-base text-[var(--fg-muted)]">
        <p className="font-bold text-[var(--fg)]">{t('Anonymisation')}</p>
        <p>
          {t(data?.anonymization.note ?? 'Agrégats uniquement ; toute cellule inférieure à 10 est masquée.')}{' '}
          {t('Seuil minimal : {n} personnes par cellule.', { n: data?.anonymization.minCell ?? 10 })}{' '}
          {t('Aucune donnée nominative n’est transmise à cet écran ; les signalements communautaires ne contiennent ni nom ni numéro de patient.')}
        </p>
      </footer>
    </>
  );
}

function Kpi({ icon, label, sub, value, unit, tone }: { icon: string; label: string; sub: string; value: string; unit?: string; tone?: 'danger' }) {
  return (
    <div className="card space-y-2 p-5">
      <div className="flex items-center gap-2">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone === 'danger' ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
          <Pictogram name={icon} size={22} />
        </span>
        <p className="text-base font-bold leading-tight">{label}</p>
      </div>
      <p className="num text-5xl font-bold leading-none">
        {value}
        {unit && <span className="ml-1 text-2xl text-[var(--fg-muted)]">{unit}</span>}
      </p>
      <p className="text-sm text-[var(--fg-muted)]">{sub}</p>
    </div>
  );
}

function SmallTile({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const locale = useLocale();
  const body: ReactNode = (
    <>
      <p className="num text-3xl font-bold">{value.toLocaleString(INTL[locale])}</p>
      <p className="text-base font-bold">{label}</p>
      {hint && <p className="text-sm text-[var(--fg-muted)]">{hint}</p>}
    </>
  );
  return href ? (
    <a href={href} className="card block p-4 hover:shadow-sm">{body}</a>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

function DeptMap({ departments: fresh }: { departments: DeptRow[] }) {
  const t = useT();
  // Actualisation toutes les 10 s : on ne redessine les cercles (et ne ferme une bulle ouverte)
  // que si les valeurs ont réellement changé.
  const key = JSON.stringify(fresh.map((d) => [d.code, d.bloodUnits, d.bloodSites, d.openBloodRequests, d.medicationRuptures, d.communityCases7d]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const departments = useMemo(() => fresh, [key]);
  const markers: MapMarker[] = useMemo(() => {
    const max = Math.max(1, ...departments.map((d) => d.bloodUnits));
    return departments.map((d) => ({
      id: d.code,
      lat: d.lat,
      lng: d.lng,
      label: t('{name} : {units} poches, {ruptures} ruptures', { name: d.name, units: d.bloodUnits, ruptures: d.medicationRuptures }),
      color: ruptureColor(d.medicationRuptures),
      radius: 8 + Math.round(22 * Math.sqrt(d.bloodUnits / max)),
      popupHtml:
        `<strong>${escapeHtml(d.name)}</strong><br>` +
        `${escapeHtml(t(d.bloodSites > 1 ? 'Poches de sang : {units} ({sites} sites)' : 'Poches de sang : {units} ({sites} site)', { units: d.bloodUnits, sites: d.bloodSites }))}<br>` +
        `${escapeHtml(t('Demandes de sang ouvertes : {n}', { n: d.openBloodRequests }))}<br>` +
        `${escapeHtml(t('Ruptures en pharmacie : {n}', { n: d.medicationRuptures }))}<br>` +
        escapeHtml(t('Cas communautaires (7 j) : {n}', { n: d.communityCases7d })),
    }));
  }, [departments, t]);

  return (
    <section aria-labelledby="h-map" className="card space-y-3 p-4">
      <h2 id="h-map" className="text-xl font-bold">{t('Sang et médicaments par département')}</h2>
      <MapView markers={markers} center={[9.3, 2.3]} zoom={6} height={440} label={t('Carte des départements : taille = poches de sang, couleur = ruptures')} />
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--fg-muted)]">
        <span>{t('Taille du cercle : poches de sang en stock')}</span>
        {[
          [MAP_COLORS.brand, '0 rupture'],
          [MAP_COLORS.ocre, '1 à 3 ruptures'],
          [MAP_COLORS.danger, 'plus de 3 ruptures'],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ background: c }} /> {t(l)}</span>
        ))}
      </div>
      <p className="text-sm text-[var(--fg-muted)]">{t('Carte par cercles : polygones des départements (geoBoundaries) à intégrer.')}</p>
    </section>
  );
}

type SortKey = keyof Pick<DeptRow, 'name' | 'bloodUnits' | 'bloodSites' | 'openBloodRequests' | 'medicationRuptures' | 'patientsFollowed' | 'communityCases7d'>;

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'name', label: 'Département', numeric: false },
  { key: 'bloodUnits', label: 'Poches de sang', numeric: true },
  { key: 'bloodSites', label: 'Sites de transfusion', numeric: true },
  { key: 'openBloodRequests', label: 'Demandes de sang ouvertes', numeric: true },
  { key: 'medicationRuptures', label: 'Ruptures pharmacie', numeric: true },
  { key: 'patientsFollowed', label: 'Patients suivis', numeric: true },
  { key: 'communityCases7d', label: 'Cas communautaires 7 j', numeric: true },
];

function DeptTable({ departments }: { departments: DeptRow[] }) {
  const t = useT();
  const locale = useLocale();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  const rows = useMemo(
    () =>
      [...departments].sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        if (sort.key === 'name') return String(va).localeCompare(String(vb), 'fr') * sort.dir;
        return ((sortValue(va) as number) - (sortValue(vb) as number)) * sort.dir;
      }),
    [departments, sort],
  );
  const totals = useMemo(
    () => ({
      bloodUnits: departments.reduce((n, d) => n + d.bloodUnits, 0),
      bloodSites: departments.reduce((n, d) => n + d.bloodSites, 0),
      openBloodRequests: departments.reduce((n, d) => n + d.openBloodRequests, 0),
      medicationRuptures: departments.reduce((n, d) => n + d.medicationRuptures, 0),
      communityCases7d: departments.reduce((n, d) => n + d.communityCases7d, 0),
    }),
    [departments],
  );

  return (
    <section aria-labelledby="h-table" className="card space-y-3 p-4">
      <h2 id="h-table" className="text-xl font-bold">{t('Par département')}</h2>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[760px] border-collapse text-base">
          <caption className="sr-only">{t('Indicateurs par département, triables')}</caption>
          <thead>
            <tr className="border-b border-[var(--border)]">
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'} className={`py-2 ${c.numeric ? 'text-right' : 'text-left'}`}>
                    <button
                      type="button"
                      onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.numeric ? -1 : 1 }))}
                      className={`inline-flex min-h-11 items-center gap-1 text-sm font-bold ${active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}
                    >
                      {t(c.label)}
                      {active ? (sort.dir === 1 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />) : <ArrowUpDown size={14} aria-hidden />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.code} className="border-b border-[var(--border)] last:border-0">
                <th scope="row" className="py-2 text-left font-bold">{d.name}</th>
                <td className="num py-2 text-right">{d.bloodUnits}</td>
                <td className="num py-2 text-right">{d.bloodSites}</td>
                <td className="num py-2 text-right">{d.openBloodRequests}</td>
                <td className="num py-2 text-right">
                  <span className={d.medicationRuptures > 3 ? 'font-bold text-[var(--color-danger-600)]' : d.medicationRuptures > 0 ? 'font-bold text-[var(--color-ocre-700)]' : ''}>{d.medicationRuptures}</span>
                </td>
                <td className="num py-2 text-right" title={d.patientsFollowed === '<10' ? t('Valeur masquée : moins de 10 personnes') : undefined}>{fmtMasked(d.patientsFollowed, locale)}</td>
                <td className="num py-2 text-right">{d.communityCases7d}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--border)] font-bold">
              <th scope="row" className="py-2 text-left">{t('Total')}</th>
              <td className="num py-2 text-right">{totals.bloodUnits}</td>
              <td className="num py-2 text-right">{totals.bloodSites}</td>
              <td className="num py-2 text-right">{totals.openBloodRequests}</td>
              <td className="num py-2 text-right">{totals.medicationRuptures}</td>
              <td className="py-2 text-right text-sm font-normal text-[var(--fg-muted)]">{t('voir en-tête')}</td>
              <td className="num py-2 text-right">{totals.communityCases7d}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-sm text-[var(--fg-muted)]">{t('« < 10 » : valeur masquée pour protéger l’anonymat (moins de 10 personnes).')}</p>
    </section>
  );
}

const KINDS = Object.entries(ALERT_KIND);
const SEVERITIES = Object.entries(SEVERITY);

function NewAlertForm({ onCreated }: { onCreated: () => void }) {
  const t = useT();
  const [kind, setKind] = useState('EPIDEMIE');
  const [severity, setSeverity] = useState('ATTENTION');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [communes, setCommunes] = useState<string[]>([]);
  const [pick, setPick] = useState('');
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await api<{ id: string; broadcast: number }>('/alerts', {
        method: 'POST',
        json: { kind, severity, title: title.trim(), message: message.trim(), communes, days },
      });
      const vars = { n: r.broadcast, communes: communes.join(', ') };
      const text = communes.length
        ? r.broadcast > 1
          ? t('Alerte publiée. {n} SMS envoyés aux habitants inscrits de {communes}.', vars)
          : t('Alerte publiée. {n} SMS envoyé aux habitants inscrits de {communes}.', vars)
        : r.broadcast > 1
          ? t('Alerte publiée. {n} SMS envoyés aux habitants inscrits.', vars)
          : t('Alerte publiée. {n} SMS envoyé aux habitants inscrits.', vars);
      setResult({ ok: true, text });
      setTitle('');
      setMessage('');
      setCommunes([]);
      onCreated();
    } catch (err) {
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const valid = title.trim().length >= 4 && message.trim().length >= 10;

  return (
    <form onSubmit={submit} className="card h-fit space-y-4 p-5" aria-labelledby="h-new-alert">
      <h3 id="h-new-alert" className="flex items-center gap-2 text-lg font-bold"><Radio size={22} aria-hidden /> {t('Nouvelle alerte')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-1.5 block">{t('Type')}</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map(([k, v]) => <option key={k} value={k}>{t(v.label)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">{t('Durée (jours)')}</span>
          <input type="number" min={1} max={90} className="input num" value={days} onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
      </div>
      <fieldset>
        <legend className="label mb-1.5">{t('Gravité')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITIES.map(([k, v]) => (
            <label key={k} className={`btn !min-h-11 cursor-pointer !px-2 text-base ${severity === k ? v.pill : 'btn-ghost'}`}>
              <input type="radio" name="severity" value={k} checked={severity === k} onChange={() => setSeverity(k)} className="sr-only" />
              {t(v.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label mb-1.5 block">{t('Titre')}</span>
        <input className="input" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} placeholder={t('Ex. Cas de choléra à Sô-Ava')} required minLength={4} />
      </label>
      <label className="block">
        <span className="label mb-1.5 block">{t('Message (sans donnée médicale personnelle)')}</span>
        <textarea className="input min-h-28 py-3" value={message} maxLength={400} onChange={(e) => setMessage(e.target.value)} required minLength={10} placeholder={t('Consigne claire : quoi faire, où aller.')} />
        <span className="num block text-right text-sm text-[var(--fg-muted)]">{message.length}/400</span>
      </label>
      <div className="space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <CommuneSelect id="alert-target" value={pick} onChange={(n) => setPick(n)} label={t('Communes ciblées')} placeholder={t('Choisir une commune')} />
          </div>
          <button type="button" className="btn btn-soft" disabled={!pick || communes.includes(pick)} onClick={() => { setCommunes([...communes, pick]); setPick(''); }}>
            {t('Ajouter')}
          </button>
        </div>
        {communes.length ? (
          <ul className="flex flex-wrap gap-2">
            {communes.map((c) => (
              <li key={c} className="pill border border-[var(--border)]">
                {c}
                <button type="button" onClick={() => setCommunes(communes.filter((x) => x !== c))} aria-label={t('Retirer {name}', { name: c })} className="-mr-1 grid h-7 w-7 place-items-center rounded-full">
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--fg-muted)]">{t('Aucune commune : alerte nationale.')}</p>
        )}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={busy || !valid}>
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Megaphone size={20} aria-hidden />} {t('Publier et diffuser par SMS')}
      </button>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={`rounded-2xl p-3 text-base font-bold ${result.ok ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}>
          {result.text}
        </p>
      )}
    </form>
  );
}

function Reports({ reports }: { reports: CommunityReport[] | null }) {
  const t = useT();
  const locale = useLocale();
  // Regroupements visibles à l'œil : même syndrome, même commune, 3 signalements ou plus sur 7 jours.
  const clusters = useMemo(() => {
    const since = Date.now() - 7 * 86_400_000;
    const count = new Map<string, number>();
    for (const r of reports ?? []) {
      if (+new Date(r.at) < since) continue;
      const key = `${r.commune}|${r.syndrome}`;
      count.set(key, (count.get(key) ?? 0) + 1);
    }
    return new Set([...count].filter(([, n]) => n >= 3).map(([key]) => key));
  }, [reports]);

  return (
    <section id="signalements" aria-labelledby="h-reports" className="scroll-mt-24 space-y-3">
      <h2 id="h-reports" className="flex items-center gap-2 text-2xl font-bold"><Pictogram name="people" size={26} /> {t('Signalements communautaires')} <span className="text-base font-normal text-[var(--fg-muted)]">{t('(14 jours)')}</span></h2>
      {!reports && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
      {reports?.length === 0 && <p className="text-[var(--fg-muted)]">{t('Aucun signalement sur la période.')}</p>}
      {reports && reports.length > 0 && (
        <div className="card overflow-x-auto p-4" tabIndex={0} role="region" aria-label={t('Tableau des signalements, défilable horizontalement')}>
          <table className="w-full min-w-[680px] border-collapse text-base">
            <caption className="sr-only">{t('Signalements des relais communautaires, du plus récent au plus ancien')}</caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
                <th scope="col" className="py-2">{t('Date')}</th>
                <th scope="col" className="py-2">{t('Commune · village')}</th>
                <th scope="col" className="py-2">{t('Syndrome')}</th>
                <th scope="col" className="py-2 text-right">{t('Cas')}</th>
                <th scope="col" className="py-2">{t('Relais')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const cluster = clusters.has(`${r.commune}|${r.syndrome}`);
                return (
                  <tr key={r.id} className={`border-b border-[var(--border)] last:border-0 ${cluster ? 'bg-[var(--color-ocre-100)]/50' : ''}`}>
                    <td className="num py-2 pr-3 text-sm">{fmtDateTime(r.at, locale)}</td>
                    <td className="py-2 pr-3">
                      <span className="font-bold">{r.commune}</span>
                      {r.village ? <span className="text-[var(--fg-muted)]"> · {r.village}</span> : null}
                    </td>
                    <td className="py-2 pr-3">
                      {t(r.label)}
                      {cluster && <span className="pill ml-2 bg-[var(--color-ocre-500)] text-[var(--color-ink)]">{t('regroupement')}</span>}
                    </td>
                    <td className="num py-2 text-right font-bold">{r.cases}</td>
                    <td className="py-2 pl-3 text-sm text-[var(--fg-muted)]">{r.relay ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
