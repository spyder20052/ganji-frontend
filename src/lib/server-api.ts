import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:4000';

export class ServerApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** Appel serveur → API en relayant le cookie de session (Server Components). */
export async function serverApi<T>(path: string, opts: { allowAnonymous?: boolean } = {}): Promise<T> {
  const jar = await cookies();
  const session = jar.get('alafia_session')?.value;
  const res = await fetch(`${BACKEND}${path}`, {
    headers: { Accept: 'application/json', ...(session ? { Cookie: `alafia_session=${session}` } : {}) },
    cache: 'no-store',
  });
  if (res.status === 401 && !opts.allowAnonymous) redirect('/connexion');
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ServerApiError(res.status, data?.message ?? 'Erreur', data?.code);
  return data as T;
}

export async function tryServerApi<T>(path: string): Promise<T | null> {
  try {
    return await serverApi<T>(path, { allowAnonymous: true });
  } catch {
    return null;
  }
}
