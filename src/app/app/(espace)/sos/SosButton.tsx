'use client';
import { CheckCircle2, Navigation, Phone, Siren } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { fmtKm } from '@/lib/places';

interface Place { id: string; name: string; shortName: string | null; phone: string | null; commune: string; lat: number; lng: number; distanceKm: number | null }
interface SosResult { notified: number; places: Place[] }

function position(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60_000, enableHighAccuracy: true },
    );
  });
}

export function SosButton() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<(SosResult & { located: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setStep('sending');
    setError(null);
    const pos = await position();
    try {
      const r = await api<SosResult>('/emergency/sos', { method: 'POST', json: pos ?? {} });
      setResult({ ...r, located: !!pos });
      setStep('done');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'L’alerte n’est pas partie (pas de réseau). Appelez le 118 ou envoyez un SMS à un proche.');
      setStep('idle');
    }
  }

  if (step === 'done' && result) {
    return (
      <div className="space-y-5" role="alert">
        <div className="flex items-start gap-4 rounded-3xl bg-[var(--color-brand-900)] p-5 text-white">
          <CheckCircle2 size={36} aria-hidden className="shrink-0" />
          <div>
            <p className="text-2xl font-bold">Vos proches et le relais sont prévenus</p>
            <p className="text-lg">
              {result.notified} message{result.notified > 1 ? 's' : ''} envoyé{result.notified > 1 ? 's' : ''}
              {result.located ? ', avec votre position.' : '. Position non partagée.'} Restez où vous êtes si vous pouvez.
            </p>
          </div>
        </div>
        <a href="tel:118" className="btn btn-danger w-full !min-h-16 text-xl"><Phone size={24} aria-hidden /> Appeler les pompiers : 118</a>
        {result.places.length > 0 && (
          <div>
            <h2 className="mb-2 text-xl font-bold">Urgences ouvertes les plus proches</h2>
            <ul className="space-y-2">
              {result.places.map((p) => (
                <li key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">{p.shortName ?? p.name}</span>
                    <span className="block text-base text-[var(--fg-muted)]">
                      {p.commune}
                      {p.distanceKm != null && <> · <span className="num">{fmtKm(p.distanceKm)}</span></>}
                    </span>
                  </span>
                  {p.phone && <a href={`tel:${p.phone}`} className="btn btn-ghost"><Phone size={18} aria-hidden /> Appeler</a>}
                  <a href={`https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <Navigation size={18} aria-hidden /> Itinéraire
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {step === 'confirm' ? (
        <div className="w-full max-w-md space-y-3 text-center">
          <p className="text-2xl font-bold">Prévenir vos proches et le relais maintenant ?</p>
          <button type="button" className="btn btn-danger w-full !min-h-16 text-xl" onClick={() => void send()} autoFocus>
            <Siren size={26} aria-hidden /> Oui, envoyer l’alerte
          </button>
          <button type="button" className="btn btn-ghost w-full" onClick={() => setStep('idle')}>Annuler</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setStep('confirm')}
          disabled={step === 'sending'}
          className="grid h-56 w-56 place-items-center rounded-full bg-[var(--color-danger-600)] text-white shadow-[0_0_0_16px_var(--color-danger-50)] transition-transform active:scale-95 disabled:opacity-70"
          aria-describedby="sos-aide"
        >
          <span className="flex flex-col items-center gap-1">
            <Siren size={56} aria-hidden />
            <span className="text-5xl font-bold tracking-wider">{step === 'sending' ? '…' : 'SOS'}</span>
          </span>
        </button>
      )}
      <p id="sos-aide" role="status" className="max-w-md text-center text-lg text-[var(--fg-muted)]">
        {step === 'sending' ? 'Envoi de l’alerte… (recherche de votre position, 5 secondes au plus)' : 'Un SMS part vers votre personne à prévenir, vos aidants et le relais de votre commune, avec votre position si vous l’acceptez.'}
      </p>
      {error && <p role="alert" className="w-full max-w-md rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
      <a href="tel:118" className="btn btn-ghost"><Phone size={20} aria-hidden /> Ou appelez le 118</a>
    </div>
  );
}
