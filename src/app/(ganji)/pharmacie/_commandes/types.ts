/** Commandes vues par l'officine (GET /pharmacy/orders). Jamais le code de remise : c'est le patient qui le donne. */
export type PharmacyOrderStatus = 'RECUE' | 'ACCEPTEE' | 'PRETE' | 'EN_LIVRAISON' | 'LIVREE' | 'RETIREE' | 'REFUSEE' | 'ANNULEE' | 'ECHEC';

export interface PharmacyOrder {
  id: string;
  ref: string;
  status: PharmacyOrderStatus;
  mode: 'LIVRAISON' | 'RETRAIT';
  patient: string;
  phone: string;
  address: string | null;
  commune: string | null;
  instructions: string | null;
  items: { medicationId: string; dci: string; form: string; strength: string; quantity: number; unitPriceFcfa: number }[];
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalFcfa: number;
  payment: 'ESPECES' | 'MOBILE_MONEY';
  paymentStatus: 'A_PAYER' | 'PAYE' | 'REMBOURSE';
  provider: string | null;
  prescription: { id: string; verified: boolean; prescriber: string; issuedAt: string; status: string } | null;
  courierName: string | null;
  courierPhone: string | null;
  refusalReason: string | null;
  next: PharmacyOrderStatus[];
  codeAttemptsLeft: number;
  /** Remise contre le code attendue (un nouveau code peut être envoyé au patient). */
  awaitingCode: boolean;
  newCodesLeft: number;
  events: { status: string; at: string; by?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyOrders {
  pharmacy: { id: string; name: string };
  counts: { new: number; inProgress: number };
  orders: PharmacyOrder[];
}
