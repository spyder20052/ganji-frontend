'use client';
import { Lock, LockOpen, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { hasSealed, openLocal, sealLocal, wipeLocal } from '@/lib/secure-store';
import type { Summary } from '@/lib/types';
import { CARD_KEY } from '../../_lib/emergency-card';

const FAILS_KEY = 'ganji-pin-fails';
const MAX_FAILS = 5;
const PIN_RE = /^\d{4,6}$/;

function fails() {
  try { return Number(localStorage.getItem(FAILS_KEY) || '0'); } catch { return 0; }
}
function setFails(n: number) {
  try { if (n) localStorage.setItem(FAILS_KEY, String(n)); else localStorage.removeItem(FAILS_KEY); } catch {}
}

/** Carnet hors ligne chiffré sur le téléphone (AES-GCM, clé dérivée du PIN, jamais stockée). */
/**
 * `unlockOnly` : page hors ligne, où l'on ne peut qu'ouvrir la copie (la créer demande le réseau).
 */
export function OfflinePin({ unlockOnly = false }: { unlockOnly?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [sealed, setSealed] = useState(false);
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [opened, setOpened] = useState<{ data: Summary; at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSealed(hasSealed('summary'));
    setSupported(!!globalThis.crypto?.subtle);
  }, []);

  async function seal() {
    if (!PIN_RE.test(pin)) return setMsg({ ok: false, text: t('Le code PIN doit avoir 4 à 6 chiffres.') });
    if (pin !== pin2) return setMsg({ ok: false, text: t('Les deux codes ne sont pas pareils.') });
    setBusy(true);
    setMsg(null);
    try {
      const summary = await api<Summary>('/me/summary');
      await sealLocal('summary', pin, summary);
      setFails(0);
      setSealed(true);
      setPin('');
      setPin2('');
      setMsg({ ok: true, text: t('Copie protégée enregistrée. Vous pourrez l’ouvrir sans réseau avec votre code PIN.') });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : t('Il faut du réseau pour préparer la copie. Réessayez.') });
    } finally {
      setBusy(false);
    }
  }

  async function unlock() {
    setBusy(true);
    setMsg(null);
    try {
      const box = await openLocal<Summary>('summary', unlockPin);
      setFails(0);
      setOpened(box);
      setUnlockPin('');
    } catch {
      const n = fails() + 1;
      if (n >= MAX_FAILS) {
        wipeLocal();
        setFails(0);
        setSealed(false);
        setMsg({ ok: false, text: t('Trop d’erreurs : la copie a été effacée pour vous protéger. Recréez-la avec du réseau.') });
      } else {
        setFails(n);
        const left = MAX_FAILS - n;
        setMsg({
          ok: false,
          text:
            left > 1
              ? t('Code PIN incorrect. Encore {n} essais avant effacement de la copie.', { n: left })
              : t('Code PIN incorrect. Encore {n} essai avant effacement de la copie.', { n: left }),
        });
      }
    } finally {
      setBusy(false);
    }
  }

  function wipe() {
    if (!window.confirm(t('Effacer de ce téléphone la copie protégée du carnet et la carte d’urgence ?'))) return;
    wipeLocal();
    try { localStorage.removeItem(CARD_KEY); } catch {}
    setFails(0);
    setSealed(false);
    setOpened(null);
    setMsg({ ok: true, text: t('Données effacées de ce téléphone. Votre carnet reste en sécurité sur Ganji.') });
  }

  if (!supported) return <p className="text-base text-[var(--fg-muted)]">{t('Ce navigateur ne permet pas le chiffrement local. Utilisez un navigateur récent.')}</p>;

  if (opened) {
    const s = opened.data;
    return (
      <div className="space-y-3">
        <p role="status" className="text-base text-[var(--fg-muted)]">{t('Copie hors ligne du {date}', { date: fmtDateTime(opened.at, locale) })}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-[var(--color-danger-50)] p-4 text-[var(--color-danger-800)]"><dt className="text-sm font-bold">{t('Groupe sanguin')}</dt><dd className="num text-4xl font-bold">{s.bloodGroup ?? '?'}</dd></div>
          <div className="rounded-2xl bg-[var(--bg)] p-4"><dt className="label">{t('Allergies')}</dt><dd className="font-bold">{s.allergies.length ? s.allergies.join(', ') : t('Aucune connue')}</dd></div>
          <div className="rounded-2xl bg-[var(--bg)] p-4"><dt className="label">{t('Traitement')}</dt><dd className="font-bold">{s.treatments ?? t('Aucun renseigné')}</dd></div>
          <div className="rounded-2xl bg-[var(--bg)] p-4"><dt className="label">{t('Maladies suivies')}</dt><dd className="font-bold">{s.conditions.map((c) => c.label ?? c.code).join(', ') || t('Aucune')}</dd></div>
          <div className="rounded-2xl bg-[var(--bg)] p-4"><dt className="label">{t('Personne à prévenir')}</dt><dd className="font-bold">{s.emergencyContact ? `${s.emergencyContact.name} ${s.emergencyContact.phone ?? ''}` : t('Non renseignée')}</dd></div>
          <div className="rounded-2xl bg-[var(--bg)] p-4">
            <dt className="label">{t('Rendez-vous')}</dt>
            <dd className="font-bold">{s.nextReminders.length ? s.nextReminders.map((r) => `${r.title} (${fmtDate(r.dueAt, { day: 'numeric', month: 'short' }, locale)})`).join(' · ') : t('Aucun')}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-primary" onClick={() => setOpened(null)}><Lock size={20} aria-hidden /> {t('Refermer')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sealed ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void unlock(); }}>
          <label className="block">
            <span className="mb-1 block font-bold">{t('Code PIN pour ouvrir la copie hors ligne')}</span>
            <input className="input num max-w-xs text-center text-2xl tracking-[.4em]" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={unlockPin} onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary" disabled={busy || unlockPin.length < 4}><LockOpen size={20} aria-hidden /> {busy ? t('Ouverture…') : t('Ouvrir')}</button>
            <button type="button" className="btn btn-ghost" onClick={wipe}><Trash2 size={20} aria-hidden /> {t('Effacer de ce téléphone')}</button>
          </div>
        </form>
      ) : (
        <p className="text-base text-[var(--fg-muted)]">
          {t('Aucune copie protégée sur ce téléphone pour le moment.')}
          {unlockOnly && ` ${t('Quand vous avez du réseau, créez-la dans « Aidants et réglages ».')}`}
        </p>
      )}

      {!unlockOnly && (
      <details className="rounded-2xl bg-[var(--bg)] p-4" open={!sealed}>
        <summary className="cursor-pointer font-bold">{sealed ? t('Mettre à jour la copie ou changer de code') : t('Créer une copie protégée par code PIN')}</summary>
        <form className="mt-3 space-y-3" onSubmit={(e) => { e.preventDefault(); void seal(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-bold">{t('Nouveau code (4 à 6 chiffres)')}</span>
              <input className="input num text-center text-2xl tracking-[.4em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold">{t('Le même code encore')}</span>
              <input className="input num text-center text-2xl tracking-[.4em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} />
            </label>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">{t('Le code n’est jamais envoyé ni gardé : sans lui, personne ne peut lire la copie, pas même Ganji. Après {n} erreurs, la copie s’efface.', { n: MAX_FAILS })}</p>
          <button type="submit" className="btn btn-primary" disabled={busy || pin.length < 4}><Lock size={20} aria-hidden /> {busy ? t('Chiffrement…') : t('Protéger et enregistrer')}</button>
        </form>
      </details>
      )}

      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-2xl p-3 font-bold ${msg.ok ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
