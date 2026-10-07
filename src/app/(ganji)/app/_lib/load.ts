import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import { cache } from 'react';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { Me } from '@/lib/types';

/** Utilisateur connecté, lu une seule fois par rendu (layout + page). */
export const getMe = cache(() => serverApi<Me>('/auth/me'));

export type Loaded<T> = { data: T; error: null; status: number } | { data: null; error: string; status: number };

/**
 * Lecture d'API qui ne fait pas tomber toute la page : chaque bloc affiche
 * sa propre erreur (ex. partie du carnet non partagée avec un aidant).
 * Les redirections (session expirée) sont relancées telles quelles.
 */
export async function load<T>(path: string): Promise<Loaded<T>> {
  try {
    return { data: await serverApi<T>(path), error: null, status: 200 };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ServerApiError) {
      if (e.status === 403) return { data: null, error: e.message && e.message !== 'Erreur' ? e.message : 'Cette partie du carnet n’est pas partagée avec vous.', status: 403 };
      if (e.status === 404) return { data: null, error: 'Information introuvable.', status: 404 };
      return { data: null, error: e.message && e.message !== 'Erreur' ? e.message : 'Une erreur est survenue. Réessayez.', status: e.status };
    }
    return { data: null, error: 'Le service ne répond pas pour le moment. Réessayez dans un instant.', status: 0 };
  }
}
