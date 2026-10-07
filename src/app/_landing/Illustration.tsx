import type { ComponentProps } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { IllustrationView } from './IllustrationView';
import manifest from './illustrations.json';

type Art = { w: number; h: number; lqip?: string };
const ART: Record<string, Art | undefined> = manifest;

/** L'illustration a-t-elle été déposée dans illustrations/ puis préparée (`npm run illustrations`) ? */
export const hasIllustration = (name: string) => Boolean(ART[name]);

/** Aperçu flou (10 px) affiché pendant le chargement ; absent pour les images transparentes. */
export const placeholderOf = (name: string) => ART[name]?.lqip;

/**
 * Illustration de la landing (voir docs/ILLUSTRATIONS.md pour les prompts et les noms de fichiers).
 * `blur` : aperçu flou pendant le chargement ; retiré sur les rails et onglets dont la plupart des images
 * sont hors écran (chaque aperçu pèse deux fois dans la page, en HTML et dans la charge React).
 */
export function Illustration({ icon, blur = true, ...props }: Omit<ComponentProps<typeof IllustrationView>, 'available' | 'fallbackIcon' | 'size' | 'placeholder'> & { icon: string; blur?: boolean }) {
  const art = ART[props.name];
  return (
    <IllustrationView
      defer
      {...props}
      available={!!art}
      size={art ? [art.w, art.h] : undefined}
      placeholder={blur ? art?.lqip : undefined}
      fallbackIcon={<Pictogram name={icon} size={36} />}
    />
  );
}
