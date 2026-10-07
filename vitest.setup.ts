/**
 * Préparation des tests de composants (projet jsdom) : matchers jest-dom, démontage du DOM après chaque
 * test, et deux API de navigateur que jsdom n'implémente pas mais que les écrans appellent.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// Préférence « mouvement réduit » lue par les compteurs animés.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// Retour en haut de page après « Recommencer » : jsdom le signale comme non implémenté.
window.scrollTo = () => undefined;
