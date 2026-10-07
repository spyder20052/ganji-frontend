/** Client HTTP côté navigateur : toutes les requêtes passent par /api (même origine). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: 'no-store',
  });
  const text = await res.text();
  let data: { message?: string | string[]; code?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Page d'erreur HTML d'un relais, délai dépassé : une erreur lisible plutôt qu'une SyntaxError brute.
    throw new ApiError(res.status, res.ok ? 'Réponse illisible du serveur. Réessayez.' : 'Le service ne répond pas. Réessayez dans un instant.');
  }
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(' · ') : (data?.message ?? 'Une erreur est survenue. Réessayez.');
    throw new ApiError(res.status, msg, data?.code);
  }
  return data as T;
}
