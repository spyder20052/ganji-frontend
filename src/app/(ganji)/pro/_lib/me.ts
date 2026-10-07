import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { serverApi } from '@/lib/server-api';
import { ROLE_HOME, type Me, type Role } from '@/lib/types';

/** Profil connecté, mis en cache pour la durée d'une requête (partagé entre layout et page). */
export const getMe = cache(() => serverApi<Me>('/auth/me'));

/** Renvoie le profil, ou redirige vers l'espace du rôle s'il n'a rien à faire ici. */
export async function requireRole(roles: Role[]): Promise<Me> {
  const me = await getMe();
  if (!roles.includes(me.role)) redirect(ROLE_HOME[me.role]);
  return me;
}
