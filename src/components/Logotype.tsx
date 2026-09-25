import { LOGOTYPE_PATH, LOGOTYPE_RATIO, LOGOTYPE_VIEWBOX } from './logotype-trace';

/**
 * Logotype « Ganji » de la charte (Poppins Medium), en tracé : même rendu partout, sans télécharger la
 * police. Il prend la taille et la couleur du texte autour (1 em de haut, ligne de base à 0,85 em).
 * `label` : texte lu par les lecteurs d'écran quand aucun parent ne nomme déjà le logo.
 */
export function Logotype({ className = '', label }: { className?: string; label?: string }) {
  return (
    <>
      <svg viewBox={LOGOTYPE_VIEWBOX} aria-hidden="true" fill="currentColor" className={`inline-block shrink-0 ${className}`} style={{ height: '1em', width: `${LOGOTYPE_RATIO}em` }}>
        <path d={LOGOTYPE_PATH} />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}
