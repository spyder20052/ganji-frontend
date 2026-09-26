/** Site de transfusion et son stock (GET /blood/stocks). */
export interface StockSite {
  id: string;
  name: string;
  shortName: string | null;
  lat: number;
  lng: number;
  commune: string;
  department: string;
  total: number;
  stock: { product: string; bloodGroup: string; units: number }[];
  updatedAt: string | null;
}

export type Level = 'critical' | 'low' | 'ok';

export const CRITICAL = 3;
export const LOW = 10;

export function level(units: number): Level {
  return units < CRITICAL ? 'critical' : units < LOW ? 'low' : 'ok';
}

/** Le rouge est réservé au sang : ici il signale un niveau critique de poches. */
export const LEVEL_CLASS: Record<Level, string> = {
  critical: 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)] border-[var(--color-danger-600)]/40',
  low: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)] border-[var(--color-ocre-500)]/40',
  // Les teintes « marque » ne changent pas en sombre : on les assombrit ici pour garder le contraste.
  ok: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] border-[var(--color-brand-500)]/30 dark:bg-[var(--color-brand-900)]/50 dark:text-[var(--color-leaf)]',
};

export const LEVEL_LABEL: Record<Level, string> = { critical: 'critique', low: 'bas', ok: 'suffisant' };

export function unitsOf(site: StockSite, product: string, group: string) {
  return site.stock.find((s) => s.product === product && s.bloodGroup === group)?.units ?? 0;
}
