'use client';
import { useRef } from 'react';

/**
 * Rail des services : sur ordinateur, la carte survolée ou atteinte au clavier s'ouvre (attribut
 * data-open, la mise en forme est en CSS) et reste ouverte quand la souris part. Les cartes sont
 * rendues par le serveur : ce composant ne fait que déplacer l'attribut.
 */
export function ServiceRail({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  function open(target: EventTarget | null) {
    const item = (target as HTMLElement | null)?.closest<HTMLElement>('[data-i]');
    if (!item || item.hasAttribute('data-open')) return;
    ref.current?.querySelectorAll('[data-open]').forEach((el) => el.removeAttribute('data-open'));
    item.setAttribute('data-open', '');
  }
  return (
    <ul ref={ref} aria-label={label} className="svc-rail -mx-4 scroll-px-4 px-4 pb-2 md:mx-0 md:px-0 md:pb-0" onMouseOver={(e) => open(e.target)} onFocus={(e) => open(e.target)}>
      {children}
    </ul>
  );
}
