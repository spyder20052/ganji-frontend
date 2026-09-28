/** Largeurs générées par scripts/illustrations.mjs, de la vignette ronde (160) à la pleine largeur (1250). */
export const WIDTHS = [160, 384, 640, 960, 1250];

export type ImageFormat = 'avif' | 'webp';

/** Fichier statique préparé d'avance (servi par le CDN, sans conversion à la volée). */
export const srcFor = (name: string, format: ImageFormat, w: number) => `/illustrations/${name}-${w}.${format}`;

export const srcSetFor = (name: string, format: ImageFormat) => WIDTHS.map((w) => `${srcFor(name, format, w)} ${w}w`).join(', ');
