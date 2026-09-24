'use client';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { saveCard, type EmergencyCard } from '../_lib/emergency-card';

/** Enregistre la carte d'urgence sur le téléphone à chaque visite en ligne. */
export function SaveEmergencyCard({ card }: { card: EmergencyCard }) {
  const [saved, setSaved] = useState(false);
  const json = JSON.stringify(card);
  useEffect(() => {
    setSaved(saveCard({ ...(JSON.parse(json) as EmergencyCard), savedAt: new Date().toISOString() }));
  }, [json]);
  if (!saved) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-base text-[var(--fg-muted)]">
      <CheckCircle2 size={18} aria-hidden className="text-[var(--color-brand-700)]" />
      <span>
        <Link href="/app/carte-urgence" className="font-bold underline underline-offset-2">Carte d’urgence</Link> à jour sur ce téléphone, disponible sans réseau.
      </span>
    </p>
  );
}
