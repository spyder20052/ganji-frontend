'use client';
import { Ban, BadgeCheck, CircleCheck, ShieldX } from 'lucide-react';
import { useRef, useState } from 'react';
import { QrScanner } from '@/components/QrScanner';
import { api, ApiError } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { ErrorNote } from '../pro/_lib/ui';
import type { PharmacistRx } from './types';

type State =
  | { k: 'idle' }
  | { k: 'checked'; rx: PharmacistRx; payload: string }
  | { k: 'dispensed'; rx: PharmacistRx }
  | { k: 'refused'; title: string; message: string; rx?: PharmacistRx }
  | { k: 'fake' };

function refusalFor(rx: PharmacistRx): { title: string; message: string } | null {
  switch (rx.status) {
    case 'DISPENSED':
      return {
        title: 'Ordonnance déjà délivrée',
        message: `Délivrée le ${rx.dispensedAt ? fmtDateTime(rx.dispensedAt) : '(date inconnue)'} par ${rx.dispensedByName ?? 'une autre pharmacie'}. Elle ne peut pas resservir.`,
      };
    case 'EXPIRED':
      return { title: 'Ordonnance expirée', message: `Expirée depuis le ${fmtDate(rx.expiresAt)}. Le patient doit consulter pour une nouvelle ordonnance.` };
    case 'CANCELLED':
      return { title: 'Ordonnance annulée', message: 'Le prescripteur a annulé cette ordonnance. Elle ne peut pas être délivrée.' };
    default:
      return null;
  }
}

