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

/** Illustration de la landing (voir docs/ILLUSTRATIONS.md pour les prompts et les noms de fichiers). */
export function Illustration({ icon, ...props }: Omit<ComponentProps<typeof IllustrationView>, 'available' | 'fallbackIcon' | 'size' | 'placeholder'> & { icon: string }) {
  const art = ART[props.name];
  return (
    <IllustrationView
      defer
      {...props}
      available={!!art}
      size={art ? [art.w, art.h] : undefined}
      placeholder={art?.lqip}
      fallbackIcon={<Pictogram name={icon} size={36} />}
    />
  );
}
