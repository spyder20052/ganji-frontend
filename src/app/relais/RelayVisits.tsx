'use client';
import { Check, CheckCircle2, Home, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, fmtTime } from '@/lib/format';

export interface Visit {
  id: string;
  firstName: string;
  commune: string | null;
  address: string | null;
  reason: string;
  dueAt: string;
  status: 'A_FAIRE' | 'FAITE' | 'ANNULEE';
  doneAt: string | null;
  note: string | null;
  relayName: string | null;
}

/** Jour de la visite, à l'heure du Bénin : « aujourd'hui », « demain » ou la date. */
function dueLabel(iso: string, t: ReturnType<typeof useT>, locale: ReturnType<typeof useLocale>) {
  const H = 3_600_000;
  const day = (d: Date) => Math.floor((d.getTime() + H) / (24 * H));
  const diff = day(new Date(iso)) - day(new Date());
  const time = fmtTime(iso, locale);
  if (diff < 0) return t('En retard · prévue {time}', { time: fmtDateTime(iso, locale) });
  if (diff === 0) return t('Aujourd’hui, {time}', { time });
  if (diff === 1) return t('Demain, {time}', { time });
  return fmtDateTime(iso, locale);
}

/**
 * Visites demandées par le cercle de soins (rappel resté sans réponse) : prénom, quartier, motif.
 * Aucun détail médical. « Fait » (avec un mot facultatif) prévient le patient et ses aidants.
 */
export interface VisitList {
  todo: Visit[];
  done: Visit[];
}

export function RelayVisits({ initial }: { initial: VisitList | null }) {
  const t = useT();
  const locale = useLocale();
  const [data, setData] = useState<VisitList | null>(initial);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api<VisitList>('/relay/visits')
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  // Chargées par le serveur ; rechargées ici seulement si le serveur n'a pas pu les lire.
  useEffect(() => {
    if (!initial) load();
  }, [initial, load]);

  const todo = data?.todo ?? [];
  return (
    <section id="visites" aria-labelledby="h-visites" className="card scroll-mt-24 space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="h-visites" className="flex min-w-0 items-center gap-3 text-2xl font-semibold">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
            <Home size={22} aria-hidden />
          </span>
          {t('Visites à faire')}
          {data && <span className="num text-lg font-normal text-[var(--fg-muted)]">({todo.length})</span>}
        </h2>
        <button type="button" className="chip-round shrink-0" onClick={load} aria-label={t('Actualiser')}>
          <RefreshCw size={18} aria-hidden />
        </button>
      </div>

      {failed && <p className="text-[var(--fg-muted)]">{t('Visites indisponibles pour le moment.')}</p>}
      {!data && !failed && <p className="text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
      {data && todo.length === 0 && <p className="rounded-2xl bg-[var(--bg)] p-4 text-[var(--fg-muted)]">{t('Aucune visite à faire.')}</p>}

      {todo.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {todo.map((v) => (
            <VisitCard key={v.id} v={v} onDone={load} />
          ))}
        </ul>
      )}

      {data && data.done.length > 0 && (
        <details>
          <summary className="flex min-h-12 cursor-pointer items-center font-semibold">{t('Visites faites ({n})', { n: data.done.length })}</summary>
          <ul className="mt-2 space-y-2">
            {data.done.map((v) => (
              <li key={v.id} className="flex items-start gap-3 rounded-2xl bg-[var(--bg)] p-3">
                <CheckCircle2 size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--color-brand-700)]" />
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {v.firstName} · {v.doneAt ? fmtDateTime(v.doneAt, locale) : ''}
                  </span>
                  {v.note && <q className="block text-base text-[var(--fg-muted)] italic">{v.note}</q>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function VisitCard({ v, onDone }: { v: Visit; onDone: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const late = new Date(v.dueAt).getTime() < Date.now();

  async function done() {
    setBusy(true);
    setError(null);
    try {
      await api(`/relay/visits/${v.id}/done`, { method: 'POST', json: note.trim() ? { note: note.trim() } : {} });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez quand le réseau revient.'));
      setBusy(false);
    }
  }

  return (
    <li className={`space-y-3 rounded-3xl border-2 p-4 ${late ? 'border-[var(--color-ocre-500)]' : 'border-[var(--border)]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-2xl font-bold">{v.firstName}</p>
        <span className={`pill ${late ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'bg-[var(--bg)] ring-1 ring-[var(--border)]'}`}>{dueLabel(v.dueAt, t, locale)}</span>
      </div>
      <p className="flex items-start gap-2 text-lg">
        <MapPin size={20} aria-hidden className="mt-1 shrink-0" />
        <span>{[v.address, v.commune].filter(Boolean).join(' · ') || t('Adresse à demander à la famille')}</span>
      </p>
      <p className="text-base text-[var(--fg-muted)]">{t(v.reason)}</p>
      {open ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void done();
          }}
        >
          <label className="block">
            <span className="label mb-1.5 block">{t('Un mot pour la famille (facultatif)')}</span>
            <textarea className="input !min-h-24 !py-3" maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Ex. Il va bien, il avait oublié.')} />
          </label>
          <p className="text-sm text-[var(--fg-muted)]">{t('Pas de détail médical : le mot est lu par le patient et ses aidants.')}</p>
          {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{t('Annuler')}</button>
            <button type="submit" className="btn btn-primary !min-h-14 flex-1 text-lg" disabled={busy}>
              {busy ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Check size={22} aria-hidden />} {t('Envoyer')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn btn-primary !min-h-14 w-full text-lg" onClick={() => setOpen(true)}>
          <Check size={22} aria-hidden /> {t('Fait')}
        </button>
      )}
    </li>
  );
}
