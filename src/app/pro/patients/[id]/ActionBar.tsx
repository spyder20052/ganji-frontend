'use client';
import { Droplet, FilePlus2, FlaskConical, MessagesSquare, Pill, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BloodRequestForm } from './BloodRequestForm';
import { EncounterForm, ObservationForm, TeleForm } from './ClinicalForms';
import { PrescriptionForm } from './PrescriptionForm';

type Action = 'blood' | 'rx' | 'note' | 'obs' | 'tele';

interface Props {
  patientId: string;
  firstName: string;
  bloodGroup: string | null;
  canPrescribe: boolean;
}

/** Barre d'actions de la fiche patient : une seule action ouverte à la fois, dans un panneau en ligne. */
export function ActionBar({ patientId, firstName, bloodGroup, canPrescribe }: Props) {
  const [open, setOpen] = useState<Action | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const actions: { key: Action; label: string; title: string; icon: LucideIcon; danger?: boolean; hidden?: boolean }[] = [
    { key: 'blood', label: 'Demander du sang', title: `Demande de produit sanguin pour ${firstName}`, icon: Droplet, danger: true },
    { key: 'rx', label: 'Ordonnance', title: 'Ordonnance signée', icon: Pill, hidden: !canPrescribe },
    { key: 'note', label: 'Compte rendu', title: 'Compte rendu de consultation', icon: FilePlus2 },
    { key: 'obs', label: 'Ajouter un résultat', title: 'Résultat d’analyse', icon: FlaskConical },
    { key: 'tele', label: 'Demander un avis', title: 'Demande d’avis à un spécialiste (télé-expertise)', icon: MessagesSquare },
  ];
  const current = actions.find((a) => a.key === open);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <section aria-label="Actions sur le dossier" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions
          .filter((a) => !a.hidden)
          .map((a) => {
            const active = open === a.key;
            const cls = a.danger ? 'btn-danger' : active ? 'btn-primary' : 'btn-ghost';
            return (
              <button
                key={a.key}
                type="button"
                className={`btn ${cls} ${active && a.danger ? 'ring-4 ring-[var(--color-danger-600)]/25' : ''}`}
                aria-expanded={active}
                aria-controls="panneau-action"
                onClick={() => setOpen(active ? null : a.key)}
              >
                <a.icon size={20} aria-hidden /> {a.label}
              </button>
            );
          })}
      </div>

      {current && (
        <div
          id="panneau-action"
          ref={panelRef}
          tabIndex={-1}
          role="region"
          aria-labelledby="titre-action"
          className={`card p-5 focus:outline-none ${current.danger ? 'border-[var(--color-danger-600)]/40' : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(null);
          }}
        >
          <div className="mb-4 flex items-start gap-3">
            <h2 id="titre-action" className="flex-1 text-xl font-bold">
              {current.title}
            </h2>
            <button type="button" className="chip-round !h-11 !w-11" onClick={() => setOpen(null)} aria-label="Fermer le panneau">
              <X size={20} aria-hidden />
            </button>
          </div>
          {open === 'blood' && <BloodRequestForm patientId={patientId} firstName={firstName} bloodGroup={bloodGroup} />}
          {open === 'rx' && <PrescriptionForm patientId={patientId} firstName={firstName} />}
          {open === 'note' && <EncounterForm patientId={patientId} />}
          {open === 'obs' && <ObservationForm patientId={patientId} />}
          {open === 'tele' && <TeleForm patientId={patientId} firstName={firstName} />}
        </div>
      )}
    </section>
  );
}
