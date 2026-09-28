'use client';
import { useEffect } from 'react';
import { srcFor, srcSetFor } from './image-url';

/** Carrousel horizontal qui contient l'image, s'il y en a un. */
function carouselOf(el: HTMLElement) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowX } = getComputedStyle(p);
    if ((overflowX === 'auto' || overflowX === 'scroll') && p.scrollWidth > p.clientWidth) return p;
  }
  return null;
}

/**
 * Pose l'adresse des illustrations différées (voir IllustrationView) quand elles arrivent à 800 px
 * de l'écran : le temps de les charger avant qu'on y soit, même en faisant défiler vite au pouce.
 * Dans un carrousel, les cartes cachées à droite ne croisent jamais l'écran avant qu'on les fasse
 * glisser : elles sont chargées avec la première. Sans ce report, en 2G, Chrome télécharge toutes
 * les images des six premiers écrans dès l'ouverture : la première page dépasserait ses 200 Ko.
 */
export function DeferredImages() {
  useEffect(() => {
    const load = (img: HTMLImageElement) => {
      const name = img.dataset.img;
      if (!name) return;
      delete img.dataset.img;
      io.unobserve(img);
      // Le chargement paresseux natif retiendrait encore les cartes cachées d'un carrousel.
      img.loading = 'eager';
      // La source AVIF d'abord : le navigateur choisit une seule fois, au moment où l'image reçoit ses adresses.
      img.parentElement?.querySelector('source')?.setAttribute('srcset', srcSetFor(name, 'avif'));
      img.srcset = srcSetFor(name, 'webp');
      img.src = srcFor(name, 'webp', 960);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          const row = carouselOf(img);
          if (row) row.querySelectorAll<HTMLImageElement>('img[data-img]').forEach(load);
          else load(img);
        }
      },
      { rootMargin: '800px' },
    );
    document.querySelectorAll<HTMLImageElement>('img[data-img]').forEach((img) => io.observe(img));
    return () => io.disconnect();
  }, []);
  return null;
}
