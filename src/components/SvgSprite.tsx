import type { LucideIcon } from 'lucide-react';
import { LOGOTYPE_ID, SYMBOL_ID, SYMBOL_PATH } from './GanjiSymbol';
import { LOGOTYPE_PATH, LOGOTYPE_VIEWBOX } from './logotype-trace';
import { pictogramId, PICTOGRAMS } from './Pictogram';

export const spriteIconId = (name: string) => `icone-${name}`;

/**
 * Dessins définis une seule fois dans la page, référencés ensuite par `<use>` : le symbole et le logotype de la
 * marque, les pictogrammes et les icônes qui reviennent des dizaines de fois sur l'accueil. Chaque SVG en ligne
 * pèse deux fois (HTML et charge React) : la page y gagne plusieurs kilo-octets. À poser en tête du document.
 */
export function SvgSprite({ pictograms = [], icons = {} }: { pictograms?: string[]; icons?: Record<string, LucideIcon> }) {
  return (
    <svg width={0} height={0} aria-hidden="true" className="absolute">
      <defs>
        <symbol id={SYMBOL_ID} viewBox="0 0 520 520">
          <path d={SYMBOL_PATH} />
        </symbol>
        <symbol id={LOGOTYPE_ID} viewBox={LOGOTYPE_VIEWBOX}>
          <path d={LOGOTYPE_PATH} />
        </symbol>
        {[...new Set(pictograms)].map((name) => {
          const Icon = PICTOGRAMS[name] ?? PICTOGRAMS.question;
          return (
            <symbol key={name} id={pictogramId(name)} viewBox="0 0 24 24">
              <Icon size={24} strokeWidth={2} />
            </symbol>
          );
        })}
        {Object.entries(icons).map(([name, Icon]) => (
          <symbol key={name} id={spriteIconId(name)} viewBox="0 0 24 24">
            <Icon size={24} />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

/** Icône du sprite (flèches, coches…) : même rendu qu'une icône Lucide en ligne, sans répéter son tracé. */
export function SpriteIcon({ name, size = 24, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" className={className}>
      <use href={`#${spriteIconId(name)}`} />
    </svg>
  );
}