/** Vérification (signature HMAC) puis délivrance à usage unique d'une ordonnance Ganji. */
export function DispenseDesk() {
  const [state, setState] = useState<State>({ k: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const resultRef = useRef<HTMLDivElement | null>(null);

  function show(next: State) {
    setState(next);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function reset() {
    setState({ k: 'idle' });
    setError(null);
    setScanKey((k) => k + 1);
  }

  async function verify(payload: string) {
    setBusy(true);
    setError(null);
    try {
      const rx = await api<PharmacistRx>('/prescriptions/verify', { method: 'POST', json: { payload } });
      const refusal = refusalFor(rx);
      show(refusal ? { k: 'refused', ...refusal, rx } : { k: 'checked', rx, payload });
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) show({ k: 'fake' });
      else setError(e instanceof ApiError ? e.message : 'Vérification impossible. Vérifiez la connexion et réessayez.');
    } finally {
      setBusy(false);
    }
  }

  async function dispense(payload: string, rx: PharmacistRx) {
    setBusy(true);
    setError(null);
    try {
      show({ k: 'dispensed', rx: await api<PharmacistRx>('/prescriptions/dispense', { method: 'POST', json: { payload } }) });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Double scan simultané ou délivrance ailleurs entre la vérification et le clic : le serveur tranche.
        const title = /expir/i.test(e.message) ? 'Ordonnance expirée' : /annul/i.test(e.message) ? 'Ordonnance annulée' : 'Ordonnance déjà délivrée';
        show({ k: 'refused', title, message: e.message, rx });
      }
      else if (e instanceof ApiError && e.status === 400) show({ k: 'fake' });
      else setError(e instanceof ApiError ? e.message : 'Délivrance non enregistrée. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="delivrer" aria-labelledby="h-rx" className="card scroll-mt-24 space-y-4 p-5">
      <div>
        <h2 id="h-rx" className="text-xl font-bold">
          Délivrer une ordonnance
        </h2>
        <p className="text-[var(--fg-muted)]">Scannez le QR de l’ordonnance (téléphone du patient ou papier). Ganji vérifie la signature du prescripteur et qu’elle n’a jamais servi.</p>
      </div>

      {state.k === 'idle' && (
        <QrScanner
          key={scanKey}
          onValue={verify}
          busy={busy}
          inputLabel="Coller le contenu du QR"
          placeholder="ganji:rx:…"
          inputHint="Commence par « ganji:rx: ». Utile si la caméra n’est pas disponible."
          submitLabel="Vérifier"
          scanLabel="Scanner l’ordonnance"
          minLength={10}
        />
      )}
      <ErrorNote>{error}</ErrorNote>

      <div ref={resultRef} tabIndex={-1} className="space-y-4 focus:outline-none" aria-live="polite">
        {state.k === 'checked' && (
          <>
            <p className="flex items-center gap-3 rounded-2xl bg-[var(--color-brand-100)] p-3 text-lg font-bold text-[var(--color-brand-900)]">
              <BadgeCheck size={28} aria-hidden className="shrink-0" /> Ordonnance authentique · signature du prescripteur vérifiée
            </p>
            <RxDetails rx={state.rx} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary min-w-48" onClick={() => dispense(state.payload, state.rx)} disabled={busy}>
                {busy ? 'Enregistrement…' : 'Délivrer'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={busy}>
                Annuler
              </button>
            </div>
            <p className="text-sm text-[var(--fg-muted)]">La délivrance est définitive : l’ordonnance ne pourra plus servir ailleurs, votre stock est décrémenté et le patient reçoit un SMS.</p>
          </>
        )}

        {state.k === 'dispensed' && (
          <>
            <div role="status" className="flex items-start gap-4 rounded-3xl bg-[var(--color-brand-900)] p-5 text-white">
              <CircleCheck size={36} aria-hidden className="shrink-0" />
              <div>
                <p className="text-2xl font-bold">Ordonnance délivrée</p>
                <p className="text-[var(--color-brand-100)]">
                  {state.rx.dispensedAt ? `Le ${fmtDateTime(state.rx.dispensedAt)}` : 'À l’instant'} · {state.rx.patient} est prévenu par SMS. Elle ne pourra plus resservir.
                </p>
              </div>
            </div>
            <RxDetails rx={state.rx} />
            <button type="button" className="btn btn-primary" onClick={reset}>
              Ordonnance suivante
            </button>
          </>
        )}

        {state.k === 'refused' && (
          <>
            <div role="alert" className="rounded-3xl bg-[var(--fg)] p-6 text-[var(--bg)]">
              <div className="flex items-start gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-ocre-500)] text-[var(--color-ink)]">
                  <Ban size={36} aria-hidden />
                </span>
                <div>
                  <p className="label !text-[var(--color-ocre-500)]">Ne pas délivrer</p>
                  <p className="text-3xl font-bold">{state.title}</p>
                  <p className="mt-2 text-lg">{state.message}</p>
                </div>
              </div>
              <p className="mt-4 border-t border-current/20 pt-3 text-base opacity-90">
                Cette tentative est inscrite dans le journal du patient. Si la personne insiste, orientez-la vers son prescripteur{state.rx ? ` (${state.rx.prescriber})` : ''}.
              </p>
            </div>
            {state.rx && <RxDetails rx={state.rx} muted />}
            <button type="button" className="btn btn-primary" onClick={reset}>
              Scanner une autre ordonnance
            </button>
          </>
        )}

        {state.k === 'fake' && (
          <>
            <div role="alert" className="rounded-3xl bg-[var(--fg)] p-6 text-[var(--bg)]">
              <div className="flex items-start gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--color-ocre-500)] text-[var(--color-ink)]">
                  <ShieldX size={36} aria-hidden />
                </span>
                <div>
                  <p className="label !text-[var(--color-ocre-500)]">Ne pas délivrer</p>
                  <p className="text-3xl font-bold">Ordonnance non authentique</p>
                  <p className="mt-2 text-lg">La signature ne correspond à aucune ordonnance émise sur Ganji : QR modifié, recopié ou inconnu. La tentative est journalisée.</p>
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Scanner une autre ordonnance
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function RxDetails({ rx, muted = false }: { rx: PharmacistRx; muted?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[var(--border)] p-4 ${muted ? 'opacity-75' : ''}`}>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="label">Patient</dt>
          <dd className="font-bold">{rx.patient}</dd>
        </div>
        <div>
          <dt className="label">Prescripteur</dt>
          <dd className="font-bold">{rx.prescriber}</dd>
        </div>
        <div>
          <dt className="label">Validité</dt>
          <dd>
            {fmtDate(rx.issuedAt, { day: 'numeric', month: 'short' })} → {fmtDate(rx.expiresAt, { day: 'numeric', month: 'short', year: 'numeric' })}
          </dd>
        </div>
      </dl>
      <table className="mt-4 w-full text-[0.95rem]">
        <caption className="sr-only">Médicaments prescrits</caption>
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--fg-muted)]">
            <th scope="col" className="py-1.5 pr-2 font-bold">Médicament</th>
            <th scope="col" className="py-1.5 pr-2 font-bold">Posologie</th>
            <th scope="col" className="py-1.5 pr-2 font-bold">Durée</th>
            <th scope="col" className="py-1.5 text-right font-bold">Qté</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rx.items.map((i) => (
            <tr key={i.medicationId}>
              <td className="py-2 pr-2">
                <span className="font-bold">
                  {i.dci} {i.strength}
                </span>
                <span className="block text-sm text-[var(--fg-muted)]">{i.form}</span>
              </td>
              <td className="py-2 pr-2">{i.dosage}</td>
              <td className="py-2 pr-2">{i.duration}</td>
              <td className="num py-2 text-right font-bold">{i.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
