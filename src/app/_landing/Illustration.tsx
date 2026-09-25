import { closeSync, existsSync, openSync, readSync } from 'node:fs';
import path from 'node:path';
import type { ComponentProps } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { IllustrationView } from './IllustrationView';

const file = (name: string) => path.join(process.cwd(), 'public', 'illustrations', `${name}.png`);

/** Le fichier public/illustrations/<nom>.png a-t-il été déposé ? (vérifié au rendu, côté serveur) */
export const hasIllustration = (name: string) => existsSync(file(name));

/** Largeur et hauteur lues dans l'en-tête PNG : la place est réservée avant le chargement. */
function pngSize(name: string): [number, number] | undefined {
  if (!hasIllustration(name)) return undefined;
  const head = Buffer.alloc(24);
  const fd = openSync(file(name), 'r');
  readSync(fd, head, 0, 24, 0);
  closeSync(fd);
  return [head.readUInt32BE(16), head.readUInt32BE(20)];
}

/** Illustration de la landing (voir docs/ILLUSTRATIONS.md pour les prompts et les noms de fichiers). */
export function Illustration({ icon, ...props }: Omit<ComponentProps<typeof IllustrationView>, 'available' | 'fallbackIcon' | 'size'> & { icon: string }) {
  const size = pngSize(props.name);
  return <IllustrationView defer {...props} available={!!size} size={size} fallbackIcon={<Pictogram name={icon} size={36} />} />;
}
