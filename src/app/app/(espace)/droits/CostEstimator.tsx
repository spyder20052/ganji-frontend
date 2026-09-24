'use client';
import { CheckCircle2, Minus, Plus, Search, Smartphone, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fcfa } from '@/lib/format';

interface Med { id: string; dci: string; form: string; strength: string; indicativePriceFcfa: number | null; minPriceFcfa: number | null; pharmaciesInStock: number }
interface Line { key: string; label: string; unit: number; qty: number; kind: 'acte' | 'med' }

/** Tarifs et taux de la maquette : fictifs, à remplacer par la grille officielle. */
const ACTS: Line[] = [
  { key: 'consult', label: 'Consultation au centre de santé', unit: 1500, qty: 1, kind: 'acte' },
  { key: 'nfs', label: 'Analyse de sang (NFS)', unit: 3000, qty: 0, kind: 'acte' },
];
const ARCH_RATE = 0.7;
const OPERATORS = ['MTN Mobile Money', 'Moov Money', 'Celtiis Cash'];

export function CostEstimator({ covered }: { covered: boolean }) {
  const [lines, setLines] = useState<Line[]>(ACTS);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Med[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        setResults((await api<Med[]>(`/medications/search?q=${encodeURIComponent(term)}`)).slice(0, 6));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Recherche impossible sans réseau.');
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const setQty = (key: string, qty: number) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, qty: Math.max(0, Math.min(20, qty)) } : l)));
  const addMed = (m: Med) => {
    const unit = m.minPriceFcfa ?? m.indicativePriceFcfa;
    if (unit == null) return;
    setLines((ls) => (ls.some((l) => l.key === m.id) ? ls : [...ls, { key: m.id, label: `${m.dci} ${m.strength} (${m.form})`, unit, qty: 1, kind: 'med' }]));
    setQ('');
    setResults([]);
  };

  const total = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const arch = covered ? Math.round(total * ARCH_RATE) : 0;
  const rest = total - arch;

  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {lines.map((l) => (
          <li key={l.key} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{l.label}</span>
              <span className="block text-sm text-[var(--fg-muted)]">{fcfa(l.unit)} l’unité{l.kind === 'med' ? ' (prix le plus bas relevé)' : ''}</span>
            </span>
            <span className="flex items-center gap-1">
              <button type="button" className="chip-round" aria-label={`Moins : ${l.label}`} onClick={() => setQty(l.key, l.qty - 1)}><Minus size={18} aria-hidden /></button>
              <span className="num w-8 text-center text-lg font-bold" aria-label={`Quantité : ${l.qty}`}>{l.qty}</span>
              <button type="button" className="chip-round" aria-label={`Plus : ${l.label}`} onClick={() => setQty(l.key, l.qty + 1)}><Plus size={18} aria-hidden /></button>
              {l.kind === 'med' && (
                <button type="button" className="chip-round" aria-label={`Retirer ${l.label}`} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}><Trash2 size={18} aria-hidden /></button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <label htmlFor="med-q" className="block font-bold">Ajouter un médicament</label>
        <div className="relative">
          <Search size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--fg-muted)]" />
          <input id="med-q" className="input !pl-12" placeholder="Ex. : paracétamol, amoxicilline" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
        {searching && <p role="status" className="text-base text-[var(--fg-muted)]">Recherche…</p>}
        {error && <p role="alert" className="text-base font-bold text-[var(--color-ocre-700)]">{error}</p>}
        {results.length > 0 && (
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {results.map((m) => {
              const price = m.minPriceFcfa ?? m.indicativePriceFcfa;
              return (
                <li key={m.id}>
                  <button type="button" disabled={price == null} onClick={() => addMed(m)} className="flex min-h-14 w-full items-center justify-between gap-3 p-3 text-left hover:bg-[var(--bg)] disabled:opacity-60">
                    <span>
                      <span className="block font-bold">{m.dci} {m.strength}</span>
                      <span className="block text-sm text-[var(--fg-muted)]">{m.form} · {m.pharmaciesInStock} pharmacie{m.pharmaciesInStock > 1 ? 's' : ''} en stock</span>
                    </span>
                    <span className="num font-bold">{price == null ? 'prix inconnu' : fcfa(price)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-[var(--bg)] p-4">
          <dt className="label">Coût estimé</dt>
          <dd className="num text-2xl font-bold">{fcfa(total)}</dd>
        </div>
        <div className="rounded-2xl bg-[var(--color-brand-100)] p-4 text-[var(--color-brand-900)]">
          <dt className="text-sm font-bold">Pris en charge ARCH</dt>
          <dd className="num text-2xl font-bold">{fcfa(arch)}</dd>
        </div>
        <div className="rounded-2xl bg-[var(--color-brand-900)] p-4 text-white">
          <dt className="text-sm font-bold">Reste à payer</dt>
          <dd className="num text-3xl font-bold">{fcfa(rest)}</dd>
        </div>
      </dl>
      <p className="text-sm text-[var(--fg-muted)]">Tarifs des actes et taux ARCH ({Math.round(ARCH_RATE * 100)} %) fictifs. Prix des médicaments : relevés de la démonstration.</p>

      <Payment amount={rest} />
    </div>
  );
}

function Payment({ amount }: { amount: number }) {
  const [op, setOp] = useState(OPERATORS[0]);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'form' | 'wait' | 'done'>('form');
  const [ref, setRef] = useState('');

  if (step === 'done') {
    return (
      <div role="status" className="flex items-start gap-3 rounded-3xl bg-[var(--color-brand-100)] p-5 text-[var(--color-brand-900)]">
        <CheckCircle2 size={28} aria-hidden className="shrink-0" />
        <div>
          <p className="text-xl font-bold">Paiement simulé réussi</p>
          <p>Référence <span className="num font-bold">{ref}</span> · {fcfa(amount)} via {op}. Bac à sable : aucune somme n’a été débitée.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => setStep('form')}>Recommencer</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-3 rounded-3xl border border-dashed border-[var(--color-ocre-500)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setStep('wait');
        window.setTimeout(() => {
          setRef(`DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
          setStep('done');
        }, 1500);
      }}
    >
      <h3 className="flex items-center gap-2 text-lg font-bold"><Smartphone size={20} aria-hidden /> Payer le reste par mobile money (bac à sable)</h3>
      <fieldset>
        <legend className="mb-2 font-bold">Opérateur</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {OPERATORS.map((o) => (
            <button key={o} type="button" aria-pressed={op === o} onClick={() => setOp(o)} className={`btn ${op === o ? 'btn-primary' : 'btn-ghost'}`}>{o}</button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1 block font-bold">Numéro de téléphone (fictif pour la démonstration)</span>
        <input className="input num" inputMode="tel" placeholder="01 90 00 00 01" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <p className="text-sm text-[var(--fg-muted)]">Dans la vraie version, vous confirmez sur votre propre téléphone avec votre code secret : Ganji ne le demande jamais.</p>
      <button type="submit" className="btn btn-primary w-full" disabled={amount <= 0 || step === 'wait' || phone.replace(/\D/g, '').length < 8}>
        {step === 'wait' ? 'En attente de confirmation sur le téléphone…' : `Payer ${fcfa(amount)} (simulation)`}
      </button>
    </form>
  );
}
