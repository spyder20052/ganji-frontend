'use client';
import { Navigation, Phone, Siren } from 'lucide-react';
import { useState } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { api, ApiError } from '@/lib/api';

export interface DangerSign { code: string; label: string; pictogram: string; urgency: 'urgence' | 'consulter' | string }
interface Place { id: string; name: string; shortName: string | null; phone: string | null; commune: string; lat: number; lng: number; distanceKm: number | null }
interface Result { urgent: boolean; advice: string[]; places: Place[]; notified: number; recorded: { code: string; label: string; urgency: string }[] }

/** Pictogrammes du catalogue absents de la bibliothèque d'icônes. */
const ALIAS: Record<string, string> = { breathing: 'breath', urine: 'water-loss' };

export function DangerSigns({ pregnancyId, catalogue }: { pregnancyId: string; catalogue: DangerSign[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (c: string) => setPicked((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  async function send() {
    setBusy(true);
    setError(null);
    try {
      setResult(await api<Result>(`/maternal/pregnancy/${pregnancyId}/danger-signs`, { method: 'POST', json: { codes: picked } }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Pas de réseau. Si vous avez un de ces signes, allez tout de suite à la maternité ou appelez le 118.');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4" role="alert">
        {result.urgent ? (
          <div className="rounded-3xl bg-[var(--color-danger-600)] p-5 text-white">
            <p className="flex items-center gap-3 text-2xl font-bold"><Siren size={30} aria-hidden /> Allez à la maternité maintenant</p>
            {result.notified > 0 && <p className="mt-2 text-lg">Votre relais et vos proches sont prévenus ({result.notified} message{result.notified > 1 ? 's' : ''}).</p>}
          </div>
        ) : (
          <div className="rounded-3xl bg-[var(--color-ocre-100)] p-5 text-[var(--color-ocre-700)]">
            <p className="text-2xl font-bold">Consultez dans les 24 heures</p>
          </div>
        )}
        <ul className="list-disc space-y-1 pl-6 text-lg">
          {result.advice.map((a) => <li key={a}>{a}</li>)}
        </ul>
        {result.places.length > 0 && (
          <div>
            <h3 className="mb-2 text-lg font-bold">Maternités ouvertes jour et nuit</h3>
            <ul className="space-y-2">
              {result.places.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{p.shortName ?? p.name}</span>
                    <span className="block text-base text-[var(--fg-muted)]">
                      {p.commune}
                      {p.distanceKm != null && <> · <span className="num">{p.distanceKm < 10 ? p.distanceKm.toFixed(1) : Math.round(p.distanceKm)} km</span></>}
                    </span>
                  </span>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="btn btn-ghost" aria-label={`Appeler ${p.shortName ?? p.name}`}>
                      <Phone size={18} aria-hidden /> Appeler
                    </a>
                  )}
                  <a href={`https://www.openstreetmap.org/directions?to=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <Navigation size={18} aria-hidden /> Itinéraire
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <a href="tel:118" className="btn btn-danger"><Phone size={20} aria-hidden /> Appeler le 118</a>
          <button type="button" className="btn btn-ghost" onClick={() => { setResult(null); setPicked([]); }}>Signaler autre chose</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {catalogue.map((s) => {
          const on = picked.includes(s.code);
          return (
            <li key={s.code}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(s.code)}
                className={`flex h-full min-h-32 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 p-3 text-center font-bold transition-colors ${on ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
              >
                <span className={`grid h-14 w-14 place-items-center rounded-full ${on ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
                  <Pictogram name={ALIAS[s.pictogram] ?? s.pictogram} size={28} />
                </span>
                <span className="text-base leading-snug">{s.label}</span>
                {on && <span className="text-sm">Choisi</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
      <button type="button" className="btn btn-danger w-full !min-h-14 text-lg" disabled={busy || picked.length === 0} onClick={() => void send()}>
        {busy ? 'Envoi…' : picked.length ? `J’ai ce${picked.length > 1 ? 's' : ''} signe${picked.length > 1 ? 's' : ''} : que faire ?` : 'Touchez le ou les signes que vous avez'}
      </button>
    </div>
  );
}
