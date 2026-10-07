export interface RxItem {
  medicationId: string;
  dci: string;
  form: string;
  strength: string;
  dosage: string;
  duration: string;
  quantity: number;
}

/** Vue pharmacien d'une ordonnance (POST /prescriptions/verify et /dispense). */
export interface PharmacistRx {
  authentic: true;
  id: string;
  status: 'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';
  statusLabel: string;
  canDispense: boolean;
  patient: string;
  prescriber: string;
  issuedAt: string;
  expiresAt: string;
  items: RxItem[];
  dispensedAt?: string | null;
  dispensedByName?: string | null;
}

export interface StockItem {
  medication: { id: string; dci: string; form: string; strength: string; category: string | null; priceFcfa: number | null };
  quantity: number;
  priceFcfa: number | null;
  low: boolean;
  updatedAt: string;
}

export interface StockResponse {
  pharmacy: { id: string; name: string; onDuty: boolean };
  items: StockItem[];
}
