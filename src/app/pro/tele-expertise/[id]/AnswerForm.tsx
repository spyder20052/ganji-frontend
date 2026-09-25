'use client';
import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { ErrorNote } from '../../_lib/ui';

const MIN = 10;

export function AnswerForm({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const uid = useId();
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const len = answer.trim().length;

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (len < MIN) return;
        setBusy(true);
        setError(null);
        try {
          await api(`/tele-expertise/${id}/answer`, { method: 'POST', json: { answer: answer.trim() } });
          router.refresh();
        } catch (err) {
          setError(err instanceof ApiError ? t(err.message) : t('Réponse non envoyée. Réessayez.'));
          setBusy(false);
        }
      }}
    >
      <label htmlFor={uid} className="sr-only">
        {t('Votre avis')}
      </label>
      <textarea
        id={uid}
        className="input min-h-40 py-2"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        maxLength={4000}
        required
        aria-describedby={`${uid}-n`}
        placeholder={t('Analyse, conduite à tenir, examens complémentaires, critères de transfert…')}
      />
      <p id={`${uid}-n`} className="num text-sm text-[var(--fg-muted)]">
        {len < MIN ? t('{n} caractère(s) minimum restant(s)', { n: MIN - len }) : `${len} / 4000`}
      </p>
      <ErrorNote>{error}</ErrorNote>
      <button type="submit" className="btn btn-primary" disabled={busy || len < MIN}>
        <Send size={18} aria-hidden /> {busy ? t('Envoi…') : t('Envoyer l’avis')}
      </button>
    </form>
  );
}
