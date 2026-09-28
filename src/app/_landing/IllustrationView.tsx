import type { ReactNode } from 'react';

import { srcFor, srcSetFor } from './image-url';

/**
 * Illustration sur mesure : <picture> sur les fichiers AVIF et WebP préparés d'avance (scripts/illustrations.mjs),
 * sans JavaScript de plus sur la première page. Un aperçu flou de 10 px occupe la place pendant le chargement. Sans fichier, visuel de marque (symbole Ganji en Sauge
 * et pictogramme sur pastille Vert). Utilisable côté serveur comme côté client.
 *
 * `defer` : seul le nom part dans la page (data-img) ; <DeferredImages> construit les adresses à l'approche
 * de l'écran. La page reste légère : pas dix variantes d'URL par image, deux fois.
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
  placeholder,
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
  /** Aperçu flou en data URI (images opaques seulement), posé en fond de l'image. */
  placeholder?: string;
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
  const img = (
    <picture className="contents">
      <source type="image/avif" sizes={sizes} {...(defer ? {} : { srcSet: srcSetFor(name, 'avif') })} />
      <img
        {...(defer ? { 'data-img': name } : { src: srcFor(name, 'webp', 960), srcSet: srcSetFor(name, 'webp') })}
        sizes={sizes}
        alt={alt}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
        className={frame ? 'absolute inset-0 size-full object-cover' : `h-auto w-full ${className}`}
        style={{
          objectPosition: position,
          ...(placeholder && { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover', backgroundPosition: position ?? 'center' }),
        }}
      />
    </picture>
  );
  // Fond blanc sous le cadre : certaines scènes s'estompent en brume sur leurs bords.
  return frame ? <div className={`relative w-full overflow-hidden bg-white ${frame} ${className}`}>{img}</div> : img;
}
