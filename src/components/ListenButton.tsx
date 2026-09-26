'use client';
import { Loader2, Volume2, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { INTL, NATIONAL, VOICE_OF } from '@/i18n/translate';

const LANG_LABEL: Record<string, string> = { fr: 'français', en: 'anglais', fon: 'fon', yoruba: 'yoruba', bariba: 'bariba', dendi: 'dendi' };
/** Voix de synthèse (traduction automatique) : à faire valider par un locuteur natif, et on le dit. */
const SYNTHETIC = new Set(['yoruba', 'fon']);

/**
 * Bouton « écouter » présent sur chaque écran patient.
 * 1. Interface en langue nationale (fon, yoruba, bariba, dendi) : le texte de la page, dans cette langue, lu
 *    par la voix de synthèse de l'API (modèles MMS de Meta ; le téléphone n'a pas de voix pour ces langues) ;
 * 2. voix réglée sur une langue nationale mais interface en français : enregistrement du message s'il existe ;
 * 3. sinon synthèse vocale du téléphone, en français ou en anglais.
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
  const [loading, setLoading] = useState(false);
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

  function playUrl(src: string) {
    const a = new Audio(src);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    setPlaying(true);
    return a.play().then(() => true).catch(() => (setPlaying(false), false));
  }

  async function play() {
    if (playing) return stop();
    if (loading) return;
    setNote(null);
    // Interface en langue nationale : la page elle-même, lue dans cette langue par la voix de l'API.
    if (NATIONAL.includes(locale)) {
      setLoading(true);
      try {
        const res = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lang: VOICE_OF[locale], text }) });
        if (res.ok) {
          const url = URL.createObjectURL(await res.blob());
          setLoading(false);
          setNote(t('Voix de synthèse en {langue}, traduction faite par IA : à faire valider par un locuteur natif.', { langue: t(LANG_LABEL[VOICE_OF[locale]]) }));
          if (await playUrl(url)) return;
        }
      } catch {
        /* réseau : repli ci-dessous */
      }
      setLoading(false);
    }
    const userLang = lang ?? (typeof document !== 'undefined' ? document.documentElement.dataset.voice : undefined) ?? VOICE_OF[locale];
    if (audioKey && userLang !== 'fr' && userLang !== 'en') {
      const src = `/audio/${userLang}/${audioKey}.mp3`;
      const ok = await fetch(src, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
      if (ok) {
        if (SYNTHETIC.has(userLang)) setNote(t('Voix de synthèse en {langue}, traduction faite par IA : à faire valider par un locuteur natif.', { langue: t(LANG_LABEL[userLang]) }));
        await playUrl(src);
        return;
      }
      setNote(t('Enregistrement en {langue} pas encore disponible : lecture en {repli}.', { langue: t(LANG_LABEL[userLang] ?? userLang), repli: t(LANG_LABEL[VOICE_OF[locale]] ?? 'français') }));
    }
    const synth = window.speechSynthesis;
    if (!synth) return setNote(t('La lecture vocale n’est pas disponible sur ce téléphone.'));
    if (NATIONAL.includes(locale)) return setNote(t('Voix en {langue} indisponible pour le moment. Réessayez dans un instant.', { langue: t(LANG_LABEL[VOICE_OF[locale]]) }));
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
          aria-label={loading ? t('Préparation de la voix…') : playing ? t('Arrêter la lecture') : name}
          aria-busy={loading}
          title={name}
        >
          {loading ? <Loader2 size={20} aria-hidden className="animate-spin" /> : playing ? <Square size={18} aria-hidden /> : <Volume2 size={22} aria-hidden />}
        </button>
        {note && <span className="sr-only" role="status">{note}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={play} className="btn btn-soft !min-h-11 !px-4 text-base" aria-pressed={playing}>
        {loading ? <Loader2 size={18} aria-hidden className="animate-spin" /> : playing ? <Square size={18} aria-hidden /> : <Volume2 size={20} aria-hidden />}
        {loading ? t('Préparation de la voix…') : playing ? t('Arrêter') : name}
      </button>
      {note && <span className="text-sm text-[var(--fg-muted)]" role="status">{note}</span>}
    </span>
  );
}
