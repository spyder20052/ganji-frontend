'use client';
import { Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { LOCALE_COOKIE, type Locale } from '@/i18n/translate';

/** Voix en langues nationales : synthèse à valider, ou enregistrement à venir (docs/ENREGISTREMENTS.md). */
const VOICES = [
  ['yoruba', 'Yoruba', 'voix de synthèse'],
  ['fon', 'Fon (Fɔngbè)', 'bientôt'],
  ['bariba', 'Bariba (Baatonum)', 'bientôt'],
  ['dendi', 'Dendi', 'bientôt'],
] as const;

interface Prefs { scale?: string; theme?: string; voice?: string; simple?: boolean }

function load(): Prefs {
  try { return JSON.parse(localStorage.getItem('ganji-prefs') || '{}'); } catch { return {}; }
}
function apply(p: Prefs) {
  const d = document.documentElement;
  d.style.setProperty('--text-scale', p.scale ?? '1');
  if (p.theme) d.dataset.theme = p.theme; else delete d.dataset.theme;
  if (p.voice) d.dataset.voice = p.voice; else delete d.dataset.voice;
  if (p.simple) d.dataset.simple = '1'; else delete d.dataset.simple;
  try { localStorage.setItem('ganji-prefs', JSON.stringify(p)); } catch {}
  window.dispatchEvent(new Event('ganji-prefs'));
}

/** Langue de l'interface : cookie lu par le serveur, puis la page est rechargée dans la nouvelle langue. */
function setLocale(l: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/** Réglages d'accessibilité : langue, taille du texte jusqu'à 200 %, thème, langue de la voix, mode simple. */
export function PrefsMenu() {
  const t = useT();
  const locale = useLocale();
  const [p, setP] = useState<Prefs>({});
  useEffect(() => setP(load()), []);
  const set = (patch: Prefs) => { const n = { ...p, ...patch }; setP(n); apply(n); };

  return (
    <details className="relative">
      <summary className="chip-round cursor-pointer list-none" aria-label={t('Réglages d’affichage et de voix')} title={t('Réglages')}>
        <Settings2 size={20} aria-hidden />
      </summary>
      <div className="card absolute right-0 z-40 mt-2 w-72 space-y-4 p-4 shadow-lg">
        <fieldset>
          {/* Toujours dans les deux langues : on la retrouve même sans lire celle affichée. */}
          <legend className="label mb-2" lang="fr">
            Langue · <span lang="en">Language</span>
          </legend>
          <div className="grid grid-cols-2 gap-1">
            {([['fr', 'Français'], ['en', 'English']] as const).map(([v, l]) => (
              <button key={v} type="button" lang={v} onClick={() => v !== locale && setLocale(v)} aria-pressed={locale === v} className={`btn !min-h-10 !px-0 text-sm ${locale === v ? 'btn-primary' : 'btn-ghost'}`}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2">{t('Taille du texte')}</legend>
          <div className="grid grid-cols-4 gap-1">
            {['1', '1.25', '1.5', '2'].map((s) => (
              <button key={s} type="button" onClick={() => set({ scale: s })} aria-pressed={(p.scale ?? '1') === s} className={`btn !min-h-10 !px-0 ${(p.scale ?? '1') === s ? 'btn-primary' : 'btn-ghost'}`}>
                {Math.round(Number(s) * 100)}%
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label mb-2">{t('Thème')}</legend>
          <div className="grid grid-cols-3 gap-1">
            {[['', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => (
              <button key={l} type="button" onClick={() => set({ theme: v || undefined })} aria-pressed={(p.theme ?? '') === v} className={`btn !min-h-10 !px-0 text-sm ${(p.theme ?? '') === v ? 'btn-primary' : 'btn-ghost'}`}>{t(l)}</button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="label mb-2 block">{t('Langue de la voix')}</span>
          <select className="input" value={p.voice && p.voice !== 'fr' ? p.voice : ''} onChange={(e) => set({ voice: e.target.value || undefined })}>
            <option value="">{t('Comme l’interface')}</option>
            {VOICES.map(([v, name, status]) => (
              <option key={v} value={v}>
                {name} · {t(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-bold">{t('Mode simple')}<br /><span className="text-sm font-normal text-[var(--fg-muted)]">{t('4 grosses actions seulement')}</span></span>
          <input type="checkbox" className="h-6 w-6 accent-[var(--color-brand-900)]" checked={!!p.simple} onChange={(e) => set({ simple: e.target.checked })} />
        </label>
      </div>
    </details>
  );
}
