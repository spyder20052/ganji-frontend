import { GanjiSymbol } from '@/components/GanjiSymbol';

/** Carré en escalier (deux marches par angle), comme l'onde de la charte (planches 05 et 12). */
function stepped(h: number) {
  const d = h * 0.2;
  const p: [number, number][] = [
    [-h + 2 * d, -h],
    [h - 2 * d, -h],
    [h - 2 * d, -h + d],
    [h - d, -h + d],
    [h - d, -h + 2 * d],
    [h, -h + 2 * d],
    [h, h - 2 * d],
    [h - d, h - 2 * d],
    [h - d, h - d],
    [h - 2 * d, h - d],
    [h - 2 * d, h],
    [-h + 2 * d, h],
    [-h + 2 * d, h - d],
    [-h + d, h - d],
    [-h + d, h - 2 * d],
    [-h, h - 2 * d],
    [-h, -h + 2 * d],
    [-h + d, -h + 2 * d],
    [-h + d, -h + d],
    [-h + 2 * d, -h + d],
  ];
  return `M${p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
}

/**
 * Élément signature : l'onde Ganji. Des carrés en escalier concentriques autour du symbole, et deux
 * ondes qui partent du centre : le soin qui atteint chacun, même sans réseau. Immobile si
 * l'utilisateur a demandé moins d'animations.
 */
export function Onde({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <svg viewBox="-100 -100 200 200" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <g strokeLinejoin="round">
          <path d={stepped(96)} fill="var(--color-brand-100)" />
          <path d={stepped(76)} fill="#d6e7db" />
          <path d={stepped(56)} fill="var(--color-sage)" />
          <path className="onde-wave" d={stepped(60)} fill="none" stroke="var(--color-brand-500)" strokeWidth="1.2" />
          <path className="onde-wave onde-wave-2" d={stepped(60)} fill="none" stroke="var(--color-brand-500)" strokeWidth="1.2" />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children ?? <GanjiSymbol size="38%" className="onde-heart" />}</div>
    </div>
  );
}
