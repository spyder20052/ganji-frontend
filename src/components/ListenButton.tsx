'use client';
import { Volume2, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { INTL } from '@/i18n/translate';

const LANG_LABEL: Record<string, string> = { fr: 'français', en: 'anglais', fon: 'fon', yoruba: 'yoruba', bariba: 'bariba', dendi: 'dendi' };
/** Voix de synthèse (traduction automatique) : à faire valider par un locuteur natif, et on le dit. */
const SYNTHETIC = new Set(['yoruba', 'fon']);

/**
 * Bouton « écouter » présent sur chaque écran patient.
 * 1. Enregistrement pré-enregistré en langue nationale (/audio/<langue>/<clé>.mp3) s'il existe ;
 * 2. sinon synthèse vocale du navigateur, dans la langue de l'interface (français ou anglais).
 */
export function ListenButton({
  text,
  audioKey,
  lang,
  label,
  compact = false,
}: {
  text: string;
  audioKey?: string;
  lang?: string;
  label?: string;
  /** Bouton rond, icône seule (en-têtes d'écran) : le nom reste lu par les lecteurs d'écran. */
  compact?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const t = useT();
  const locale = useLocale();
  const name = label ?? t('Écouter');

  useEffect(() => () => stop(), []);

  function stop() {
    audioRef.current?.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  async function play() {
    if (playing) return stop();
    setNote(null);
    const userLang = lang ?? (typeof document !== 'undefined' ? document.documentElement.dataset.voice : undefined) ?? locale;
    if (audioKey && userLang !== 'fr' && userLang !== 'en') {
      const src = `/audio/${userLang}/${audioKey}.mp3`;
      const ok = await fetch(src, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
      if (ok) {
        const a = new Audio(src);
        audioRef.current = a;
        a.onended = () => setPlaying(false);
        setPlaying(true);
        if (SYNTHETIC.has(userLang)) setNote(t('Voix de synthèse en {langue}, traduction faite par IA : à faire valider par un locuteur natif.', { langue: t(LANG_LABEL[userLang]) }));
        await a.play().catch(() => setPlaying(false));
        return;
      }
      setNote(t('Enregistrement en {langue} pas encore disponible : lecture en {repli}.', { langue: t(LANG_LABEL[userLang] ?? userLang), repli: t(LANG_LABEL[locale]) }));
    }
    const synth = window.speechSynthesis;
    if (!synth) return setNote(t('La lecture vocale n’est pas disponible sur ce téléphone.'));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = INTL[locale];
    u.rate = 0.92;
    u.onend = () => setPlaying(false);
    setPlaying(true);
    synth.speak(u);
  }

  if (compact) {
    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={play}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${playing ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)] text-[var(--fg)]'}`}
          aria-pressed={playing}
          aria-label={playing ? t('Arrêter la lecture') : name}
          title={name}
        >
          {playing ? <Square size={18} aria-hidden /> : <Volume2 size={22} aria-hidden />}
        </button>
        {note && <span className="sr-only" role="status">{note}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={play} className="btn btn-soft !min-h-11 !px-4 text-base" aria-pressed={playing}>
        {playing ? <Square size={18} aria-hidden /> : <Volume2 size={20} aria-hidden />}
        {playing ? t('Arrêter') : name}
      </button>
      {note && <span className="text-sm text-[var(--fg-muted)]" role="status">{note}</span>}
    </span>
  );
}
