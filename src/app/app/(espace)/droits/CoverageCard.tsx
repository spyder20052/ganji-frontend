'use client';
import { BadgeCheck, Hourglass, Loader2, RefreshCw, ShieldQuestion, ShieldCheck, Users, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { nextStepKey, SCHEME_LABEL, type CoverageView, type Scheme } from './_lib/rights';

const SCHEMES: { id: Scheme; label: string; Icon: typeof ShieldCheck }[] = [
  { id: 'ARCH', label: 'ARCH', Icon: ShieldCheck },
  { id: 'MUTUELLE', label: 'Mutuelle', Icon: Users },
  { id: 'AUCUNE', label: 'Aucune', Icon: XCircle },
];

/**
 * Carte de couverture santé : à la manière d'une carte d'assuré (taux en grand, numéro, validité).
 * Déclarer puis vérifier auprès du registre (adaptateur d'interopérabilité ; bac à sable en démonstration).
 */
export function CoverageCard({ initial }: { initial: CoverageView }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [scheme, setScheme] = useState<Scheme>(initial.scheme ?? 'ARCH');
  const [number, setNumber] = useState(initial.number ?? '');
  const [busy, setBusy] = useState<'verify' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy('verify');
    setError(null);
    try {
      setC(await api<CoverageView>('/me/coverage/verify', { method: 'POST' }));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Vérification impossible sans réseau. Réessayez.');
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save');
    setError(null);
    try {
      let next = await api<CoverageView>('/me/coverage', { method: 'PUT', json: scheme === 'AUCUNE' ? { scheme } : { scheme, number: number.trim() } });
      // Déclarer, c'est aussi vérifier tout de suite : une seule action pour la personne.
      if (scheme !== 'AUCUNE') next = await api<CoverageView>('/me/coverage/verify', { method: 'POST' });
      setC(next);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Enregistrement impossible sans réseau. Réessayez.');
    } finally {
      setBusy(null);
    }
  }

  const step = nextStepKey(c);
  const verifiedOn = c.verifiedAt ? fmtDate(c.verifiedAt, { day: 'numeric', month: 'short' }, locale) : null;

  if (editing) {
    return (
      <form onSubmit={save} className="card space-y-4 p-5" aria-labelledby="h-declarer">
        <h2 id="h-declarer" className="text-xl font-semibold">{t('Ma couverture santé')}</h2>
        <fieldset>
          <legend className="sr-only">{t('Type de couverture')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {SCHEMES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={scheme === id}
                onClick={() => setScheme(id)}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-base font-semibold ${scheme === id ? 'bg-[var(--color-brand-900)] text-white' : 'bg-[var(--bg)] text-[var(--fg)]'}`}
              >
                <Icon size={24} aria-hidden />
                {t(label)}
              </button>
            ))}
          </div>
        </fieldset>
        {scheme !== 'AUCUNE' && (
          <label className="block">
            <span className="label mb-1 block">{scheme === 'ARCH' ? t('Numéro sur la carte ARCH') : t('Numéro de la carte de mutuelle')}</span>
            <input
              className="input font-sans text-xl tracking-wide"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder={scheme === 'ARCH' ? 'ARCH-12345678' : 'MS-00000'}
              autoComplete="off"
              autoCapitalize="characters"
              required
              minLength={4}
              maxLength={30}
            />
          </label>
        )}
        {error && <p role="alert" className="font-semibold text-[var(--color-ocre-700)]">{t(error)}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={busy !== null || (scheme !== 'AUCUNE' && number.trim().length < 4)}>
            {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <BadgeCheck size={20} aria-hidden />}
            {scheme === 'AUCUNE' ? t('Enregistrer') : t('Vérifier')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>{t('Annuler')}</button>
        </div>
      </form>
    );
  }

  const listen =
    c.status === 'ACTIF'
      ? t('Vous êtes couvert par {scheme} : {rate} % de vos soins sont pris en charge.', { scheme: t(SCHEME_LABEL[c.scheme ?? 'ARCH']), rate: c.rate })
      : [t('Pas encore de prise en charge.'), step ? t(step) : ''].join(' ');

  // ── Couvert : la carte d'assuré ──
  if (c.status === 'ACTIF') {
    return (
      <section aria-labelledby="h-couverture" className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-brand-900)] p-5 text-white sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="h-couverture" className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck size={22} aria-hidden className="text-[var(--color-leaf)]" />
            {t(SCHEME_LABEL[c.scheme ?? 'ARCH'])}
          </h2>
          <span className="pill bg-[var(--color-leaf)] text-[var(--color-ink)]">
            <BadgeCheck size={16} aria-hidden /> {t('Actif')}
          </span>
        </div>
        <p className="mt-5 flex items-end gap-3">
          <span className="display text-[4.5rem] leading-none font-light text-[var(--color-leaf)]">{c.rate}&nbsp;%</span>
          <span className="pb-2 text-lg text-white/85">{t('pris en charge')}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-white/15 pt-4">
          <p className="font-sans text-xl tracking-[0.08em]">{c.number}</p>
          {c.validUntil && <p className="text-base text-white/80">{t('jusqu’au {date}', { date: fmtDate(c.validUntil, { day: 'numeric', month: 'short', year: 'numeric' }, locale) })}</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ListenButton text={listen} compact />
          <button type="button" onClick={verify} disabled={busy !== null} className="btn !min-h-12 bg-white/10 text-white hover:bg-white/20">
            {busy === 'verify' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <RefreshCw size={18} aria-hidden />}
            {t('Vérifier')}
          </button>
          <button type="button" onClick={() => setEditing(true)} className="btn !min-h-12 text-white/85 underline-offset-4 hover:underline">
            {t('Modifier')}
          </button>
        </div>
        <p className="mt-2 text-sm text-white/70">
          {verifiedOn ? t('Vérification (bac à sable) · {date}', { date: verifiedOn }) : t('Vérification (bac à sable)')}
        </p>
        {error && <p role="alert" className="mt-2 font-semibold text-[var(--color-leaf)]">{t(error)}</p>}
      </section>
    );
  }

  // ── Pas couvert, ou en attente ──
  const pending = c.status === 'EN_ATTENTE';
  return (
    <section aria-labelledby="h-couverture" className={`rounded-[var(--radius-card)] p-5 sm:p-6 ${pending ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'card'}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${pending ? 'bg-white/60 text-[var(--color-ocre-700)] dark:bg-black/20' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
          {pending ? <Hourglass size={24} aria-hidden /> : <ShieldQuestion size={24} aria-hidden />}
        </span>
        <h2 id="h-couverture" className="min-w-0 flex-1 text-xl font-semibold">
          {pending ? t('Couverture en attente') : t('Pas de couverture')}
        </h2>
        <ListenButton text={listen} compact />
      </div>
      {c.number && (
        <p className="mt-3 font-sans text-lg tracking-wide break-all">
          {c.scheme === 'ARCH' ? c.number : `${t(SCHEME_LABEL[c.scheme ?? 'MUTUELLE'])} · ${c.number}`}
        </p>
      )}
      {step && <p className={`mt-1 text-base ${pending ? '' : 'text-[var(--fg-muted)]'}`}>{t(step)}</p>}
      {error && <p role="alert" className="mt-3 font-semibold">{t(error)}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {pending ? (
          <>
            <button type="button" onClick={verify} disabled={busy !== null} className="btn btn-primary flex-1">
              {busy === 'verify' ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <RefreshCw size={20} aria-hidden />}
              {t('Vérifier')}
            </button>
            <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost">{t('Modifier')}</button>
          </>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-primary w-full sm:w-auto">
            <ShieldCheck size={20} aria-hidden /> {t('Déclarer ma couverture')}
          </button>
        )}
      </div>
      {pending && c.source === 'VERIFIE' && (
        <p className="mt-2 text-sm">{verifiedOn ? t('Vérification (bac à sable) · {date}', { date: verifiedOn }) : t('Vérification (bac à sable)')}</p>
      )}
    </section>
  );
}
