'use client';
import { Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Prefs { scale?: string; theme?: string; voice?: string; simple?: boolean }

function load(): Prefs {
  try { return JSON.parse(localStorage.getItem('alafia-prefs') || '{}'); } catch { return {}; }
}
function apply(p: Prefs) {
  const d = document.documentElement;
  d.style.setProperty('--text-scale', p.scale ?? '1');
  if (p.theme) d.dataset.theme = p.theme; else delete d.dataset.theme;
  if (p.voice) d.dataset.voice = p.voice; else delete d.dataset.voice;
  if (p.simple) d.dataset.simple = '1'; else delete d.dataset.simple;
  try { localStorage.setItem('alafia-prefs', JSON.stringify(p)); } catch {}
  window.dispatchEvent(new Event('alafia-prefs'));
}

/** Réglages d'accessibilité : taille du texte jusqu'à 200 %, thème, langue de la voix, mode simple. */
export function PrefsMenu() {
  const [p, setP] = useState<Prefs>({});
  useEffect(() => setP(load()), []);
  const set = (patch: Prefs) => { const n = { ...p, ...patch }; setP(n); apply(n); };

  return (
    <details className="relative">
      <summary className="chip-round cursor-pointer list-none" aria-label="Réglages d’affichage et de voix" title="Réglages">
        <Settings2 size={20} aria-hidden />
      </summary>
      <div className="card absolute right-0 z-40 mt-2 w-72 space-y-4 p-4 shadow-lg">
        <fieldset>
          <legend className="label mb-2">Taille du texte</legend>
          <div className="grid grid-cols-4 gap-1">
            {['1', '1.25', '1.5', '2'].map((s) => (
              <button key={s} type="button" onClick={() => set({ scale: s })} aria-pressed={(p.scale ?? '1') === s} className={`btn !min-h-10 !px-0 ${(p.scale ?? '1') === s ? 'btn-primary' : 'btn-ghost'}`}>
                {Math.round(Number(s) * 100)}%
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2">Thème</legend>
          <div className="grid grid-cols-3 gap-1">
            {[['', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => set({ theme: v || undefined })} aria-pressed={(p.theme ?? '') === v} className={`btn !min-h-10 !px-0 text-sm ${(p.theme ?? '') === v ? 'btn-primary' : 'btn-ghost'}`}>{l}</button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="label mb-2 block">Langue de la voix</span>
          <select className="input" value={p.voice ?? 'fr'} onChange={(e) => set({ voice: e.target.value })}>
            <option value="fr">Français</option>
            <option value="fon">Fon (Fɔngbè)</option>
            <option value="yoruba">Yoruba</option>
            <option value="bariba">Bariba (Baatonum)</option>
            <option value="dendi">Dendi</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-bold">Mode simple<br /><span className="text-sm font-normal text-[var(--fg-muted)]">4 grosses actions seulement</span></span>
          <input type="checkbox" className="h-6 w-6 accent-[var(--color-brand-900)]" checked={!!p.simple} onChange={(e) => set({ simple: e.target.checked })} />
        </label>
      </div>
    </details>
  );
}
