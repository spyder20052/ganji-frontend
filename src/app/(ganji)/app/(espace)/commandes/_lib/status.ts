/**
 * Statuts d'une commande : un seul libellé partout (suivi, listes, accueil, officine). La remise d'un
 * retrait s'appelle toujours « Retirée », celle d'une livraison « Livrée ». Fichier sans dépendance :
 * importable par l'espace pharmacie et par l'accueil.
 */
export type OrderMode = 'LIVRAISON' | 'RETRAIT';
export type OrderStatus = 'RECUE' | 'ACCEPTEE' | 'PRETE' | 'EN_LIVRAISON' | 'LIVREE' | 'RETIREE' | 'REFUSEE' | 'ANNULEE' | 'ECHEC';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  RECUE: 'Reçue',
  ACCEPTEE: 'Acceptée',
  PRETE: 'Prête',
  EN_LIVRAISON: 'En route',
  LIVREE: 'Livrée',
  RETIREE: 'Retirée',
  REFUSEE: 'Refusée',
  ANNULEE: 'Annulée',
  ECHEC: 'Non remise',
};

/** Libellé (français, à passer à t()) d'un statut selon le mode : retrait → « Retirée », livraison → « Livrée ». */
export function orderStatusLabel(status: string, mode: OrderMode): string {
  if (status === 'LIVREE' || status === 'RETIREE') return mode === 'RETRAIT' ? 'Retirée' : 'Livrée';
  return STATUS_LABEL[status as OrderStatus] ?? status;
}
