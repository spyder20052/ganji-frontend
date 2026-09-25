/** Largeurs proposées au navigateur, de la vignette ronde (96) à la bannière (1920). */
export const WIDTHS = [96, 128, 256, 384, 640, 828, 1080, 1200, 1920];

/** URL du service d'optimisation d'images de Next (AVIF ou WebP selon le navigateur). */
export const optimized = (name: string, w: number) => `/_next/image?url=${encodeURIComponent(`/illustrations/${name}.png`)}&w=${w}&q=75`;

export const srcSetFor = (name: string) => WIDTHS.map((w) => `${optimized(name, w)} ${w}w`).join(', ');
