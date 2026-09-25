'use client';
import { Bell, MessageSquare, PhoneCall, Play, RotateCcw, UserCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/i18n/client';

const STEPS = [
  { at: '08:00', Icon: Bell, t: 'Rappel envoyé à Koffi', d: 'Notification et SMS : « Prenez votre traitement du matin ».' },
  { at: '08:30', Icon: MessageSquare, t: 'Pas de confirmation', d: 'Deuxième rappel, par message vocal en fon.' },
  { at: '09:00', Icon: PhoneCall, t: 'Aidante prévenue', d: 'Afiavi (mère) reçoit : « Koffi n’a pas confirmé sa prise de 8 h ». Aucune donnée médicale dans le SMS.' },
  { at: '09:12', Icon: UserCheck, t: 'Confirmé par l’aidante', d: 'Afiavi a appelé Koffi : prise faite. L’équipe de soins le voit dans le carnet.' },
];

/** Simulation locale (aucun appel réseau) : l'escalade d'un rappel non confirmé. */
export function CircleSimulation() {
  const t = useT();
  const [shown, setShown] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (shown >= STEPS.length) {
      setRunning(false);
      return;
    }
    const timer = window.setTimeout(() => setShown((n) => n + 1), 900);
    return () => window.clearTimeout(timer);
  }, [running, shown]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" disabled={running} onClick={() => { setShown(0); setRunning(true); }}>
          <Play size={20} aria-hidden /> {t('Simuler : rappel de 8 h non confirmé')}
        </button>
        {shown > 0 && !running && (
          <button type="button" className="btn btn-ghost" onClick={() => setShown(0)}><RotateCcw size={20} aria-hidden /> {t('Effacer')}</button>
        )}
      </div>
      <ol className="space-y-3" aria-live="polite">
        {STEPS.slice(0, shown).map(({ at, Icon, t: title, d }, i) => (
          <li key={at} className={`flex gap-3 rounded-2xl p-4 ${i === 2 ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : i === 3 ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--bg)]'}`}>
            <span className="num w-14 shrink-0 font-bold">{at}</span>
            <Icon size={22} aria-hidden className="mt-0.5 shrink-0" />
            <span>
              <span className="block font-bold">{t(title)}</span>
              <span className="block text-base">{t(d)}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
