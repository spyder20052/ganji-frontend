import { Pictogram } from '@/components/Pictogram';

export interface MapEvent {
  commune: string;
  icon: string;
  text: string;
  /** Position du chef-lieu sur la carte, en % (scripts/carte/benin.py). */
  x: number;
  y: number;
  /** Pastille : rouge pour le sang et l'urgence, vert sinon. */
  tone: string;
}

/**
 * Hero : le Bénin dessiné par ses 77 communes (public/hero/benin.svg, générée depuis le référentiel
 * géographique de l'API). Au chargement, le réseau s'allume de Cotonou jusqu'à l'Alibori ; ensuite, des
 * scènes réelles de Ganji apparaissent tour à tour, chacune dans sa commune.
 */
export function HeroMap({ events, alt }: { events: MapEvent[]; alt: string }) {
  return (
    <div className="relative mx-auto aspect-[299/607] h-[min(33rem,120vw)] md:h-[36rem]">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG animée, servie telle quelle */}
      <img src="/hero/benin.svg" alt={alt} width={299} height={607} fetchPriority="high" className="h-full w-full" />
      {events.map((e, i) => {
        // Grand écran : l'étiquette part vers l'extérieur de la carte ; ailleurs, vers l'intérieur (pas de débordement).
        const left = e.x < 50;
        return (
          <span key={e.commune} aria-hidden className={`ev absolute ${i < 2 ? 'ev-keep' : ''}`} style={{ left: `${e.x}%`, top: `${e.y}%`, '--i': i } as React.CSSProperties}>
            <span className="ev-ring absolute -top-3 -left-3 h-6 w-6 rounded-full" />
            <span
              className={`absolute top-1/2 flex w-max max-w-[min(10rem,44vw)] xl:max-w-[13.5rem] -translate-y-1/2 items-center gap-2.5 rounded-2xl bg-card py-2 pr-3.5 pl-2 shadow-[var(--shadow-soft)] ring-1 ring-border ${left ? 'left-4 xl:right-4 xl:left-auto' : 'right-4 xl:right-auto xl:left-4'}`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${e.tone}`}>
                <Pictogram name={e.icon} size={16} />
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block text-xs font-semibold tracking-wide text-fg-muted uppercase">{e.commune}</span>
                <span className="block text-sm font-semibold">{e.text}</span>
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
