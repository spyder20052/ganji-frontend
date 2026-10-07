/** Identifiants et chemins venant de l'adresse : vérifiés avant tout appel à l'API. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

/**
 * Page où revenir après la connexion (`?suite=`) : un chemin interne seulement, jamais une adresse
 * extérieure ni un chemin protocolaire (« //evil », « /\\evil ») : pas de redirection ouverte.
 */
export function safeSuite(v: unknown): string | undefined {
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : undefined;
}
