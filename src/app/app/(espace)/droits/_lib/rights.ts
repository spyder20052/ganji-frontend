import {
  Baby, BedDouble, Bandage, Droplet, FlaskConical, HandHeart, ScanLine, Stethoscope, Syringe, Bug, TestTube, type LucideIcon,
} from 'lucide-react';

/** Types propres au domaine « droits » (réponses de l'API /me/coverage, /me/rights, /me/payments). */

export type CoverageStatus = 'ACTIF' | 'EN_ATTENTE' | 'INACTIF' | 'NON_DECLAREE';
export type Scheme = 'ARCH' | 'MUTUELLE' | 'AUCUNE';

export interface CoverageView {
  declared: boolean;
  scheme: Scheme | null;
  number: string | null;
  status: CoverageStatus;
  rate: number;
  source: 'DECLARE' | 'VERIFIE' | null;
  verifiedAt: string | null;
  validUntil: string | null;
  reason: 'NUMERO_INVALIDE' | 'NON_RACCORDE' | null;
  nextStep: string | null;
  registry: string;
}

export interface Tariff {
  code: string;
  label: string;
  category: 'CONSULTATION' | 'ANALYSE' | 'IMAGERIE' | 'HOSPITALISATION' | 'ACTE';
  priceFcfa: number;
}

export interface EstimateLine {
  kind: 'ACTE' | 'MEDICAMENT';
  code: string;
  label: string;
  category: string;
  unitPriceFcfa: number | null;
  quantity: number;
  totalFcfa: number;
  priceSource: 'GRILLE' | 'PHARMACIES' | 'INDICATIF' | null;
}

export interface Estimate {
  ref: string;
  lines: EstimateLine[];
  totalFcfa: number;
  coveredFcfa: number;
  remainderFcfa: number;
  unknownPrices: number;
  coverage: { scheme: Scheme | null; status: CoverageStatus; rate: number; applied: boolean };
  /** Libellé du reçu, calculé par le serveur. */
  label: string;
  /** Jeton signé à présenter pour payer ce reste à charge (30 min) ; null s'il n'y a rien à payer. */
  token: string | null;
  expiresAt: string;
}

export type Provider = 'MTN_MOMO' | 'MOOV_MONEY' | 'CELTIIS_CASH';

export interface PaymentView {
  id: string;
  receipt: string;
  kind: 'RESTE_A_CHARGE' | 'COMMANDE' | string;
  label: string;
  ref: string | null;
  amountFcfa: number;
  provider: Provider | 'ESPECES' | string;
  providerLabel: string;
  phone: string | null;
  status: 'REUSSI' | 'EN_COURS' | 'ECHOUE' | string;
  payer: string | null;
  createdAt: string;
  sandbox: boolean;
  patient?: string;
}

/** Opérateurs de paiement mobile : nom court sur le bouton, nom complet lu et imprimé. */
export const PROVIDERS: { id: Provider; short: string; name: string }[] = [
  { id: 'MTN_MOMO', short: 'MTN', name: 'MTN Mobile Money' },
  { id: 'MOOV_MONEY', short: 'Moov', name: 'Moov Money' },
  { id: 'CELTIIS_CASH', short: 'Celtiis', name: 'Celtiis Cash' },
];

/** Catégories de la grille : un mot et un pictogramme chacune (traduits à l'affichage). */
export const CATEGORIES: { id: Tariff['category']; label: string; Icon: LucideIcon }[] = [
  { id: 'CONSULTATION', label: 'Consultation', Icon: Stethoscope },
  { id: 'ANALYSE', label: 'Analyses', Icon: FlaskConical },
  { id: 'IMAGERIE', label: 'Imagerie', Icon: ScanLine },
  { id: 'HOSPITALISATION', label: 'Hôpital', Icon: BedDouble },
  { id: 'ACTE', label: 'Soins', Icon: HandHeart },
];

/** Pictogramme d'un acte : le plus parlant pour lui, sinon celui de sa catégorie. */
const ACT_ICON: Record<string, LucideIcon> = {
  'LAB-GE': Bug,
  'LAB-TDR': Bug,
  'LAB-GLY': TestTube,
  'IMG-ECHO-OBS': Baby,
  'ACT-ACC': Baby,
  'ACT-CES': Baby,
  'ACT-SANG': Droplet,
  'ACT-TRANSF': Droplet,
  'ACT-PANS': Bandage,
  'ACT-SUT': Bandage,
  'ACT-INJ': Syringe,
};

export function actIcon(t: Pick<Tariff, 'code' | 'category'>): LucideIcon {
  return ACT_ICON[t.code] ?? CATEGORIES.find((c) => c.id === t.category)?.Icon ?? HandHeart;
}

/** Le sang garde le rouge (réservé au sang et à l'urgence). */
export const isBlood = (code: string) => code === 'ACT-SANG' || code === 'ACT-TRANSF';

/** Prochaine étape affichée, selon le motif renvoyé par le registre (phrases françaises = clés de traduction). */
export function nextStepKey(c: CoverageView): string | null {
  if (c.status === 'NON_DECLAREE') return 'Déclarez votre couverture pour connaître la part prise en charge.';
  if (c.scheme === 'AUCUNE') return 'Renseignez-vous au guichet ARCH de votre mairie ou auprès d’une mutuelle de santé.';
  if (c.status === 'ACTIF') return null;
  if (c.reason === 'NUMERO_INVALIDE') return 'Numéro introuvable : vérifiez-le sur votre carte ARCH, ou passez au guichet ARCH de votre mairie.';
  if (c.reason === 'NON_RACCORDE') return 'Votre mutuelle n’est pas encore raccordée : montrez votre carte à l’accueil de l’hôpital.';
  return 'Touchez « Vérifier » pour confirmer vos droits.';
}

export const SCHEME_LABEL: Record<Scheme, string> = { ARCH: 'ARCH', MUTUELLE: 'Mutuelle', AUCUNE: 'Aucune' };
