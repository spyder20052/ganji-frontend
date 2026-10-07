import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Deux projets : les modules purs (`*.test.ts`) tournent sous Node, rapides et sans DOM ; les composants
 * (`*.test.tsx`) tournent sous jsdom avec Testing Library. Le tsconfig de Next garde `jsx: preserve`,
 * c'est donc esbuild qui compile ici le TSX (`jsx: automatic`).
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    clearMocks: true,
    unstubGlobals: true,
    projects: [
      { extends: true, test: { name: 'node', include: ['src/**/*.test.ts'], environment: 'node' } },
      { extends: true, test: { name: 'jsdom', include: ['src/**/*.test.tsx'], environment: 'jsdom', setupFiles: ['./vitest.setup.ts'] } },
    ],
  },
});
