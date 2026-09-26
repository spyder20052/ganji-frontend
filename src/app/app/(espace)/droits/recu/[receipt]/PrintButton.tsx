'use client';
import { Printer } from 'lucide-react';
import { useT } from '@/i18n/client';

export function PrintButton() {
  const t = useT();
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      <Printer size={20} aria-hidden /> {t('Imprimer')}
    </button>
  );
}
