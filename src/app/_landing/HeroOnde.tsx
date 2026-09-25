import { Pictogram } from '@/components/Pictogram';
import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';

export interface HeroChip {
  icon: string;
  label: string;
  chip: string;
  /** Point d'ancrage dans le repère de l'onde (-100 à 100). */
  x: number;
  y: number;
}

/** Carré en escalier (deux marches par angle), comme l'onde de la charte (planches 05 et 12). */
function stepped(h: number) {
  const d = h * 0.2;
  const p: [number, number][] = [
    [-h + 2 * d, -h], [h - 2 * d, -h], [h - 2 * d, -h + d], [h - d, -h + d], [h - d, -h + 2 * d], [h, -h + 2 * d],
    [h, h - 2 * d], [h - d, h - 2 * d], [h - d, h - d], [h - 2 * d, h - d], [h - 2 * d, h], [-h + 2 * d, h],
    [-h + 2 * d, h - d], [-h + d, h - d], [-h + d, h - 2 * d], [-h, h - 2 * d], [-h, -h + 2 * d], [-h + d, -h + 2 * d],
    [-h + d, -h + d], [-h + 2 * d, -h + d],
  ];
  return `M${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
}

/** L'onde de l'affiche de la charte : carrés en escalier pleins, du vert profond au Vert Ganji. */
const LAYERS = [
  { h: 98, fill: '#0f4b35' },
  { h: 82, fill: '#12603f' },
  { h: 66, fill: '#157549' },
  { h: 50, fill: '#168a56' },
];

/**
 * Hero : l'onde Ganji telle que la dessine l'affiche de la charte. Elle s'ouvre une fois depuis le centre,
 * un trait part du symbole vers chaque notification, qui apparaît puis reste immobile. Aucun mouvement
 * en boucle. Tout en SVG et CSS (aucune image à télécharger : budget de 200 Ko).
 */
export function HeroOnde({ chips }: { chips: HeroChip[] }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
        {LAYERS.map((l, i) => (
          <path key={l.h} className="onde-layer" style={{ '--i': LAYERS.length - 1 - i } as React.CSSProperties} d={stepped(l.h)} fill={l.fill} />
        ))}
        <rect className="onde-layer" style={{ '--i': 0 } as React.CSSProperties} x="-33" y="-33" width="66" height="66" rx="9" fill="#0b3d2c" />
        {chips.map((c, i) => {
          const r = Math.hypot(c.x, c.y);
          return (
            <line
              key={c.label}
              className="hero-link"
              style={{ '--i': i } as React.CSSProperties}
              pathLength={1}
              x1={((c.x / r) * 36).toFixed(1)}
              y1={((c.y / r) * 36).toFixed(1)}
              x2={c.x}
              y2={c.y}
              stroke="#5FD08F"
              strokeWidth="0.7"
              strokeLinecap="round"
            />
          );
        })}
        <g className="hero-mark">
          <g transform="translate(-24 -24) scale(0.0923)">
            {SYMBOL_LEAVES.map((leaf, i) => (
              <path key={i} d={leaf} fill="#5FD08F" />
            ))}
          </g>
        </g>
      </svg>
      {chips.map((c, i) => (
        <span key={c.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${(c.x + 100) / 2}%`, top: `${(c.y + 100) / 2}%` }}>
          <span
            className="hero-chip flex items-center gap-2 rounded-2xl bg-white py-1.5 pr-3.5 pl-1.5 text-sm font-semibold whitespace-nowrap text-ink shadow-[0_14px_30px_-14px_rgb(0_0_0_/_0.55)] sm:text-base"
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
