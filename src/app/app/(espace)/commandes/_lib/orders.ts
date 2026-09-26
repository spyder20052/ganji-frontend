import { Bike, CircleCheck, CircleX, House, PackageCheck, ReceiptText, Store, type LucideIcon } from 'lucide-react';

import type { OrderMode, OrderStatus } from './status';

export { orderStatusLabel, STATUS_LABEL, type OrderMode, type OrderStatus } from './status';

/** Types et pictogrammes des commandes (réponses de /me/orders), propres à cette fonction. */
export type OrderPayment = 'ESPECES' | 'MOBILE_MONEY';
export type Operator = 'MTN' | 'MOOV' | 'CELTIIS';

export interface OrderItem { medicationId: string; dci: string; form: string; strength: string; quantity: number; unitPriceFcfa: number }

export interface Order {
  id: string;
  ref: string;
  status: OrderStatus;
  mode: OrderMode;
  patientId: string;
  pharmacy: { id: string; name: string; commune: string | null; phone: string | null; lat: number | null; lng: number | null };
  prescriptionId: string | null;
  itemsHidden: boolean;
  items: OrderItem[];
  itemCount: number;
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalFcfa: number;
  address: string | null;
  commune: string | null;
  phone: string;
  instructions: string | null;
  payment: OrderPayment;
  paymentStatus: 'A_PAYER' | 'PAYE' | 'REMBOURSE';
  provider: string | null;
  receipt: string | null;
  courierName: string | null;
  courierPhone: string | null;
  handoverCode: string | null;
  refusalReason: string | null;
  events: { status: string; at: string }[];
  canCancel: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OptionPharmacy {
  id: string;
  name: string;
  commune: string;
  communeId: string;
  lat: number;
  lng: number;
  phone: string | null;
  onDuty: boolean;
  open24h: boolean;
  distanceKm: number | null;
  lines: { medicationId: string; quantity: number; unitPriceFcfa: number }[];
  subtotalFcfa: number;
  deliverable: boolean;
  deliveryFeeFcfa: number;
}

export interface OrderOptions {
  patient: { id: string; firstName: string; self: boolean };
  source: 'ORDONNANCE' | 'LIBRE';
  prescription: { id: string; prescriber: string; issuedAt: string; expiresAt: string } | null;
  items: { medicationId: string; dci: string; form: string; strength: string; quantity: number }[];
  activeOrderId: string | null;
  blocked: string | null;
  defaults: { phone: string; address: string; commune: { id: string; name: string; lat: number; lng: number } | null };
  fees: { sameCommune: number; otherCommune: number; maxDeliveryKm: number };
  pharmacies: OptionPharmacy[];
}

export const ACTIVE: OrderStatus[] = ['RECUE', 'ACCEPTEE', 'PRETE', 'EN_LIVRAISON'];

export const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  RECUE: ReceiptText,
  ACCEPTEE: CircleCheck,
  PRETE: PackageCheck,
  EN_LIVRAISON: Bike,
  LIVREE: House,
  RETIREE: Store,
  REFUSEE: CircleX,
  ANNULEE: CircleX,
  ECHEC: CircleX,
};

/** Étapes affichées : la livraison passe par « En route », le retrait non. */
export function stepsFor(mode: OrderMode): OrderStatus[] {
  return mode === 'LIVRAISON' ? ['RECUE', 'ACCEPTEE', 'PRETE', 'EN_LIVRAISON', 'LIVREE'] : ['RECUE', 'ACCEPTEE', 'PRETE', 'RETIREE'];
}

/** Couleur de l'étiquette de statut (jamais la couleur seule : le libellé suit). */
export const STATUS_TONE: Record<OrderStatus, string> = {
  RECUE: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  ACCEPTEE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  PRETE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  EN_LIVRAISON: 'bg-[var(--color-leaf)] text-[var(--color-ink)]',
  LIVREE: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]',
  RETIREE: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]',
  REFUSEE: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  ANNULEE: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]',
  ECHEC: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
};

/** Commander à nouveau après un refus ou un échec : la même ordonnance, sinon la recherche. */
export function reorderHref(o: Pick<Order, 'prescriptionId' | 'mode'>): string {
  return o.prescriptionId ? `/app/commandes/nouvelle?rx=${o.prescriptionId}&mode=${o.mode}` : '/medicaments';
}

export const OPERATORS: { id: Operator; label: string }[] = [
  { id: 'MTN', label: 'MTN MoMo' },
  { id: 'MOOV', label: 'Moov Money' },
  { id: 'CELTIIS', label: 'Celtiis Cash' },
];

/** Même règle que l'API : retrait gratuit, 500 FCFA dans la commune de la pharmacie, 1 000 FCFA ailleurs. */
export function feeFor(mode: OrderMode, pharmacyCommuneId: string | undefined, communeId: string | undefined, fees: OrderOptions['fees']): number {
  if (mode === 'RETRAIT') return 0;
  return communeId && communeId === pharmacyCommuneId ? fees.sameCommune : fees.otherCommune;
}

export { requiresPrescription } from './rules';
