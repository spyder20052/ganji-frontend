export interface ConsentView {
  id: string;
  grantee: string | null;
  scopes: string[];
  source: string;
  since: string;
  expiresAt: string;
  active: boolean;
  revokedAt: string | null;
}

export interface ShareResult {
  id: string;
  shareToken: string;
  shareCode: string;
  scanBefore: string;
  hours: number;
  qrPayload: string;
}

/** Ce que le soignant recevra avec le partage : nombre de documents et d'ordonnances du carnet. */
export interface SharePreview {
  documents: number;
  prescriptions: number;
}
