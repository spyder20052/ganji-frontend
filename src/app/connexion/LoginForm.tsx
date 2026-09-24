'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { ROLE_HOME, type Me } from '@/lib/types';

type Step = 'phone' | 'code' | 'register';

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [reg, setReg] = useState({ npi: '', firstName: '', lastName: '', birthDate: '', sex: 'F' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof ApiError ? e.message : 'Connexion impossible. Vérifiez votre réseau.'); } finally { setBusy(false); }
  }

  const requestCode = () => run(async () => { await api('/auth/otp/request', { method: 'POST', json: { phone } }); setStep('code'); });
  const verify = () => run(async () => {
    const me = await api<Me>('/auth/otp/verify', { method: 'POST', json: { phone, code } });
    router.push(ROLE_HOME[me.role]);
    router.refresh();
  });
  const register = () => run(async () => { await api('/auth/register', { method: 'POST', json: { ...reg, phone } }); setStep('code'); });

  return (
    <div className="card space-y-5 p-6">
      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); void requestCode(); }} className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-bold">Votre numéro de téléphone</span>
            <input id="phone" className="input text-xl tracking-wider" inputMode="tel" autoComplete="tel" placeholder="01 90 00 00 01" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <button className="btn btn-primary w-full" disabled={busy || phone.replace(/\D/g, '').length < 8}>Recevoir un code par SMS</button>
          <p className="text-base text-[var(--fg-muted)]">Pas encore de carnet ? <button type="button" className="font-bold underline" onClick={() => setStep('register')}>Créer mon carnet avec mon NPI</button></p>
        </form>
      )}

      {step === 'register' && (
        <form onSubmit={(e) => { e.preventDefault(); void register(); }} className="space-y-3">
          <p className="text-base text-[var(--fg-muted)]">Votre NPI (numéro personnel d’identification, 10 chiffres) relie votre carnet à votre identité. Il n’est jamais stocké en clair.</p>
          <input className="input" aria-label="NPI" placeholder="NPI (10 chiffres)" inputMode="numeric" maxLength={10} value={reg.npi} onChange={(e) => setReg({ ...reg, npi: e.target.value.replace(/\D/g, '') })} required />
          <input className="input" aria-label="Téléphone" placeholder="Téléphone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" aria-label="Prénom" placeholder="Prénom" value={reg.firstName} onChange={(e) => setReg({ ...reg, firstName: e.target.value })} required />
            <input className="input" aria-label="Nom" placeholder="Nom" value={reg.lastName} onChange={(e) => setReg({ ...reg, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="label">Date de naissance</span><input type="date" className="input" value={reg.birthDate} onChange={(e) => setReg({ ...reg, birthDate: e.target.value })} required /></label>
            <label className="block"><span className="label">Sexe</span>
              <select className="input" value={reg.sex} onChange={(e) => setReg({ ...reg, sex: e.target.value })}><option value="F">Femme</option><option value="M">Homme</option></select>
            </label>
          </div>
          <p className="text-sm text-[var(--fg-muted)]">Pas encore de NPI (nouveau-né, visiteur) ? Un relais ou un centre de santé peut créer un identifiant provisoire Ganji, rattaché au NPI plus tard sans perte de données.</p>
          <button className="btn btn-primary w-full" disabled={busy}>Créer mon carnet</button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setStep('phone')}>J’ai déjà un carnet</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={(e) => { e.preventDefault(); void verify(); }} className="space-y-4">
          <p>Code envoyé au <strong className="num">{phone}</strong>. Il expire dans 5 minutes.</p>
          <label className="block">
            <span className="mb-1 block font-bold">Code à 6 chiffres</span>
            <input id="otp" className="input num text-center text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
          </label>
          <button className="btn btn-primary w-full" disabled={busy || code.length !== 6}>Me connecter</button>
          <p className="rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base text-[var(--color-ocre-700)]">
            Démo : le SMS arrive dans le <Link href={`/simulateur?tel=${encodeURIComponent(phone)}`} target="_blank" className="font-bold underline">simulateur de téléphone</Link>.
          </p>
          <button type="button" className="btn btn-ghost w-full" onClick={() => { setStep('phone'); setCode(''); }}>Changer de numéro</button>
        </form>
      )}

      {error && <p role="alert" className="rounded-2xl bg-[var(--color-danger-50)] p-3 font-bold text-[var(--color-danger-800)]">{error}</p>}
    </div>
  );
}
