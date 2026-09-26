'use client';
import Link from 'next/link';
import { BookOpen, FileText, Loader2, Phone, Send, ShieldAlert, Siren } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import type { AskAnswer } from './_lib/assistant';

/** Questions proposées (touchées plutôt qu'écrites) : les plus fréquentes au comptoir. */
const SUGGESTIONS = ['J’ai oublié ma dose, que faire ?', 'Quand prendre mes médicaments ?', 'Avec ou sans repas ?', 'Quels effets indésirables ?', 'Jusqu’à quand ?'];

type Turn = { id: number; q: string; a?: AskAnswer; error?: string };

/**
 * Questions sur son traitement. Les réponses viennent du serveur, tirées UNIQUEMENT de l'ordonnance
 * et des fiches médicaments ; chaque réponse dit sa source et se lit à voix haute.
 */
export function AskBox({ patientId }: { patientId?: string }) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [turns]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const id = nextId.current++;
    setTurns((ts) => [...ts, { id, q: text }]);
    setQ('');
    setBusy(true);
    try {
      const a = await api<AskAnswer>(`/me/assistant/ask${patientId ? `?patientId=${patientId}` : ''}`, { method: 'POST', json: { question: text, lang: locale } });
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, a } : x)));
    } catch (e) {
      setTurns((ts) => ts.map((x) => (x.id === id ? { ...x, error: e instanceof ApiError ? e.message : 'Pas de réseau : réessayez dans un instant.' } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-question" className="card space-y-4 p-5 sm:p-6">
      <h2 id="h-question" className="text-xl font-semibold">{t('Une question ?')}</h2>

      {turns.length > 0 && (
        <ol className="space-y-4" aria-live="polite">
          {turns.map((turn) => (
            <li key={turn.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-md bg-[var(--color-brand-900)] px-4 py-2 text-white">
                <span className="sr-only">{t('Vous : ')}</span>
                {turn.q}
              </p>
              {turn.a ? (
                <AnswerBubble a={turn.a} />
              ) : turn.error ? (
                <p role="alert" className="w-fit max-w-[92%] rounded-3xl rounded-bl-md bg-[var(--color-ocre-100)] px-4 py-3 text-[var(--color-ocre-700)]">{t(turn.error)}</p>
              ) : (
                <p className="flex w-fit items-center gap-2 rounded-3xl rounded-bl-md bg-[var(--bg)] px-4 py-3 text-[var(--fg-muted)]">
                  <Loader2 size={18} className="animate-spin" aria-hidden /> {t('Je regarde votre ordonnance…')}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
      <div ref={endRef} />

      {/* Questions proposées et zone de saisie : toujours visibles au-dessus de la barre d'onglets du téléphone. */}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 -mx-2 space-y-2 rounded-[1.75rem] bg-[var(--card)] p-2 shadow-[var(--shadow-soft)] md:bottom-4">
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="btn btn-soft !min-h-12 shrink-0 !px-4 text-base" onClick={() => ask(t(s))} disabled={busy}>
              {t(s)}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q);
          }}
        >
          <label htmlFor="assist-q" className="sr-only">{t('Votre question')}</label>
          <input id="assist-q" className="input min-w-0 flex-1" placeholder={t('Votre question…')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" maxLength={300} />
          <button type="submit" className="btn btn-primary !px-4" aria-label={t('Envoyer')} disabled={!q.trim() || busy}>
            <Send size={20} aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}

function AnswerBubble({ a }: { a: AskAnswer }) {
  const t = useT();
  const spoken = [...a.lines.map((l) => (l.medication ? `${l.medication}. ${l.text}` : l.text)), a.safety].join(' ');
  return (
    <div className={`max-w-[92%] space-y-3 rounded-3xl rounded-bl-md px-4 py-3 ${a.urgent ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'bg-[var(--bg)]'}`}>
      <span className="sr-only">{t('Assistant : ')}</span>
      {a.lines.map((l, i) => (
        <p key={i} className="text-lg leading-snug">
          {a.urgent && <ShieldAlert size={20} aria-hidden className="mr-1 inline" />}
          {l.medication && <span className="font-semibold">{l.medication} · </span>}
          {l.text}
        </p>
      ))}
      {a.urgent && (
        <div className="flex flex-wrap gap-2">
          <a href="tel:118" className="btn btn-danger">
            <Phone size={20} aria-hidden /> {t('Appeler le 118')}
          </a>
          <Link href="/app/sos" className="btn btn-ghost">
            <Siren size={20} aria-hidden /> {t('Urgence')}
          </Link>
        </div>
      )}
      <ul className={`space-y-1 text-sm ${a.urgent ? '' : 'text-[var(--fg-muted)]'}`}>
        {a.sources.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            {s.kind === 'ORDONNANCE' ? <FileText size={14} aria-hidden /> : <BookOpen size={14} aria-hidden />}
            {s.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <Phone size={14} aria-hidden /> {a.safety}
        </li>
      </ul>
      <ListenButton text={spoken} />
    </div>
  );
}
