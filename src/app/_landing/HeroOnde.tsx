import { Pictogram } from '@/components/Pictogram';
import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';
import { stepped } from './Onde';

export interface HeroChip {
  icon: string;
  label: string;
  chip: string;
  /** Point d'ancrage dans le repère de l'onde (-100 à 100). */
  x: number;
  y: number;
}

/**
 * Hero : l'onde Ganji en radar sur fond Forêt. Le symbole brille au centre, des signaux en partent vers
 * quatre notifications qui apparaissent l'une après l'autre : ce que fait Ganji, avant même de lire.
 * Tout en SVG et CSS (aucune image à télécharger : budget de 200 Ko).
 */
export function HeroOnde({ chips }: { chips: HeroChip[] }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
        <g strokeLinejoin="round">
          <path className="ring-in" style={{ '--i': 0 } as React.CSSProperties} d={stepped(96)} fill="rgb(255 255 255 / 0.035)" stroke="rgb(255 255 255 / 0.1)" strokeWidth="0.4" />
          <path className="ring-in" style={{ '--i': 1 } as React.CSSProperties} d={stepped(76)} fill="rgb(255 255 255 / 0.045)" stroke="rgb(255 255 255 / 0.1)" strokeWidth="0.4" />
          <path className="ring-in" style={{ '--i': 2 } as React.CSSProperties} d={stepped(56)} fill="rgb(95 208 143 / 0.1)" stroke="rgb(95 208 143 / 0.25)" strokeWidth="0.4" />
          <path className="onde-wave" d={stepped(60)} fill="none" stroke="#5FD08F" strokeWidth="0.9" />
          <path className="onde-wave onde-wave-2" d={stepped(60)} fill="none" stroke="#5FD08F" strokeWidth="0.9" />
        </g>
        {chips.map((c, i) => {
          const r = Math.hypot(c.x, c.y);
          const d = `M${((c.x / r) * 40).toFixed(1)} ${((c.y / r) * 40).toFixed(1)} L${c.x} ${c.y}`;
          return (
            <g key={c.label} className="hero-link" style={{ '--i': i } as React.CSSProperties}>
              <path d={d} fill="none" stroke="rgb(95 208 143 / 0.55)" strokeWidth="0.6" strokeDasharray="1.6 2.2" strokeLinecap="round" />
              <circle r="1.8" fill="#5FD08F" className="hero-signal" style={{ offsetPath: `path('${d}')`, '--i': i } as React.CSSProperties} />
            </g>
          );
        })}
        <g className="hero-mark">
          <g transform="translate(-36 -36) scale(0.1385)">
            {SYMBOL_LEAVES.map((leaf, i) => (
              <path key={i} d={leaf} fill="#5FD08F" />
            ))}
          </g>
        </g>
      </svg>
      {chips.map((c, i) => (
        <span key={c.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(c.x + 100) / 2}%`, top: `${(c.y + 100) / 2}%` }}>
          <span
            className="hero-chip flex items-center gap-2 rounded-2xl bg-white py-1.5 pr-3 pl-1.5 text-sm font-semibold whitespace-nowrap text-ink shadow-[0_12px_30px_-12px_rgb(0_0_0_/_0.5)] sm:text-base"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className={`grid h-8 w-8 place-items-center rounded-full ${c.chip}`}>
              <Pictogram name={c.icon} size={16} />
            </span>
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}
