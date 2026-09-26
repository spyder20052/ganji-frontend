'use client';
import { Check, Loader2, Minus, Pill, Plus, Search, Smartphone, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { actIcon, CATEGORIES, isBlood, PROVIDERS, SCHEME_LABEL, type CoverageView, type Estimate, type PaymentView, type Provider, type Tariff } from './_lib/rights';

interface Med { id: string; dci: string; form: string; strength: string; indicativePriceFcfa: number | null; minPriceFcfa: number | null; pharmaciesInStock: number }
interface MedPick { id: string; label: string; qty: number }

const MAX_QTY = 30;

/**
 * « Combien vais-je payer ? » : on touche les soins prévus (pictogrammes par catégorie), on ajoute ses
 * médicaments, et le serveur calcule total, part prise en charge et reste à payer. Puis on paie.
 */
export function CostEstimator({ tariffs, coverage, phone }: { tariffs: Tariff[]; coverage: CoverageView; phone: string | null }) {
  const t = useT();
  const locale = useLocale();
  const [category, setCategory] = useState<Tariff['category']>('CONSULTATION');
  const [acts, setActs] = useState<Record<string, number>>({});
  const [meds, setMeds] = useState<MedPick[]>([]);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  /** Relance du calcul (estimation expirée au moment de payer). */
  const [round, setRound] = useState(0);

  const byCode = useMemo(() => new Map(tariffs.map((x) => [x.code, x])), [tariffs]);
  const empty = Object.keys(acts).length === 0 && meds.length === 0;

  // Estimation par le serveur à chaque changement (grille officielle, prix médians relevés en pharmacie, taux vérifié).
  useEffect(() => {
    if (empty) {
      setEstimate(null);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setEstimate(
          await api<Estimate>('/me/rights/estimate', {
            method: 'POST',
            json: { acts: Object.entries(acts).map(([code, qty]) => ({ code, qty })), medications: meds.map((m) => ({ medicationId: m.id, quantity: m.qty })) },
          }),
        );
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Estimation impossible sans réseau. Réessayez.');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [acts, meds, empty, round]);

  const toggleAct = (code: string) =>
    setActs((a) => {
      const next = { ...a };
      if (next[code]) delete next[code];
      else next[code] = 1;
      return next;
    });
  const setActQty = (code: string, qty: number) =>
    setActs((a) => {
      const next = { ...a };
      if (qty <= 0) delete next[code];
      else next[code] = Math.min(MAX_QTY, qty);
      return next;
    });
  const setMedQty = (id: string, qty: number) => setMeds((ms) => (qty <= 0 ? ms.filter((m) => m.id !== id) : ms.map((m) => (m.id === id ? { ...m, qty: Math.min(MAX_QTY, qty) } : m))));

  const lineOf = (code: string) => estimate?.lines.find((l) => l.code === code);
  const count = Object.keys(acts).length + meds.length;
  const rate = coverage.status === 'ACTIF' ? coverage.rate : 0;
  const covered = estimate?.coveredFcfa ?? 0;
  const total = estimate?.totalFcfa ?? 0;
  const rest = estimate?.remainderFcfa ?? 0;
  const coveredPct = total > 0 ? Math.round((covered / total) * 100) : 0;
  const summary = estimate
    ? covered > 0
      ? t('Total {total}. {scheme} paie {covered}. Il vous reste {rest} à payer.', { total: fcfa(total, locale), scheme: t(SCHEME_LABEL[coverage.scheme ?? 'ARCH']), covered: fcfa(covered, locale), rest: fcfa(rest, locale) })
      : t('Total {total}, à payer par vous.', { total: fcfa(total, locale) })
    : '';
  return (
    <div className="space-y-5">
      {/* Catégories : un pictogramme, un mot. */}
      <div role="group" aria-label={t('Type de soin')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {CATEGORIES.map(({ id, label: l, Icon }) => {
          const n = tariffs.filter((x) => x.category === id && acts[x.code]).length;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              className={`relative flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 text-base font-semibold ${category === id ? 'bg-[var(--color-brand-900)] text-white' : 'bg-[var(--bg)] text-[var(--fg)]'}`}
            >
              <Icon size={20} aria-hidden />
              {t(l)}
              {n > 0 && <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-[var(--color-leaf)] px-1 text-sm text-[var(--color-ink)]">{n}</span>}
            </button>
          );
        })}
      </div>

      <ul aria-label={t(CATEGORIES.find((c) => c.id === category)!.label)} className="divide-y divide-[var(--border)] overflow-hidden rounded-3xl bg-[var(--bg)]">
        {tariffs
          .filter((x) => x.category === category)
          .map((x) => {
            const Icon = actIcon(x);
            const on = !!acts[x.code];
            const blood = isBlood(x.code);
            return (
              <li key={x.code}>
                <button type="button" aria-pressed={on} onClick={() => toggleAct(x.code)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left">
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${blood ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]' : 'bg-[var(--card)] text-[var(--color-brand-700)]'}`}
                  >
                    <Icon size={22} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-snug">{t(x.label)}</span>
                    <span className="num block text-base text-[var(--fg-muted)]">{x.priceFcfa === 0 ? t('Gratuit') : fcfa(x.priceFcfa, locale)}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${on ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)] text-[var(--fg)] ring-1 ring-[var(--border)]'}`}
                  >
                    {on ? <Check size={20} /> : <Plus size={20} />}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>

      <MedicineSearch onAdd={(m) => setMeds((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, { id: m.id, label: `${m.dci} ${m.strength}`, qty: 1 }]))} />

      {/* Ma liste : quantités, puis le partage entre la couverture et la personne. */}
      {!empty && (
        <section aria-labelledby="h-liste" className="space-y-3">
          <h3 id="h-liste" className="text-lg font-semibold">{t('Ma liste ({n})', { n: count })}</h3>
          <ul className="space-y-2">
            {Object.entries(acts).map(([code, qty]) => {
              const x = byCode.get(code);
              if (!x) return null;
              return <Row key={code} label={t(x.label)} unit={x.priceFcfa} qty={qty} onQty={(q) => setActQty(code, q)} />;
            })}
            {meds.map((m) => (
              <Row key={m.id} label={m.label} unit={lineOf(m.id)?.unitPriceFcfa ?? null} qty={m.qty} onQty={(q) => setMedQty(m.id, q)} medicine pending={loading && !lineOf(m.id)} />
            ))}
          </ul>

          {error && <p role="alert" className="font-semibold text-[var(--color-ocre-700)]">{t(error)}</p>}

          {estimate && (
            <div className={`space-y-3 rounded-3xl bg-[var(--card)] p-4 shadow-[var(--shadow-soft)] transition-opacity ${loading ? 'opacity-60' : ''}`} aria-live="polite">
              {/* Signature : la barre partagée, lisible sans lire les chiffres. */}
              <div className="flex h-5 w-full overflow-hidden rounded-full bg-[var(--color-brand-900)] dark:bg-[var(--color-brand-700)]" role="img" aria-label={summary}>
                {coveredPct > 0 && <span className="h-full bg-[var(--color-leaf)]" style={{ width: `${coveredPct}%` }} />}
              </div>
              <div className="flex items-start justify-between gap-3 text-base">
                <span>
                  <span className="flex items-center gap-2 font-semibold">
                    <span aria-hidden className="h-3 w-3 rounded-full bg-[var(--color-leaf)]" />
                    {covered > 0 ? t('{scheme} {rate} %', { scheme: t(SCHEME_LABEL[coverage.scheme ?? 'ARCH']), rate }) : t('Sans couverture')}
                  </span>
                  <span className="num text-[var(--fg-muted)]">{covered > 0 ? `− ${fcfa(covered, locale)}` : t('Déclarez-la plus haut')}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[var(--fg-muted)]">{t('Total')}</span>
                  <span className="num">{fcfa(total, locale)}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
                <p>
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <span aria-hidden className="h-3 w-3 rounded-full bg-[var(--color-brand-900)] ring-1 ring-[var(--border)] dark:bg-[var(--color-brand-700)]" />
                    {t('À payer')}
                  </span>
                  <span className="display num block text-[2.75rem] font-light">{fcfa(rest, locale)}</span>
                </p>
                <ListenButton text={summary} compact />
              </div>
              {estimate.unknownPrices > 0 && (
                <p className="text-base text-[var(--color-ocre-700)]">{t('Prix inconnu pour un médicament : demandez-le au pharmacien.')}</p>
              )}
              {!paying && (
                <button type="button" className="btn btn-primary w-full" disabled={rest <= 0 || loading} onClick={() => setPaying(true)}>
                  <Smartphone size={20} aria-hidden /> {t('Payer {amount}', { amount: fcfa(rest, locale) })}
                </button>
              )}
            </div>
          )}

          {paying && estimate?.token && rest > 0 && (
            <PaySheet amount={rest} token={estimate.token} phone={phone} onClose={() => setPaying(false)} onExpired={() => setRound((n) => n + 1)} />
          )}
        </section>
      )}
    </div>
  );
}

function Row({ label, unit, qty, onQty, medicine = false, pending = false }: { label: string; unit: number | null; qty: number; onQty: (q: number) => void; medicine?: boolean; pending?: boolean }) {
  const t = useT();
  const locale = useLocale();
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
      {medicine && <Pill size={20} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />}
      <span className="min-w-0 flex-1">
        <span className="block leading-snug">{label}</span>
        <span className="num block text-base text-[var(--fg-muted)]">
          {pending ? '…' : unit === null ? t('prix inconnu') : medicine ? t('{price} (prix moyen en pharmacie)', { price: fcfa(unit, locale) }) : fcfa(unit, locale)}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <button type="button" className="chip-round" aria-label={qty === 1 ? t('Retirer {label}', { label }) : t('Moins : {label}', { label })} onClick={() => onQty(qty - 1)}>
          {qty === 1 ? <Trash2 size={18} aria-hidden /> : <Minus size={18} aria-hidden />}
        </button>
        <span className="num w-8 text-center text-lg font-semibold" aria-label={t('Quantité : {qty}', { qty })}>{qty}</span>
        <button type="button" className="chip-round" aria-label={t('Plus : {label}', { label })} onClick={() => onQty(qty + 1)} disabled={qty >= MAX_QTY}>
          <Plus size={18} aria-hidden />
        </button>
      </span>
    </li>
  );
}

function MedicineSearch({ onAdd }: { onAdd: (m: Med) => void }) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Med[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
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
    return () => window.clearTimeout(timer);
  }, [q]);

  return (
    <div className="space-y-2">
      <label htmlFor="med-q" className="flex items-center gap-2 font-semibold">
        <Pill size={20} aria-hidden className="text-[var(--color-brand-700)]" /> {t('Médicaments')}
      </label>
      <div className="relative">
        <Search size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--fg-muted)]" />
        <input ref={input} id="med-q" type="search" className="input !pl-12 !pr-12" placeholder={t('Ex. : paracétamol')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        {q && (
          <button type="button" className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full" aria-label={t('Effacer')} onClick={() => { setQ(''); input.current?.focus(); }}>
            <X size={18} aria-hidden />
          </button>
        )}
      </div>
      {searching && <p role="status" className="text-base text-[var(--fg-muted)]"><Loader2 size={16} className="mr-1 inline animate-spin" aria-hidden />{t('Recherche…')}</p>}
      {error && <p role="alert" className="text-base font-semibold text-[var(--color-ocre-700)]">{t(error)}</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
          {results.map((m) => {
            const price = m.minPriceFcfa ?? m.indicativePriceFcfa;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(m);
                    setQ('');
                    setResults([]);
                  }}
                  className="flex min-h-14 w-full items-center gap-3 p-3 text-left hover:bg-[var(--bg)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{m.dci} {m.strength}</span>
                    <span className="block text-base text-[var(--fg-muted)]">{m.form}</span>
                  </span>
                  <span className="num shrink-0 text-base">{price == null ? t('prix inconnu') : t('dès {price}', { price: fcfa(price, locale) })}</span>
                  <Plus size={20} aria-hidden className="shrink-0" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Paiement du reste à charge : opérateur, numéro, confirmation. Bac à sable : rien n'est débité. */
function PaySheet({ amount, token, phone, onClose, onExpired }: { amount: number; token: string; phone: string | null; onClose: () => void; onExpired: () => void }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>('MTN_MOMO');
  // Numéro du compte pré-rempli seulement s'il est complet (l'API peut le renvoyer masqué).
  const [tel, setTel] = useState(phone && /^\d{10}$/.test(phone) ? phone.replace(/(\d{2})(?=\d)/g, '$1 ') : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = tel.replace(/\D/g, '');

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Le montant et le libellé viennent de l'estimation signée par le serveur, pas du téléphone.
      const p = await api<PaymentView>('/me/payments', { method: 'POST', json: { estimateToken: token, provider, phone: tel } });
      router.push(`/app/droits/recu/${p.receipt}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_PAID') {
        const receipt = /GJ-\d{4}-\d{6}/.exec(err.message)?.[0];
        if (receipt) return router.push(`/app/droits/recu/${receipt}`);
      }
      // Estimation expirée ou invalide : on recalcule, la personne vérifie le montant et paie de nouveau.
      if (err instanceof ApiError && (err.code === 'ESTIMATE_EXPIRED' || err.code === 'ESTIMATE_INVALID')) onExpired();
      setError(err instanceof ApiError ? err.message : 'Paiement impossible sans réseau. Rien n’a été débité.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={pay} className="space-y-4 rounded-3xl bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]" aria-labelledby="h-payer">
      <div className="flex items-center justify-between gap-3">
        <h3 id="h-payer" className="text-lg font-semibold">{t('Payer {amount}', { amount: fcfa(amount, locale) })}</h3>
        <button type="button" onClick={onClose} className="grid h-12 w-12 place-items-center rounded-full" aria-label={t('Annuler')}>
          <X size={20} aria-hidden />
        </button>
      </div>
      <fieldset>
        <legend className="label mb-2">{t('Opérateur')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={provider === p.id}
              aria-label={p.name}
              onClick={() => setProvider(p.id)}
              className={`flex min-h-16 flex-col items-center justify-center rounded-2xl px-1 text-lg font-semibold ${provider === p.id ? 'bg-[var(--color-brand-900)] text-white ring-2 ring-[var(--color-leaf)]' : 'bg-[var(--bg)] text-[var(--fg)]'}`}
            >
              {p.short}
              <span className={`text-sm font-normal ${provider === p.id ? 'text-white/80' : 'text-[var(--fg-muted)]'}`}>{p.id === 'MTN_MOMO' ? 'MoMo' : p.id === 'MOOV_MONEY' ? 'Money' : 'Cash'}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="label mb-1 block">{t('Numéro qui paie')}</span>
        <input className="input num font-sans text-xl tracking-wide" inputMode="tel" autoComplete="tel" placeholder="01 90 00 00 01" value={tel} onChange={(e) => setTel(e.target.value)} required />
      </label>
      {error && <p role="alert" className="font-semibold text-[var(--color-ocre-700)]">{t(error)}</p>}
      <button type="submit" className="btn btn-primary w-full" disabled={busy || digits.length < 8}>
        {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Smartphone size={20} aria-hidden />}
        {busy ? t('Confirmation…') : t('Payer {amount}', { amount: fcfa(amount, locale) })}
      </button>
      <p className="text-sm text-[var(--fg-muted)]">{t('Bac à sable : rien n’est débité. Ganji ne demande jamais votre code secret.')}</p>
    </form>
  );
}
