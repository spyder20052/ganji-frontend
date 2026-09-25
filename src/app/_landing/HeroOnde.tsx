import { Pictogram } from '@/components/Pictogram';
import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';

export interface HeroChip {
  icon: string;
  label: string;
  chip: string;
  /** Position de départ sur l'orbite, en degrés (0 : à droite du symbole, sens des aiguilles d'une montre). */
  angle: number;
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

const vars = (v: Record<string, string | number>) => v as React.CSSProperties;

/**
 * Hero : l'onde Ganji de l'affiche de la charte. Elle s'ouvre une fois depuis le centre, puis les
 * notifications tournent lentement autour du symbole, chacune reliée à lui par son fil (texte toujours
 * droit). Au survol du symbole, ses feuilles s'écartent et l'onde se propage ; la ronde s'arrête pour
 * qu'on puisse lire. Trois couches superposées : l'onde, les fils, le symbole, puis les notifications.
 * Tout en SVG et CSS (aucune image à télécharger : budget de 200 Ko).
 */
export function HeroOnde({ chips }: { chips: HeroChip[] }) {
  return (
    <div className="hero-onde relative mx-auto aspect-square w-full max-w-[560px]">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" className="absolute inset-0 h-full w-full overflow-visible">
        {LAYERS.map((l, i) => (
          <g key={l.h} className="onde-ripple" style={vars({ '--k': LAYERS.length - i })}>
            <path className="onde-layer" style={vars({ '--i': LAYERS.length - 1 - i })} d={stepped(l.h)} fill={l.fill} />
          </g>
        ))}
      </svg>
      <div className="hero-orbit absolute inset-0">
        {chips.map((c, i) => (
          <div key={c.label} className="orbit-arm" style={vars({ '--a': `${c.angle}deg` })}>
            <span className="hero-link" style={vars({ '--i': i })} />
          </div>
        ))}
      </div>
      <svg viewBox="-100 -100 200 200" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <g className="hero-core">
          <g className="core-plate">
            <rect className="onde-layer" style={vars({ '--i': 0 })} x="-33" y="-33" width="66" height="66" rx="9" fill="#0b3d2c" />
          </g>
          <g className="hero-mark">
            <g transform="translate(-24 -24) scale(0.0923)">
              {SYMBOL_LEAVES.map((leaf, i) => (
                <path key={i} className={`mark-leaf mark-leaf-${i}`} d={leaf} fill="#5FD08F" />
              ))}
            </g>
          </g>
        </g>
      </svg>
      <div className="hero-orbit pointer-events-none absolute inset-0">
        {chips.map((c, i) => (
          <div key={c.label} className="orbit-arm" style={vars({ '--a': `${c.angle}deg` })}>
            <span className="orbit-chip">
              <span
                className="hero-chip pointer-events-auto flex w-max items-center gap-1.5 rounded-2xl bg-white py-1 pr-2.5 pl-1 text-[0.75rem] leading-tight font-semibold text-ink shadow-[0_14px_30px_-14px_rgb(0_0_0_/_0.55)] sm:gap-2 sm:py-1.5 sm:pr-3.5 sm:pl-1.5 sm:text-sm xl:text-base"
                style={vars({ '--i': i })}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full sm:h-8 sm:w-8 ${c.chip}`}>
                  <Pictogram name={c.icon} size={16} />
                </span>
                {c.label}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
