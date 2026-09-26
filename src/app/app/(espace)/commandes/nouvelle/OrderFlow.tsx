'use client';
import { ArrowLeft, ArrowRight, Banknote, Check, Loader2, MapPin, Minus, Phone, Plus, ShieldCheck, Smartphone, Store, Truck, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CommuneSelect } from '@/components/CommuneSelect';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fcfa, fmtPhone } from '@/lib/format';
import { distanceKm, fmtKm } from '@/lib/places';
import { feeFor, OPERATORS, type Operator, type Order, type OrderMode, type OrderOptions, type OrderPayment } from '../_lib/orders';

type Step = 'mode' | 'pharmacy' | 'where' | 'pay' | 'check';
const STEPS: Step[] = ['mode', 'pharmacy', 'where', 'pay', 'check'];
const PHONE = /^(\+229)?\d{8}(\d{2})?$/;
const cleanPhone = (p: string) => p.replace(/[\s.-]/g, '');

/**
 * Commander : une question par écran (comment recevoir, quelle pharmacie, où, comment payer),
 * puis le récapitulatif. Grandes cibles, pictogrammes, un bouton « Suivant ».
 */
export function OrderFlow({ options, initialMode, initialPharmacyId }: { options: OrderOptions; initialMode?: OrderMode; initialPharmacyId?: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { fees, defaults } = options;
  const preselected = options.pharmacies.find((p) => p.id === initialPharmacyId);

  const [mode, setMode] = useState<OrderMode | null>(initialMode ?? null);
  const [pharmacyId, setPharmacyId] = useState<string | null>(preselected?.id ?? null);
  const [step, setStep] = useState<Step>(!initialMode ? 'mode' : !preselected ? 'pharmacy' : 'where');
  const [address, setAddress] = useState(defaults.address);
  const [commune, setCommune] = useState(defaults.commune);
  const [phone, setPhone] = useState(defaults.phone);
  const [instructions, setInstructions] = useState('');
  const [payment, setPayment] = useState<OrderPayment | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [payerPhone, setPayerPhone] = useState(defaults.phone);
  const [qty, setQty] = useState(options.items[0]?.quantity ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // À chaque écran, le focus va sur la question (lecteurs d'écran, clavier).
  useEffect(() => {
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);

  const free = options.source === 'LIBRE';
  // Distances depuis la commune de livraison choisie (la plus proche d'abord).
  const pharmacies = useMemo(
    () =>
      options.pharmacies
        .map((p) => {
          const km = commune ? distanceKm(commune, p) : p.distanceKm;
          return { ...p, km, deliverable: km == null || km <= fees.maxDeliveryKm, fee: feeFor('LIVRAISON', p.communeId, commune?.id, fees) };
        })
        .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || Number(b.onDuty) - Number(a.onDuty) || a.subtotalFcfa - b.subtotalFcfa),
    [options.pharmacies, commune, fees],
  );
  const pharmacy = pharmacies.find((p) => p.id === pharmacyId) ?? null;
  const subtotal = pharmacy ? (free ? pharmacy.lines[0].unitPriceFcfa * qty : pharmacy.subtotalFcfa) : 0;
  const fee = mode && pharmacy ? feeFor(mode, pharmacy.communeId, commune?.id, fees) : 0;
  const total = subtotal + fee;
  const phoneOk = PHONE.test(cleanPhone(phone));

  const valid: Record<Step, boolean> = {
    mode: mode !== null,
    pharmacy: !!pharmacy && (mode !== 'LIVRAISON' || pharmacy.deliverable),
    where: phoneOk && (mode === 'RETRAIT' || (address.trim().length >= 4 && !!commune && !!pharmacy?.deliverable)),
    pay: payment === 'ESPECES' || (payment === 'MOBILE_MONEY' && !!operator && PHONE.test(cleanPhone(payerPhone))),
    check: true,
  };
  const index = STEPS.indexOf(step);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  async function submit() {
    if (!mode || !pharmacy || !payment) return;
    setBusy(true);
    setError(null);
    try {
      const order = await api<Order>('/me/orders', {
        method: 'POST',
        json: {
          ...(options.patient.self ? {} : { patientId: options.patient.id }),
          pharmacyId: pharmacy.id,
          ...(options.prescription ? { prescriptionId: options.prescription.id } : { items: [{ medicationId: options.items[0].medicationId, quantity: qty }] }),
          mode,
          ...(mode === 'LIVRAISON' ? { address: address.trim(), communeId: commune?.id } : {}),
          phone: cleanPhone(phone),
          ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
          payment,
          ...(payment === 'MOBILE_MONEY' ? { operator, payerPhone: cleanPhone(payerPhone) } : {}),
        },
      });
      router.push(`/app/commandes/${order.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Commande non envoyée (réseau). Réessayez.'));
      setBusy(false);
    }
  }

  const what = options.items.map((i) => `${i.dci} ${i.strength}`).join(', ');
  const QUESTION: Record<Step, { title: string; icon: LucideIcon; listen: string }> = {
    mode: { title: t('Comment la recevoir ?'), icon: Truck, listen: t('Choisissez : livraison chez vous, ou retrait à la pharmacie.') },
    pharmacy: {
      title: t('Quelle pharmacie ?'),
      icon: Store,
      listen: t('Ces pharmacies ont tout en stock. La plus proche est en haut. Touchez celle que vous voulez.'),
    },
    where:
      mode === 'LIVRAISON'
        ? { title: t('Où livrer ?'), icon: MapPin, listen: t('Écrivez votre quartier et un repère. Le livreur vous appellera à ce numéro.') }
        : { title: t('Votre téléphone'), icon: Phone, listen: t('La pharmacie vous appellera à ce numéro quand la commande sera prête.') },
    pay: { title: t('Comment payer ?'), icon: Banknote, listen: t('En espèces à la remise, ou tout de suite par mobile money.') },
    check: {
      title: t('Tout est bon ?'),
      icon: Check,
      listen: t('Vérifiez puis touchez Commander. Total : {total}.', { total: fcfa(total, locale) }),
    },
  };
  const q = QUESTION[step];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Ce qui est commandé, toujours visible. */}
      <div className="flex items-center gap-3 rounded-3xl bg-[var(--card)] p-3 pr-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="pill" size={22} /></span>
        <p className="min-w-0 flex-1 text-base leading-snug">
          <span className="font-bold">{what}</span>
          {free && qty > 1 && <span className="num"> × {qty}</span>}
          {!options.patient.self && <span className="block text-[var(--fg-muted)]">{t('Pour {name}', { name: options.patient.firstName })}</span>}
        </p>
        {options.prescription && (
          <span className="pill shrink-0 bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><ShieldCheck size={16} aria-hidden /> {t('Ordonnance')}</span>
        )}
      </div>

      {/* Avancement : une pastille par question. */}
      <div className="flex items-center gap-3">
        {index > 0 ? (
          <button type="button" className="chip-round shrink-0" onClick={() => go(STEPS[index - 1])} aria-label={t('Retour')}>
            <ArrowLeft size={22} aria-hidden />
          </button>
        ) : (
          <span className="h-12 w-12 shrink-0" aria-hidden />
        )}
        <ol className="flex flex-1 items-center gap-1.5" aria-label={t('Étape {n} sur {total}', { n: index + 1, total: STEPS.length })}>
          {STEPS.map((s, i) => (
            <li key={s} className={`h-2 flex-1 rounded-full ${i < index ? 'bg-[var(--color-brand-900)] dark:bg-[var(--color-brand-200)]' : i === index ? 'bg-[var(--color-leaf)]' : 'bg-[var(--border)]'}`}>
              <span className="sr-only">{i < index ? t('fait') : i === index ? t('en cours') : t('à venir')}</span>
            </li>
          ))}
        </ol>
        <span className="num w-12 shrink-0 text-right text-base text-[var(--fg-muted)]" aria-hidden>{index + 1}/{STEPS.length}</span>
      </div>

      <section aria-labelledby="h-question" className="card space-y-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-ink)]"><q.icon size={24} aria-hidden /></span>
          <h1 id="h-question" ref={heading} tabIndex={-1} className="min-w-0 flex-1 text-[1.7rem] font-medium leading-tight outline-none">{q.title}</h1>
          <ListenButton text={q.listen} compact />
        </div>

        {step === 'mode' && (
          <div role="radiogroup" aria-labelledby="h-question" className="grid grid-cols-2 gap-3">
            <Tile name="mode" selected={mode === 'LIVRAISON'} onSelect={() => setMode('LIVRAISON')} icon={Truck} title={t('Livraison')} sub={t('chez moi · dès {fee}', { fee: fcfa(fees.sameCommune, locale) })} />
            <Tile name="mode" selected={mode === 'RETRAIT'} onSelect={() => setMode('RETRAIT')} icon={Store} title={t('Retrait')} sub={t('à la pharmacie · gratuit')} />
          </div>
        )}

        {step === 'pharmacy' && (
          <div role="radiogroup" aria-labelledby="h-question" className="space-y-3">
            {pharmacies.map((p) => {
              const selected = p.id === pharmacyId;
              const disabled = mode === 'LIVRAISON' && !p.deliverable;
              const price = free ? p.lines[0].unitPriceFcfa * qty : p.subtotalFcfa;
              return (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-3xl p-4 transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-[var(--color-brand-900)] has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60 dark:has-[input:focus-visible]:outline-[var(--color-leaf)] ${selected ? 'bg-[var(--color-brand-100)] ring-2 ring-[var(--color-brand-900)] dark:bg-[var(--color-brand-900)]/40 dark:ring-[var(--color-leaf)]' : 'bg-[var(--bg)] hover:ring-1 hover:ring-[var(--border)]'}`}
                >
                  <input type="radio" name="pharmacy" className="sr-only" checked={selected} disabled={disabled} onChange={() => setPharmacyId(p.id)} />
                  <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${selected ? 'bg-[var(--color-brand-900)] text-white dark:bg-[var(--color-leaf)] dark:text-[var(--color-ink)]' : 'ring-2 ring-[var(--border)]'}`}>
                    {selected && <Check size={18} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold leading-snug">{p.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-base text-[var(--fg-muted)]">
                      <span>{p.commune}</span>
                      {p.km != null && <span className="num">· {t('à {distance}', { distance: fmtKm(p.km) })}</span>}
                      {p.onDuty && <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">{t('De garde')}</span>}
                      {p.open24h && <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">{t('24 h/24')}</span>}
                    </span>
                    <span className="mt-2 flex flex-wrap items-baseline gap-x-2">
                      <span className="display whitespace-nowrap text-2xl">{fcfa(price, locale)}</span>
                      {mode === 'LIVRAISON' && (
                        <span className="whitespace-nowrap text-sm text-[var(--fg-muted)]">{disabled ? t('ne livre pas ici') : t('+ {fee} livraison', { fee: fcfa(p.fee, locale) })}</span>
                      )}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {step === 'where' && (
          <div className="space-y-4">
            {mode === 'LIVRAISON' ? (
              <>
                <label className="block">
                  <span className="label mb-1.5 block">{t('Quartier, rue, repère')}</span>
                  <textarea className="input !py-3" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" maxLength={200} />
                </label>
                <CommuneSelect
                  id="order-commune"
                  label={t('Commune')}
                  value={commune?.name ?? ''}
                  onChange={(_, c) => setCommune(c ? { id: c.id, name: c.name, lat: c.lat, lng: c.lng } : null)}
                />
                {pharmacy && commune && !pharmacy.deliverable && (
                  <div role="alert" className="space-y-3 rounded-3xl bg-[var(--color-ocre-100)] p-4 text-[var(--color-ocre-700)]">
                    <p className="font-bold">{t('{pharmacy} ne livre pas jusqu’à {commune}.', { pharmacy: pharmacy.name, commune: commune.name })}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-ghost" onClick={() => go('pharmacy')}>{t('Autre pharmacie')}</button>
                      <button type="button" className="btn btn-ghost" onClick={() => setMode('RETRAIT')}>{t('Retrait à la place')}</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              pharmacy && (
                <p className="flex items-start gap-3 rounded-3xl bg-[var(--bg)] p-4">
                  <Store size={22} aria-hidden className="mt-0.5 shrink-0" />
                  <span>
                    <span className="block font-bold">{pharmacy.name}</span>
                    <span className="text-base text-[var(--fg-muted)]">{pharmacy.commune}</span>
                  </span>
                </p>
              )
            )}
            <label className="block">
              <span className="label mb-1.5 block">{t('Téléphone')}</span>
              <input className="input num text-xl tracking-wide" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!phoneOk} />
            </label>
            {mode === 'LIVRAISON' && (
              <label className="block">
                <span className="label mb-1.5 block">{t('Pour le livreur (facultatif)')}</span>
                <input className="input" value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={200} placeholder={t('Ex. appeler en arrivant')} />
              </label>
            )}
          </div>
        )}

        {step === 'pay' && (
          <div className="space-y-4">
            <div role="radiogroup" aria-labelledby="h-question" className="grid grid-cols-2 gap-3">
              <Tile name="payment" selected={payment === 'ESPECES'} onSelect={() => setPayment('ESPECES')} icon={Banknote} title={t('Espèces')} sub={mode === 'LIVRAISON' ? t('au livreur') : t('au comptoir')} />
              <Tile name="payment" selected={payment === 'MOBILE_MONEY'} onSelect={() => setPayment('MOBILE_MONEY')} icon={Smartphone} title={t('Mobile money')} sub={t('maintenant')} />
            </div>
            {payment === 'MOBILE_MONEY' && (
              <div className="space-y-4">
                <div role="radiogroup" aria-label={t('Opérateur')} className="grid grid-cols-3 gap-2">
                  {OPERATORS.map((o) => (
                    <label
                      key={o.id}
                      className={`grid min-h-14 cursor-pointer place-items-center rounded-2xl px-2 text-center text-base font-bold leading-tight has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-[var(--color-brand-900)] dark:has-[input:focus-visible]:outline-[var(--color-leaf)] ${operator === o.id ? 'bg-[var(--color-brand-900)] text-white dark:bg-[var(--color-leaf)] dark:text-[var(--color-ink)]' : 'bg-[var(--bg)] ring-1 ring-[var(--border)]'}`}
                    >
                      <input type="radio" name="operator" className="sr-only" checked={operator === o.id} onChange={() => setOperator(o.id)} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <label className="block">
                  <span className="label mb-1.5 block">{t('Numéro mobile money')}</span>
                  <input className="input num text-xl tracking-wide" type="tel" inputMode="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
                </label>
              </div>
            )}
          </div>
        )}

        {step === 'check' && pharmacy && mode && payment && (
          <div className="space-y-4">
            <ul className="divide-y divide-[var(--border)] rounded-3xl bg-[var(--bg)] px-4">
              {options.items.map((i) => {
                const line = pharmacy.lines.find((l) => l.medicationId === i.medicationId);
                const n = free ? qty : i.quantity;
                return (
                  <li key={i.medicationId} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-bold">{i.dci}</span> {i.strength}
                        <span className="block text-base text-[var(--fg-muted)]">{i.form}{!free && <span className="num"> · × {n}</span>}</span>
                      </span>
                      <span className="num shrink-0 whitespace-nowrap">{fcfa((line?.unitPriceFcfa ?? 0) * n, locale)}</span>
                    </div>
                    {free && (
                      <div className="mt-2 flex items-center gap-1" role="group" aria-label={t('Quantité')}>
                        <button type="button" className="chip-round !h-12 !w-12" onClick={() => setQty((v) => Math.max(1, v - 1))} disabled={qty <= 1} aria-label={t('Une boîte de moins')}><Minus size={18} aria-hidden /></button>
                        <span className="num w-10 text-center text-xl font-bold" aria-live="polite">{qty}</span>
                        <button type="button" className="chip-round !h-12 !w-12" onClick={() => setQty((v) => Math.min(10, v + 1))} disabled={qty >= 10} aria-label={t('Une boîte de plus')}><Plus size={18} aria-hidden /></button>
                      </div>
                    )}
                  </li>
                );
              })}
              <li className="flex justify-between gap-3 py-3 text-base">
                <span className="text-[var(--fg-muted)]">{mode === 'LIVRAISON' ? t('Livraison') : t('Retrait')}</span>
                <span className="num">{fee ? fcfa(fee, locale) : t('Gratuit')}</span>
              </li>
            </ul>

            <div className="flex items-baseline justify-between gap-3 px-1">
              <span className="text-lg font-bold">{t('Total')}</span>
              <span className="display text-4xl">{fcfa(total, locale)}</span>
            </div>

            <ul className="space-y-2 text-base" aria-label={t('Récapitulatif')}>
              <Recap icon={mode === 'LIVRAISON' ? Truck : Store} label={mode === 'LIVRAISON' ? t('Livraison') : t('Retrait')} value={pharmacy.name} onChange={() => go('pharmacy')} changeLabel={t('Changer la pharmacie')} />
              <Recap
                icon={mode === 'LIVRAISON' ? MapPin : Phone}
                label={mode === 'LIVRAISON' ? t('Adresse') : t('Téléphone')}
                value={mode === 'LIVRAISON' ? `${address.trim()}, ${commune?.name ?? ''} · ${fmtPhone(cleanPhone(phone))}` : fmtPhone(cleanPhone(phone))}
                onChange={() => go('where')}
                changeLabel={mode === 'LIVRAISON' ? t('Changer l’adresse') : t('Changer le téléphone')}
              />
              <Recap
                icon={payment === 'MOBILE_MONEY' ? Smartphone : Banknote}
                label={t('Paiement')}
                value={payment === 'MOBILE_MONEY' ? `${OPERATORS.find((o) => o.id === operator)?.label ?? ''} · ${fmtPhone(cleanPhone(payerPhone))}` : mode === 'LIVRAISON' ? t('Espèces, au livreur') : t('Espèces, au comptoir')}
                onChange={() => go('pay')}
                changeLabel={t('Changer le paiement')}
              />
            </ul>
            {payment === 'MOBILE_MONEY' && <p className="text-sm text-[var(--fg-muted)]">{t('Démonstration : paiement simulé, aucun débit réel.')}</p>}
          </div>
        )}

        {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">{t(error)}</p>}

        <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
          {step !== 'mode' && step !== 'check' && pharmacy && (
            <span className="min-w-0 flex-1">
              <span className="label block">{t('Total')}</span>
              <span className="display text-2xl">{fcfa(total, locale)}</span>
            </span>
          )}
          {step === 'check' ? (
            <button type="button" className="btn btn-primary !min-h-14 flex-1 text-lg" onClick={submit} disabled={busy}>
              {busy ? <Loader2 size={22} aria-hidden className="animate-spin" /> : payment === 'MOBILE_MONEY' ? <Smartphone size={22} aria-hidden /> : <Check size={22} aria-hidden />}
              {busy ? (payment === 'MOBILE_MONEY' ? t('Paiement…') : t('Envoi…')) : payment === 'MOBILE_MONEY' ? t('Payer et commander') : t('Commander')}
            </button>
          ) : (
            <button type="button" className="btn btn-primary !min-h-14 ml-auto min-w-40 text-lg" onClick={() => go(STEPS[index + 1])} disabled={!valid[step]}>
              {t('Suivant')} <ArrowRight size={22} aria-hidden />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/** Grand choix à toucher (bouton radio natif) : pictogramme, un mot, une précision. */
function Tile({ name, selected, onSelect, icon: Icon, title, sub }: { name: string; selected: boolean; onSelect: () => void; icon: LucideIcon; title: string; sub: string }) {
  return (
    <label
      className={`relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl p-4 text-center transition-colors has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-[var(--color-brand-900)] dark:has-[input:focus-visible]:outline-[var(--color-leaf)] ${selected ? 'bg-[var(--color-leaf)] text-[var(--color-ink)] ring-2 ring-[var(--color-brand-900)]' : 'bg-[var(--bg)] hover:ring-1 hover:ring-[var(--border)]'}`}
    >
      <input type="radio" name={name} className="sr-only" checked={selected} onChange={onSelect} />
      {selected && (
        <span aria-hidden className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-[var(--color-brand-900)] text-white"><Check size={16} /></span>
      )}
      <Icon size={40} aria-hidden strokeWidth={1.75} />
      <span className="text-xl font-bold">{title}</span>
      <span className={`text-base leading-snug ${selected ? '' : 'text-[var(--fg-muted)]'}`}>{sub}</span>
    </label>
  );
}

function Recap({ icon: Icon, label, value, onChange, changeLabel }: { icon: LucideIcon; label: string; value: string; onChange: () => void; changeLabel: string }) {
  const t = useT();
  return (
    <li className="flex items-center gap-3">
      <Icon size={20} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="sr-only">{label} : </span>
        {value}
      </p>
      <button type="button" className="min-h-12 shrink-0 rounded-full px-3 font-semibold underline underline-offset-2" onClick={onChange} aria-label={changeLabel}>
        {t('Changer')}
      </button>
    </li>
  );
}
