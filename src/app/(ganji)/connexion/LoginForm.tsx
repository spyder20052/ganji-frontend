'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CommuneSelect } from '@/components/CommuneSelect';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ROLE_HOME, type Me } from '@/lib/types';

type Step = 'phone' | 'code' | 'register';

export function LoginForm({ suite }: { suite?: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [reg, setReg] = useState({ npi: '', firstName: '', lastName: '', birthDate: '', sex: 'F', commune: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Connexion impossible. Vérifiez votre réseau.'); } finally { setBusy(false); }
  }

  const [noAccount, setNoAccount] = useState(false);
  // Démo : l'API dit si le numéro a un compte (les remises à zéro de la démo effacent les comptes créés).
  const requestCode = () => run(async () => {
    const r = await api<{ account?: boolean }>('/auth/otp/request', { method: 'POST', json: { phone } });
    if (r.account === false) {
      setNoAccount(true);
      setStep('register');
      return;
    }
    setStep('code');
  });
  const verify = () => run(async () => {
    const me = await api<Me & { profileDone?: boolean }>('/auth/otp/verify', { method: 'POST', json: { phone, code } });
    const target = suite?.startsWith(ROLE_HOME[me.role]) ? suite : ROLE_HOME[me.role];
    // Première connexion d'un carnet encore vide : l'accueil en cinq questions, puis la page visée.
    const welcome = (me.role === 'PATIENT' || me.role === 'CAREGIVER') && me.profileDone === false;
    router.push(welcome ? `/app/bienvenue${target !== '/app' ? `?suite=${encodeURIComponent(target)}` : ''}` : target);
    router.refresh();
  });
  const register = () => run(async () => {
    const { commune, ...rest } = reg;
    await api('/auth/register', { method: 'POST', json: { ...rest, phone, lang: locale, ...(commune ? { commune } : {}) } });
    setStep('code');
  });

  return (
    <div className="card space-y-5 p-6">
      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); void requestCode(); }} className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-bold">{t('Votre numéro de téléphone')}</span>
            <input id="phone" className="input text-xl tracking-wider" inputMode="tel" autoComplete="tel" placeholder="01 90 00 00 01" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <button className="btn btn-primary w-full" disabled={busy || phone.replace(/\D/g, '').length < 8}>{t('Recevoir un code par SMS')}</button>
          <p className="text-base text-[var(--fg-muted)]">{t('Pas encore de carnet ?')} <button type="button" className="font-bold underline" onClick={() => setStep('register')}>{t('Créer mon carnet avec mon NPI')}</button></p>
        </form>
      )}

      {step === 'register' && noAccount && (
        <p role="status" className="rounded-2xl bg-[var(--color-ocre-100)] px-4 py-3 text-base text-[var(--color-ocre-700)]">
          {t('Aucun carnet avec ce numéro (la démo est remise à zéro à chaque mise à jour). Créez-le en une minute.')}
        </p>
      )}
      {step === 'register' && (
        <form onSubmit={(e) => { e.preventDefault(); void register(); }} className="space-y-3">
          <p className="text-base text-[var(--fg-muted)]">{t('Votre NPI (numéro personnel d’identification, 10 chiffres) relie votre carnet à votre identité. Il n’est jamais stocké en clair.')}</p>
          <label className="block">
            <span className="label mb-1.5 block">{t('NPI (10 chiffres)')}</span>
            <input className="input num text-lg tracking-wider" inputMode="numeric" autoComplete="off" maxLength={10} value={reg.npi} onChange={(e) => setReg({ ...reg, npi: e.target.value.replace(/\D/g, '') })} required />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">{t('Téléphone')}</span>
            <input className="input num text-lg tracking-wider" inputMode="tel" autoComplete="tel" placeholder="01 90 00 00 01" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label mb-1.5 block">{t('Prénom')}</span><input className="input" autoComplete="given-name" value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} required /></label>
            <label className="block"><span className="label mb-1.5 block">{t('Nom')}</span><input className="input" autoComplete="family-name" value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} required /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label mb-1.5 block">{t('Date de naissance')}</span><input type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={reg.birthDate} onChange={(e) => setReg({ ...reg, birthDate: e.target.value })} required /></label>
            <label className="block"><span className="label mb-1.5 block">{t('Sexe')}</span>
              <select className="input" value={reg.sex} onChange={(e) => setReg({ ...reg, sex: e.target.value })}><option value="F">{t('Femme')}</option><option value="M">{t('Homme')}</option></select>
            </label>
          </div>
          <CommuneSelect id="reg-commune" value={reg.commune} onChange={(name) => setReg({ ...reg, commune: name })} label={t('Ma commune')} />
          <p className="text-sm text-[var(--fg-muted)]">{t('Pas encore de NPI (nouveau-né, visiteur) ? Un relais ou un centre de santé peut créer un identifiant provisoire Ganji, rattaché au NPI plus tard sans perte de données.')}</p>
          <button className="btn btn-primary w-full" disabled={busy}>{t('Créer mon carnet')}</button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setStep('phone')}>{t('J’ai déjà un carnet')}</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-4">
          <p>{t('Code envoyé au')} <strong className="num">{phone}</strong>{t('. Il expire dans 5 minutes.')}</p>
          <label className="block">
            <span className="mb-1 block font-bold">{t('Code à 6 chiffres')}</span>
            <input id="otp" className="input num text-center text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
          </label>
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>{t('Me connecter')}</button>
          <p className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base text-[var(--color-ocre-700)]">
            {t('Démo : le SMS arrive dans le')} <Link href={`/simulateur?tel=${encodeURIComponent(phone)}`} target="_blank" className="font-bold underline">{t('simulateur de téléphone')}</Link>.
          </p>
          <button type="button" className="btn btn-ghost w-full" onClick={() => { setStep('phone'); setCode(''); }}>{t('Changer de numéro')}</button>
        </form>
      )}

      {error && <p role="alert" className="rounded-2xl bg-[var(--color-danger-50)] p-3 font-bold text-[var(--color-danger-800)]">{t(error)}</p>}
    </div>
  );
}
