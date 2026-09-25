'use client';
import { CheckCircle2, Clock, QrCode, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QrClient } from '@/components/QrClient';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { hourOnly, SCOPE_LABEL } from '../../_lib/labels';
import type { ConsentView, ShareResult } from './types';

const SCOPES = [
  { key: 'summary', hint: 'Groupe sanguin, allergies, traitement' },
  { key: 'timeline', hint: 'Consultations, hospitalisations, transfusions' },
  { key: 'observations', hint: 'Courbes de vos analyses' },
  { key: 'documents', hint: 'Photos de résultats, comptes rendus' },
  { key: 'prescriptions', hint: 'Médicaments prescrits' },
] as const;
const DURATIONS = [1, 24, 72] as const;

type Phase = { kind: 'choose' } | { kind: 'waiting'; share: ShareResult } | { kind: 'granted'; share: ShareResult; consent: ConsentView } | { kind: 'expired' };

export function ShareFlow() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [scopes, setScopes] = useState<string[]>(SCOPES.map((s) => s.key));
  const [sensitive, setSensitive] = useState(false);
  const [hours, setHours] = useState<number>(24);
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (k: string) => setScopes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const share = await api<ShareResult>('/me/share', { method: 'POST', json: { scopes: sensitive ? [...scopes, 'sensitive'] : scopes, hours } });
      setPhase({ kind: 'waiting', share });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau : le partage demande une connexion. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(share: ShareResult) {
    await api(`/me/consents/${share.id}`, { method: 'DELETE' }).catch(() => undefined);
    setPhase({ kind: 'choose' });
  }

  // Attente du scan : on interroge l'API toutes les 3 s (démo sans WebSocket).
  const waiting = phase.kind === 'waiting' ? phase.share : null;
  useEffect(() => {
    if (!waiting) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      if (Date.now() > new Date(waiting.scanBefore).getTime()) {
        setPhase({ kind: 'expired' });
        return;
      }
      try {
        const list = await api<ConsentView[]>('/me/consents');
        const c = list.find((x) => x.id === waiting.id && x.active);
        if (c && !stop) {
          setPhase({ kind: 'granted', share: waiting, consent: c });
          router.refresh();
        }
      } catch {
        /* réseau instable : on réessaie au prochain tour */
      }
    };
    const t = window.setInterval(() => void tick(), 3000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [waiting, router]);

  if (phase.kind === 'waiting') {
    const { share } = phase;
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-xl font-bold">{t('Montrez ce code au soignant')}</p>
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-[var(--border)]">
          <QrClient value={share.qrPayload} size={280} label={t('QR de partage de votre carnet, à scanner par le soignant')} />
        </div>
        <div>
          <p className="label">{t('Ou dictez ce code')}</p>
          <p className="num font-sans text-5xl font-bold tracking-[.2em]" aria-label={t('Code : {code}', { code: share.shareCode.split('').join(' ') })}>
            {share.shareCode.slice(0, 3)} {share.shareCode.slice(3)}
          </p>
        </div>
        <p className="flex items-center gap-2 rounded-full bg-[var(--color-ocre-100)] px-4 py-2 font-bold text-[var(--color-ocre-700)]">
          <Clock size={18} aria-hidden /> {t('À scanner avant {time}', { time: hourOnly(share.scanBefore, locale) })}
        </p>
        <p role="status" aria-live="polite" className="text-base text-[var(--fg-muted)]">
          {t('En attente du scan… Accès prévu pour {h} h : {list}.', {
            h: share.hours,
            list: [...scopes.map((s) => t(SCOPE_LABEL[s]).toLowerCase()), ...(sensitive ? [t('données très sensibles')] : [])].join(', '),
          })}
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void cancel(share)}>{t('Annuler ce partage')}</button>
      </div>
    );
  }

  if (phase.kind === 'granted') {
    const { consent } = phase;
    return (
      <div role="status" className="space-y-4 text-center">
        <CheckCircle2 size={56} aria-hidden className="mx-auto text-[var(--color-brand-700)]" />
        <p className="text-2xl font-bold">{t('{who} a maintenant accès jusqu’à {date}.', { who: consent.grantee ?? t('Le soignant'), date: fmtDateTime(consent.expiresAt, locale) })}</p>
        <p className="text-[var(--fg-muted)]">{t('Vous pouvez retirer cet accès à tout moment, juste en dessous.')}</p>
        <button type="button" className="btn btn-soft" onClick={() => setPhase({ kind: 'choose' })}>{t('Faire un autre partage')}</button>
      </div>
    );
  }

  // Résumé de ce que verra le soignant : « Tout le carnet » ou « 3 parties sur 5 ».
  const seen =
    scopes.length === SCOPES.length
      ? t('Tout le carnet')
      : scopes.length > 1
        ? t('{n} parties sur {total}', { n: scopes.length, total: SCOPES.length })
        : t('{n} partie sur {total}', { n: scopes.length, total: SCOPES.length });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      {phase.kind === 'expired' && (
        <p role="status" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">
          {t('Le QR n’a pas été scanné à temps. Il ne marche plus : créez-en un nouveau.')}
        </p>
      )}
      <details className="group rounded-3xl bg-[var(--bg)] p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm text-[var(--fg-muted)]">{t('Le soignant verra')}</span>
            <span className="block font-semibold">{sensitive ? t('{part}, très sensible compris', { part: seen }) : t('{part}, sauf le très sensible', { part: seen })}</span>
          </span>
          <span className="pill shrink-0 bg-[var(--card)]">
            <span className="group-open:hidden">{t('Modifier')}</span>
            <span className="hidden group-open:inline">{t('Fermer')}</span>
          </span>
        </summary>
      <fieldset className="mt-4">
        <legend className="sr-only">{t('Ce que le soignant pourra voir')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <label key={s.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 has-[:checked]:border-[var(--color-brand-500)] has-[:checked]:bg-[var(--color-brand-50)] has-[:checked]:text-[var(--color-brand-950)]">
              <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--color-brand-900)]" checked={scopes.includes(s.key)} onChange={() => toggle(s.key)} />
              <span>
                <span className="block font-bold">{t(SCOPE_LABEL[s.key])}</span>
                <span className="block text-sm opacity-80">{t(s.hint)}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-dashed border-[var(--color-ocre-500)] p-3">
          <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-ocre-700)]" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
          <span>
            <span className="flex items-center gap-2 font-bold"><ShieldAlert size={18} aria-hidden /> {t('Données très sensibles')}</span>
            <span className="block text-base text-[var(--fg-muted)]">
              {t('VIH, santé mentale, santé sexuelle… Non coché par défaut. Cochez seulement si ce soignant en a besoin pour vous soigner.')}
            </span>
          </span>
        </label>
      </fieldset>
      </details>

      <fieldset>
        <legend className="mb-2 font-semibold">{t('Pendant combien de temps ?')}</legend>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((h) => (
            <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)} className={`btn !min-h-14 text-lg ${hours === h ? 'btn-primary' : 'btn-ghost'}`}>
              {h === 1 ? t('1 heure') : h === 24 ? t('24 heures') : t('3 jours')}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
      <button type="submit" className="btn btn-primary w-full !min-h-14 text-lg" disabled={busy || scopes.length === 0}>
        <QrCode size={22} aria-hidden /> {busy ? t('Préparation…') : t('Montrer mon QR au soignant')}
      </button>
      {scopes.length === 0 && <p className="text-base text-[var(--fg-muted)]">{t('Cochez au moins une partie du carnet.')}</p>}
    </form>
  );
}
