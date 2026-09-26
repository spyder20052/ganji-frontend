'use client';
import { Bike, Check, CircleX, KeyRound, Loader2, PackageCheck, RefreshCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fcfa } from '@/lib/format';
import type { PharmacyOrderStatus } from './types';

type Form = null | 'refuse' | 'dispatch' | 'deliver' | 'fail';
const REASONS = ['Rupture de stock', 'Ordonnance à présenter au comptoir', 'Trop loin pour livrer'];
const FAIL_REASONS = ['Patient absent', 'Adresse introuvable', 'Code bloqué', 'Ordonnance expirée'];
const PICKUP_FAIL_REASONS = ['Patient pas venu', 'Code bloqué', 'Ordonnance expirée'];

/**
 * Actions de l'officine sur une commande, selon son statut : accepter ou refuser, prête,
 * confier au livreur (nom + téléphone), remise contre le code à 4 chiffres du patient.
 */
export function OrderActions({
  id,
  status,
  mode,
  next,
  attemptsLeft,
  newCodesLeft,
  cash,
}: {
  id: string;
  status: PharmacyOrderStatus;
  mode: 'LIVRAISON' | 'RETRAIT';
  next: PharmacyOrderStatus[];
  attemptsLeft: number;
  /** Nouveaux codes que l'on peut encore faire envoyer au patient (0 si aucune remise n'est attendue). */
  newCodesLeft: number;
  /** Montant à encaisser en espèces à la remise (null si déjà payé). */
  cash: number | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [form, setForm] = useState<Form>(null);
  const [reason, setReason] = useState('');
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!next.length) return null;

  async function act(action: 'accept' | 'refuse' | 'ready' | 'dispatch' | 'deliver' | 'fail' | 'new-code', json?: unknown) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      await api(`/pharmacy/orders/${id}/${action}`, { method: 'POST', ...(json ? { json } : {}) });
      setForm(null);
      setCode('');
      setReason('');
      if (action === 'new-code') setOk(t('Nouveau code envoyé au patient par SMS.'));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Action non enregistrée (réseau). Réessayez.'));
      if (action === 'deliver') router.refresh(); // essais restants
    } finally {
      setBusy(false);
    }
  }

  const spinner = busy ? <Loader2 size={20} aria-hidden className="animate-spin" /> : null;
  // Retrait prêt : si le patient ne vient pas, c'est « Non retirée » (pas un refus) ; un seul bouton secondaire.
  const canRefuse = next.includes('REFUSEE') && !(status === 'PRETE' && mode === 'RETRAIT');
  // Échec de remise : livreur revenu sans remettre, ou patient jamais venu au comptoir.
  const canFail = next.includes('ECHEC') && (status === 'EN_LIVRAISON' || (status === 'PRETE' && mode === 'RETRAIT'));
  const locked = attemptsLeft === 0;

  return (
    <div className="space-y-3 border-t border-[var(--border)] pt-4">
      {form === null && (
        <div className="flex flex-wrap gap-2">
          {status === 'RECUE' && (
            <button type="button" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy} onClick={() => act('accept')}>
              {spinner ?? <Check size={20} aria-hidden />} {t('Accepter')}
            </button>
          )}
          {status === 'ACCEPTEE' && (
            <button type="button" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy} onClick={() => act('ready')}>
              {spinner ?? <PackageCheck size={20} aria-hidden />} {t('Prête')}
            </button>
          )}
          {status === 'PRETE' && mode === 'LIVRAISON' && (
            <button type="button" className="btn btn-primary flex-1 whitespace-nowrap" onClick={() => setForm('dispatch')}>
              <Bike size={20} aria-hidden /> {t('Confier au livreur')}
            </button>
          )}
          {((status === 'PRETE' && mode === 'RETRAIT') || status === 'EN_LIVRAISON') && (
            <button type="button" className="btn btn-primary flex-1 whitespace-nowrap" onClick={() => setForm('deliver')} disabled={attemptsLeft === 0}>
              <KeyRound size={20} aria-hidden /> {t('Saisir le code')}
            </button>
          )}
          {canRefuse && (
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm('refuse')}>
              <X size={20} aria-hidden /> {t('Refuser')}
            </button>
          )}
          {canFail && (
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm('fail')}>
              <CircleX size={20} aria-hidden /> {mode === 'LIVRAISON' ? t('Échec de livraison') : t('Non retirée')}
            </button>
          )}
        </div>
      )}

      {form === null && locked && (
        <div role="status" className="space-y-2 rounded-2xl bg-[var(--color-ocre-100)] p-3 text-[var(--color-ocre-700)]">
          <p className="font-bold">{t('Remise bloquée : 5 codes faux.')}</p>
          {newCodesLeft > 0 ? (
            <button type="button" className="btn btn-ghost whitespace-nowrap" disabled={busy} onClick={() => act('new-code')}>
              {spinner ?? <RefreshCw size={20} aria-hidden />} {t('Nouveau code')}
            </button>
          ) : (
            <p>{t('Plus de nouveau code possible : déclarez l’échec de remise.')}</p>
          )}
        </div>
      )}

      {form === 'fail' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act('fail', { reason: reason.trim() });
          }}
        >
          <p className="font-bold">{t('Que s’est-il passé ?')}</p>
          <div className="flex flex-wrap gap-2">
            {(mode === 'LIVRAISON' ? FAIL_REASONS : PICKUP_FAIL_REASONS).map((r) => (
              <button key={r} type="button" aria-pressed={reason === t(r)} className={`btn !min-h-11 text-base ${reason === t(r) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setReason(t(r))}>
                {t(r)}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label mb-1 block">{t('Raison (le patient la verra)')}</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required minLength={3} />
          </label>
          <p className="text-sm text-[var(--fg-muted)]">{t('Le stock revient, le mobile money est remboursé, le patient peut commander à nouveau.')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy || reason.trim().length < 3}>{spinner} {t('Confirmer l’échec')}</button>
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm(null)}>{t('Retour')}</button>
          </div>
        </form>
      )}

      {form === 'refuse' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act('refuse', { reason: reason.trim() });
          }}
        >
          <p className="font-bold">{t('Pourquoi refuser ?')}</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button key={r} type="button" aria-pressed={reason === t(r)} className={`btn !min-h-11 text-base ${reason === t(r) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setReason(t(r))}>
                {t(r)}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="label mb-1 block">{t('Raison (le patient la verra)')}</span>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} required minLength={3} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy || reason.trim().length < 3}>{spinner} {t('Refuser la commande')}</button>
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm(null)}>{t('Retour')}</button>
          </div>
        </form>
      )}

      {form === 'dispatch' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act('dispatch', { courierName: courierName.trim(), courierPhone: courierPhone.replace(/[\s.-]/g, '') });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label mb-1 block">{t('Nom du livreur')}</span>
              <input className="input" value={courierName} onChange={(e) => setCourierName(e.target.value)} autoComplete="off" required minLength={2} maxLength={40} />
            </label>
            <label className="block">
              <span className="label mb-1 block">{t('Téléphone du livreur')}</span>
              <input className="input num" type="tel" inputMode="tel" value={courierPhone} onChange={(e) => setCourierPhone(e.target.value.replace(/[^\d ]/g, ''))} required placeholder="01 97 00 00 00" />
            </label>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">{t('Le patient reçoit ce nom et ce numéro par SMS.')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy}>{spinner ?? <Bike size={20} aria-hidden />} {t('Confier au livreur')}</button>
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm(null)}>{t('Retour')}</button>
          </div>
        </form>
      )}

      {form === 'deliver' && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act('deliver', { code });
          }}
        >
          <label className="block">
            <span className="mb-1 block font-bold">{t('Code à 4 chiffres donné par le patient')}</span>
            <input
              className="input num font-sans !min-h-16 max-w-56 text-center text-4xl tracking-[.4em]"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              aria-describedby={`essais-${id}`}
              required
            />
          </label>
          <p id={`essais-${id}`} className="text-sm text-[var(--fg-muted)]">
            {attemptsLeft > 1 ? t('{n} essais possibles.', { n: attemptsLeft }) : t('{n} essai possible.', { n: attemptsLeft })}
          </p>
          {cash != null && (
            <p className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{t('Encaisser {amount} en espèces.', { amount: fcfa(cash, locale) })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-primary flex-1 whitespace-nowrap" disabled={busy || code.length !== 4}>{spinner ?? <Check size={20} aria-hidden />} {t('Valider la remise')}</button>
            <button type="button" className="btn btn-ghost whitespace-nowrap" onClick={() => setForm(null)}>{t('Retour')}</button>
          </div>
        </form>
      )}

      {ok && <p role="status" className="rounded-2xl bg-[var(--color-brand-100)] p-3 text-base font-bold text-[var(--color-brand-900)]">{ok}</p>}
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base font-bold text-[var(--color-ocre-700)]">{t(error)}</p>}
    </div>
  );
}
