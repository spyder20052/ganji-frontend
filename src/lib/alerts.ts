/** Alertes sanitaires (M13) : types et libellés partagés entre /alertes, /relais et /ministere. */
export interface HealthAlert {
  id: string;
  kind: string;
  severity: 'INFO' | 'ATTENTION' | 'URGENCE' | string;
  title: string;
  message: string;
  audioKey: string | null;
  source: string;
  auto: boolean;
  createdAt: string;
  communes: string[];
  national: boolean;
}

export const SEVERITY: Record<string, { label: string; pill: string; border: string }> = {
  INFO: { label: 'Information', pill: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', border: 'border-l-[var(--color-brand-500)]' },
  ATTENTION: { label: 'Attention', pill: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]', border: 'border-l-[var(--color-ocre-500)]' },
  URGENCE: { label: 'Urgence', pill: 'bg-[var(--color-danger-600)] text-white', border: 'border-l-[var(--color-danger-600)]' },
};

export const ALERT_KIND: Record<string, { label: string; icon: string }> = {
  EPIDEMIE: { label: 'Épidémie', icon: 'shield' },
  VACCINATION: { label: 'Vaccination', icon: 'vaccine' },
  RUPTURE: { label: 'Rupture de médicament', icon: 'pill' },
  CANICULE: { label: 'Canicule', icon: 'thermometer' },
  INONDATION: { label: 'Inondation', icon: 'vomiting' },
};

export const SYNDROMES: { code: string; label: string; icon: string }[] = [
  { code: 'DIARRHEE', label: 'Diarrhées', icon: 'diarrhea' },
  { code: 'FIEVRE_ERUPTION', label: 'Fièvre avec boutons', icon: 'fever' },
  { code: 'TOUX', label: 'Toux et fièvre', icon: 'cough' },
  { code: 'PARALYSIE', label: 'Paralysie soudaine', icon: 'a11y' },
  { code: 'FIEVRE_HEMORRAGIQUE', label: 'Fièvre avec saignements', icon: 'bleeding' },
  { code: 'DECES_INEXPLIQUE', label: 'Décès inexpliqué', icon: 'warning' },
];

export interface CommunityReport {
  id: string;
  syndrome: string;
  label: string;
  cases: number;
  commune: string;
  department: string;
  lat: number;
  lng: number;
  village: string | null;
  relay: string | null;
  at: string;
}
