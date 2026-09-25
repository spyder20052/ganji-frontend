'use client';
import { useEffect } from 'react';
import { optimized, srcSetFor } from './image-url';

/**
 * Pose l'adresse des illustrations différées (voir IllustrationView) quand elles arrivent à 400 px
 * de l'écran. Sans cela, en 2G, Chrome télécharge toutes les images des six premiers écrans dès
 * l'ouverture de la page : la première page dépasserait ses 200 Ko.
 */
export function DeferredImages() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          const name = img.dataset.img ?? '';
          img.srcset = srcSetFor(name);
          img.src = optimized(name, 1080);
          io.unobserve(img);
        }
      },
      { rootMargin: '400px' },
    );
    document.querySelectorAll<HTMLImageElement>('img[data-img]').forEach((img) => io.observe(img));
    return () => io.disconnect();
  }, []);
  return null;
}
