import type { ReactNode } from 'react';

import { optimized, srcSetFor } from './image-url';

/**
 * Illustration sur mesure, en simple balise <img> servie par l'optimiseur d'images : pas de
 * JavaScript de plus sur la première page. Sans fichier, visuel de marque (symbole Ganji en Sauge
 * et pictogramme sur pastille Vert). Utilisable côté serveur comme côté client.
 *
 * `defer` : seul le nom part dans la page (data-img) ; <DeferredImages> construit les adresses à l'approche
 * de l'écran. La page reste légère : pas neuf variantes d'URL par image, deux fois.
 * Le chargement paresseux natif ne suffit pas : en 2G, Chrome précharge jusqu'à 6 000 px plus bas.
 */
export function IllustrationView({
  name,
  alt,
  fallbackIcon,
  available,
  size = [4, 3],
  frame,
  position,
  defer = false,
  sizes = '(min-width: 1024px) 40vw, 100vw',
  className = '',
}: {
  name: string;
  alt: string;
  fallbackIcon: ReactNode;
  available: boolean;
  /** Dimensions du fichier, pour réserver la place (lues côté serveur). */
  size?: readonly [number, number];
  /** Cadre imposé, en classes Tailwind (ex. « aspect-[16/9] ») : l'image le remplit, rognée au besoin. */
  frame?: string;
  /** Point de l'image gardé visible quand le cadre la rogne (object-position). */
  position?: string;
  defer?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [w, h] = size;
  if (!available) {
    return (
      <div
        {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
        className={`relative grid w-full place-items-center overflow-hidden bg-brand-100 ${frame ?? ''} ${className}`}
        style={frame ? undefined : { aspectRatio: `${w} / ${h}` }}
      >
        <span aria-hidden className="absolute inset-0 bg-[url('/motifs/symbole-sauge.svg')] bg-[length:auto_78%] bg-center bg-no-repeat opacity-70" />
        <span className="relative grid aspect-square w-[22%] min-w-10 place-items-center rounded-full bg-brand-500 text-white">{fallbackIcon}</span>
      </div>
    );
  }
  const src = optimized(name, 1080);
  const srcSet = srcSetFor(name);
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- srcset de l'optimiseur, sans le JS de next/image
    <img
      {...(defer ? { 'data-img': name } : { src, srcSet })}
      sizes={sizes}
      alt={alt}
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      className={frame ? 'absolute inset-0 size-full object-cover' : `h-auto w-full ${className}`}
      style={position ? { objectPosition: position } : undefined}
    />
  );
  // Fond blanc sous le cadre : certaines scènes s'estompent en brume sur leurs bords.
  return frame ? <div className={`relative w-full overflow-hidden bg-white ${frame} ${className}`}>{img}</div> : img;
}
