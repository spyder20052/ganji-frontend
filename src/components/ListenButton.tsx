'use client';
import { Volume2, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LANG_LABEL: Record<string, string> = { fr: 'français', en: 'anglais', fon: 'fon', yoruba: 'yoruba', bariba: 'bariba', dendi: 'dendi' };

/**
 * Bouton « écouter » présent sur chaque écran patient.
 * 1. Enregistrement pré-enregistré en langue nationale (/audio/<langue>/<clé>.mp3) s'il existe ;
 * 2. sinon synthèse vocale du navigateur en français.
 */
export function ListenButton({ text, audioKey, lang, label = 'Écouter' }: { text: string; audioKey?: string; lang?: string; label?: string }) {
  const [playing, setPlaying] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => stop(), []);

  function stop() {
    audioRef.current?.pause();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  async function play() {
    if (playing) return stop();
    setNote(null);
    const userLang = lang ?? (typeof document !== 'undefined' ? document.documentElement.dataset.voice : undefined) ?? 'fr';
    if (audioKey && userLang !== 'fr') {
      const src = `/audio/${userLang}/${audioKey}.mp3`;
      const ok = await fetch(src, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
      if (ok) {
        const a = new Audio(src);
        audioRef.current = a;
        a.onended = () => setPlaying(false);
        setPlaying(true);
        await a.play().catch(() => setPlaying(false));
        return;
      }
      setNote(`Enregistrement en ${LANG_LABEL[userLang] ?? userLang} pas encore disponible : lecture en français.`);
    }
    const synth = window.speechSynthesis;
    if (!synth) return setNote('La lecture vocale n’est pas disponible sur ce téléphone.');
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.92;
    u.onend = () => setPlaying(false);
    setPlaying(true);
    synth.speak(u);
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={play} className="btn btn-soft !min-h-11 !px-4 text-base" aria-pressed={playing}>
        {playing ? <Square size={18} aria-hidden /> : <Volume2 size={20} aria-hidden />}
        {playing ? 'Arrêter' : label}
      </button>
      {note && <span className="text-sm text-[var(--fg-muted)]" role="status">{note}</span>}
    </span>
  );
}
