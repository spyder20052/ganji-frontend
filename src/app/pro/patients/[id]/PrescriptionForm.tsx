'use client';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { QrClient } from '@/components/QrClient';
import { api, ApiError } from '@/lib/api';
import { fcfa, fmtDate } from '@/lib/format';
import type { MedicationHit, PrescriptionView } from '../../_lib/types';
import { ErrorNote } from '../../_lib/ui';

interface Line {
  med: MedicationHit;
  dosage: string;
  duration: string;
  quantity: number;
}

export function PrescriptionForm({ patientId, firstName }: { patientId: string; firstName: string }) {
  const router = useRouter();
  const uid = useId();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<MedicationHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [validity, setValidity] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PrescriptionView | null>(null);

  // Recherche avec temporisation (faible débit : une requête par pause de frappe).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setHits(await api<MedicationHit[]>(`/medications/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal }));
      } catch {
        if (!ctrl.signal.aborted) setHits([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  function add(med: MedicationHit) {
    if (lines.some((l) => l.med.id === med.id) || lines.length >= 10) return;
    setLines((ls) => [...ls, { med, dosage: '', duration: '', quantity: 1 }]);
    setQ('');
    setHits([]);
  }

  function update(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  const ready = lines.length > 0 && lines.every((l) => l.dosage.trim().length >= 2 && l.duration.trim().length >= 1 && l.quantity >= 1);

  if (done?.qrPayload) {
    return (
      <div className="grid items-start gap-5 sm:grid-cols-[auto_1fr]">
        <QrClient value={done.qrPayload} size={220} label={`QR de l’ordonnance de ${firstName}, à présenter en pharmacie`} />
        <div className="space-y-3">
          <p className="text-lg font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">Ordonnance signée · à présenter en pharmacie</p>
          <p className="text-[var(--fg-muted)]">
            {firstName} la retrouve aussi dans son carnet. Valable jusqu’au {fmtDate(done.expiresAt)}, délivrable une seule fois : une deuxième pharmacie la refusera.
          </p>
          <ul className="space-y-1">
            {done.items.map((i) => (
              <li key={i.medicationId}>
                <span className="font-bold">
                  {i.dci} {i.strength}
                </span>{' '}
                <span className="text-[var(--fg-muted)]">
                  ({i.form}) · {i.dosage} · {i.duration} · × {i.quantity}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDone(null);
              setLines([]);
            }}
          >
            Nouvelle ordonnance
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError(null);
        try {
          const rx = await api<PrescriptionView>('/prescriptions', {
            method: 'POST',
            json: {
              patientId,
              validityDays: validity,
              items: lines.map((l) => ({ medicationId: l.med.id, dosage: l.dosage.trim(), duration: l.duration.trim(), quantity: l.quantity })),
            },
          });
          setDone(rx);
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Ordonnance non enregistrée. Réessayez.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="relative">
        <label htmlFor={`${uid}-q`} className="label mb-2 block">
          Ajouter un médicament (liste nationale des médicaments essentiels)
        </label>
        <div className="relative">
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input
            id={`${uid}-q`}
            className="input !pl-10"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="DCI ou classe : paracétamol, amoxicilline, antipaludique…"
            autoComplete="off"
            aria-controls={`${uid}-hits`}
          />
        </div>
        <div id={`${uid}-hits`} aria-live="polite">
          {searching && <p className="mt-2 text-sm text-[var(--fg-muted)]">Recherche…</p>}
          {!searching && q.trim().length >= 2 && hits.length === 0 && <p className="mt-2 text-sm text-[var(--fg-muted)]">Aucun médicament trouvé.</p>}
          {hits.length > 0 && (
            <ul className="mt-2 max-h-72 divide-y divide-[var(--border)] overflow-y-auto rounded-2xl border border-[var(--border)]">
              {hits.map((m) => {
                const added = lines.some((l) => l.med.id === m.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => add(m)} disabled={added} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--bg)] disabled:opacity-50">
                      <Plus size={18} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />
                      <span className="min-w-0 flex-1">
                        <span className="font-bold">
                          {m.dci} {m.strength}
                        </span>{' '}
                        <span className="text-sm text-[var(--fg-muted)]">{m.form}</span>
                      </span>
                      <span className={`shrink-0 text-sm ${m.pharmaciesInStock ? 'text-[var(--fg-muted)]' : 'font-bold text-[var(--color-ocre-700)]'}`}>
                        {m.pharmaciesInStock ? `${m.pharmaciesInStock} pharmacie${m.pharmaciesInStock > 1 ? 's' : ''} · dès ${fcfa(m.minPriceFcfa)}` : 'En rupture partout'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <ol className="space-y-3">
          {lines.map((l, i) => (
            <li key={l.med.id} className="rounded-2xl border border-[var(--border)] p-3">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-bold">
                  {i + 1}. {l.med.dci} {l.med.strength} <span className="font-normal text-[var(--fg-muted)]">({l.med.form})</span>
                </p>
                <button type="button" className="chip-round !h-11 !w-11" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Retirer ${l.med.dci}`}>
                  <Trash2 size={18} aria-hidden />
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
                <label className="text-sm font-bold">
                  Posologie
                  <input className="input mt-1 font-normal" value={l.dosage} onChange={(e) => update(i, { dosage: e.target.value })} placeholder="1 comprimé matin et soir" maxLength={120} required />
                </label>
                <label className="text-sm font-bold">
                  Durée
                  <input className="input mt-1 font-normal" value={l.duration} onChange={(e) => update(i, { duration: e.target.value })} placeholder="7 jours" maxLength={60} required />
                </label>
                <label className="text-sm font-bold">
                  Boîtes
                  <input type="number" min={1} max={20} className="input num mt-1 w-24 font-normal" value={l.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">
          Validité
          <select className="input mt-1 font-normal" value={validity} onChange={(e) => setValidity(Number(e.target.value))}>
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours (traitement chronique)</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
          {busy ? 'Signature…' : `Signer l’ordonnance${lines.length ? ` (${lines.length})` : ''}`}
        </button>
      </div>
      <ErrorNote>{error}</ErrorNote>
    </form>
  );
}
