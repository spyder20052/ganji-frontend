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
