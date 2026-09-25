'use client';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';
import { saveCard, type EmergencyCard } from '../_lib/emergency-card';

/** Enregistre la carte d'urgence sur le téléphone à chaque visite en ligne. */
export function SaveEmergencyCard({ card }: { card: EmergencyCard }) {
  const t = useT();
  const [saved, setSaved] = useState(false);
  const json = JSON.stringify(card);
  useEffect(() => {
    setSaved(saveCard({ ...(JSON.parse(json) as EmergencyCard), savedAt: new Date().toISOString() }));
  }, [json]);
  if (!saved) return null;
  return (
    <Link
      href="/app/carte-urgence"
      className="inline-flex items-center gap-2 rounded-full bg-white/12 py-1.5 pr-4 pl-2 text-sm font-medium text-white ring-1 ring-white/25"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-brand-900)]">
        <CheckCircle2 size={14} aria-hidden />
      </span>
      {t('Carte d’urgence prête sans réseau')}
    </Link>
  );
}
