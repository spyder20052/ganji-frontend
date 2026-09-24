import { fmtDate } from '@/lib/format';
import type { Series } from '@/lib/types';

/** Courbe d'évolution avec zone de référence (normale) : SVG pur, aucun script. */
export function LineChart({ series, height = 180 }: { series: Series; height?: number }) {
  const W = 640;
  const H = height;
  const P = { t: 16, r: 16, b: 28, l: 44 };
  const pts = series.points;
  if (!pts.length) return <p className="text-[var(--fg-muted)]">Aucune mesure.</p>;
  const xs = pts.map((p) => new Date(p.date).getTime());
  const vals = pts.map((p) => p.value);
  const lo = Math.min(...vals, series.refLow ?? Infinity);
  const hi = Math.max(...vals, series.refHigh ?? -Infinity);
  const pad = (hi - lo) * 0.12 || 1;
  const yMin = Math.max(0, lo - pad);
  const yMax = hi + pad;
  const x = (t: number) => P.l + ((t - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(xs[i]).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const lastLow = series.refLow != null && last.value < series.refLow;
  const lastHigh = series.refHigh != null && last.value > series.refHigh;
  const ticks = [yMin, (yMin + yMax) / 2, yMax];
  const fmt = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1));

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${series.label} : dernière valeur ${last.value} ${series.unit}`}>
        {series.refLow != null && series.refHigh != null && (
          <rect x={P.l} width={W - P.l - P.r} y={y(Math.min(series.refHigh, yMax))} height={Math.max(0, y(Math.max(series.refLow, yMin)) - y(Math.min(series.refHigh, yMax)))} fill="var(--color-brand-100)" opacity="0.7" />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--fg-muted)">{fmt(t)}</text>
          </g>
        ))}
        <path d={d} fill="none" stroke="var(--color-brand-900)" strokeWidth="2.5" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(xs[i])} cy={y(p.value)} r={i === pts.length - 1 ? 5 : 2.5} fill={i === pts.length - 1 && (lastLow || lastHigh) ? 'var(--color-danger-600)' : 'var(--color-brand-900)'} />
        ))}
        <text x={P.l} y={H - 6} fontSize="12" fill="var(--fg-muted)">{fmtDate(pts[0].date, { month: 'short', year: '2-digit' })}</text>
        <text x={W - P.r} y={H - 6} textAnchor="end" fontSize="12" fill="var(--fg-muted)">{fmtDate(last.date, { day: 'numeric', month: 'short' })}</text>
      </svg>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-[var(--fg-muted)]">
        <span>Zone verte : valeurs de référence {series.refLow != null ? `(${series.refLow}–${series.refHigh} ${series.unit})` : ''}</span>
        <span className={`num font-bold ${lastLow || lastHigh ? 'text-[var(--color-danger-600)]' : 'text-[var(--fg)]'}`}>
          Dernière : {last.value} {series.unit} {lastLow ? '· basse' : lastHigh ? '· haute' : ''}
        </span>
      </figcaption>
    </figure>
  );
}
