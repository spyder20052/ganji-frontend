'use client';
import { ArrowLeft, Check, EyeOff, Hand, Loader2, MessageCircle, Phone, PhoneCall, Send, Siren, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, fmtPhone, fmtTime, relative } from '@/lib/format';
import { DaySeparator } from '../../app/(espace)/ecoute/DaySeparator';
import { dayStarts } from '../../app/(espace)/ecoute/time';
import type { CounselorThread, ListenQueue, QueueItem } from '../../app/(espace)/ecoute/types';

const POLL_MS = 5000;
/** Réponses d'ouverture : d'abord la sécurité, puis l'écoute. */
const OPENERS = ['Merci de nous écrire. Je suis là pour vous écouter.', 'Êtes-vous en sécurité en ce moment ?', 'Pouvez-vous me dire ce qui se passe ?'];

function useVisiblePoll(fn: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => document.visibilityState === 'visible' && navigator.onLine && fn();
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fn, enabled]);
}

/**
 * Poste de l'écoutante : la file (détresse d'abord, puis en attente, puis mes conversations) et la
 * conversation ouverte. Téléphone : une vue à la fois ; ordinateur : les deux côte à côte.
 */
export function CounselorDesk({ head, initialQueue, initialThread }: { head: ReactNode; initialQueue: ListenQueue; initialThread: CounselorThread | null }) {
  const t = useT();
  const [queue, setQueue] = useState(initialQueue);
  const [thread, setThread] = useState<CounselorThread | null>(initialThread);
  const [error, setError] = useState<string | null>(null);

  const refreshQueue = useCallback(() => {
    api<ListenQueue>('/listen/queue').then(setQueue).catch(() => undefined);
  }, []);
  useVisiblePoll(refreshQueue);

  const open = useCallback(async (id: string | null) => {
    setError(null);
    window.history.replaceState(null, '', id ? `/pro/ecoute?c=${id}` : '/pro/ecoute');
    if (!id) return setThread(null);
    try {
      setThread(await api<CounselorThread>(`/listen/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez dans un instant.'));
    }
  }, [t]);

  const groups = [
    { key: 'urgent', title: t('Détresse'), items: queue.items.filter((i) => i.urgent) },
    { key: 'open', title: t('En attente'), items: queue.items.filter((i) => !i.urgent && !i.mine) },
    { key: 'mine', title: t('Mes conversations'), items: queue.items.filter((i) => !i.urgent && i.mine) },
  ];

  return (
    <>
      {/* Téléphone : la conversation ouverte a son propre en-tête (retour à la file) ; le titre de page s'efface. */}
      <div className={`mb-5 ${thread ? 'hidden lg:block' : ''}`}>{head}</div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_1fr]">
        <section aria-labelledby="h-file" className={`card space-y-4 p-4 sm:p-5 ${thread ? 'hidden lg:block' : ''}`}>
          <h2 id="h-file" className="text-xl font-semibold">{t('File d’écoute')}</h2>
          {groups.map((g) => (
            <div key={g.key} className="space-y-2">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                {g.key === 'urgent' && <Siren size={16} aria-hidden className="text-[var(--color-danger-600)]" />}
                {g.title} <span className="num text-[var(--fg-muted)]">({g.items.length})</span>
              </h2>
              {g.items.length === 0 ? (
                <p className="rounded-2xl bg-[var(--bg)] p-3 text-base text-[var(--fg-muted)]">{g.key === 'urgent' ? t('Aucune détresse signalée.') : t('Rien ici pour le moment.')}</p>
              ) : (
                <ul className="space-y-2">
                  {g.items.map((i) => (
                    <QueueRow key={i.id} item={i} active={thread?.id === i.id} onOpen={() => void open(i.id)} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>

        <div className={thread ? '' : 'hidden lg:block'}>
          {error && <p role="alert" className="mb-3 rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
          {thread ? (
            <ThreadView
              key={thread.id}
              thread={thread}
              onChange={(x) => {
                setThread(x);
                refreshQueue();
              }}
              onBack={() => void open(null)}
            />
          ) : (
            <div className="card grid min-h-64 place-items-center p-6 text-center text-[var(--fg-muted)]">
              <p className="flex items-center gap-2"><MessageCircle size={20} aria-hidden /> {t('Choisissez une conversation dans la file.')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function QueueRow({ item, active, onOpen }: { item: QueueItem; active: boolean; onOpen: () => void }) {
  const t = useT();
  const locale = useLocale();
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
        className={`w-full space-y-1 rounded-2xl border-2 p-3 text-left ${
          active ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-100)] text-[var(--color-ink)]' : item.urgent ? 'border-[var(--color-danger-600)] bg-[var(--card)]' : 'border-[var(--border)] bg-[var(--card)]'
        }`}
      >
        <span className="flex items-center gap-2">
          {item.anonymous && <EyeOff size={16} aria-hidden className="shrink-0" />}
          <span className="min-w-0 flex-1 truncate font-semibold">{item.name ?? t('Personne anonyme')}</span>
          <span className={`shrink-0 text-sm ${active ? '' : 'text-[var(--fg-muted)]'}`}>{relative(item.last?.at ?? item.updatedAt, locale)}</span>
        </span>
        {item.last && (
          <span className={`line-clamp-2 block text-base ${active ? '' : 'text-[var(--fg-muted)]'}`}>
            {item.last.author === 'ECOUTANT' ? `${t('Vous : ')}` : ''}
            {item.last.body}
          </span>
        )}
        <span className="flex flex-wrap gap-1.5">
          {item.urgent && <span className="pill bg-[var(--color-danger-600)] text-white"><Siren size={13} aria-hidden /> {t('Détresse')}</span>}
          {item.waiting && <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">{t('À répondre')}</span>}
          {item.callback && (
            <span className="pill bg-[var(--color-brand-100)] text-[var(--color-ink)]">
              <PhoneCall size={13} aria-hidden /> {t('Rappel {when}', { when: fmtTime(item.callback.at, locale) })}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function ThreadView({ thread, onChange, onBack }: { thread: CounselorThread; onChange: (t: CounselorThread) => void; onBack: () => void }) {
  const t = useT();
  const locale = useLocale();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const closed = thread.status === 'CLOS';
  const free = !thread.mine && thread.status === 'OUVERT';
  const starts = dayStarts(thread.messages);

  const refresh = useCallback(() => {
    api<CounselorThread>(`/listen/${thread.id}`).then(onChange).catch(() => undefined);
  }, [thread.id, onChange]);
  useVisiblePoll(refresh, !closed);

  const count = thread.messages.length;
  useEffect(() => {
    const box = logRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [count]);

  async function act(path: string, json?: unknown) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<CounselorThread>(`/listen/${thread.id}${path}`, { method: 'POST', json: json ?? {} }));
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez dans un instant.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="h-fil" className="card">
      <header className="space-y-3 border-b border-[var(--border)] p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="chip-round shrink-0 lg:hidden" aria-label={t('Retour à la file')}>
            <ArrowLeft size={20} aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="h-fil" className="flex items-center gap-2 text-xl font-bold">
              {thread.anonymous && <EyeOff size={18} aria-hidden />}
              {thread.name ?? t('Personne anonyme')}
            </h2>
            <p className="text-sm text-[var(--fg-muted)]">
              {t('Ouverte {date}', { date: fmtDateTime(thread.createdAt, locale) })} ·{' '}
              {closed ? t('Close') : thread.mine ? t('Vous suivez cette conversation') : t('Personne ne la suit encore')}
            </p>
          </div>
          {thread.urgent && !closed && (
            <span className="pill shrink-0 bg-[var(--color-danger-600)] text-white">
              <Siren size={14} aria-hidden /> {t('Détresse')}
            </span>
          )}
        </div>
        {thread.anonymous && <p className="text-sm text-[var(--fg-muted)]">{t('Anonyme : ni nom, ni carnet, ni numéro (sauf rappel demandé).')}</p>}
        {thread.callback && (
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-brand-100)] p-3 text-[var(--color-ink)]">
            <PhoneCall size={20} aria-hidden className="shrink-0" />
            <p className="min-w-0 flex-1 text-base font-semibold">
              <span className="block">{t('Rappel {when}', { when: fmtDateTime(thread.callback.at, locale) })}</span>
              {thread.callback.phone && <span className="num block whitespace-nowrap">{fmtPhone(thread.callback.phone)}</span>}
            </p>
            {thread.callback.phone && (
              <a href={`tel:${thread.callback.phone}`} className="btn btn-primary !min-h-11 shrink-0 !px-4">
                <Phone size={18} aria-hidden /> {t('Appeler')}
              </a>
            )}
          </div>
        )}
        {free && (
          <button type="button" className="btn btn-primary w-full" disabled={busy} onClick={() => void act('/take')}>
            <Hand size={20} aria-hidden /> {t('Prendre la conversation')}
          </button>
        )}
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-label={t('Conversation')} className="max-h-[32vh] min-h-40 space-y-3 overflow-y-auto p-4 sm:max-h-[60vh]">
        {thread.messages.map((m, i) => {
          const day = starts.has(i) ? <DaySeparator at={m.at} /> : null;
          if (m.author === 'SYSTEME') {
            return (
              <Fragment key={m.id}>
                {day}
                {m.system === 'safety' ? (
                  <p className="flex items-start gap-2 rounded-2xl bg-[var(--color-danger-50)] p-3 text-base text-[var(--color-danger-800)]">
                    <Siren size={18} aria-hidden className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-bold">{t('Consigne de sécurité envoyée (118, urgences).')}</span> {fmtTime(m.at, locale)}
                    </span>
                  </p>
                ) : (
                  <p className="text-center text-sm text-[var(--fg-muted)]">
                    {t(m.body)} · {fmtTime(m.at, locale)}
                  </p>
                )}
              </Fragment>
            );
          }
          const mine = m.author === 'ECOUTANT';
          return (
            <Fragment key={m.id}>
              {day}
              <div className={`max-w-[85%] space-y-1 ${mine ? 'ml-auto text-right' : ''}`}>
                <p className={`inline-block rounded-3xl px-4 py-2.5 text-left whitespace-pre-line ${mine ? 'rounded-br-md bg-[var(--color-brand-900)] text-white' : 'rounded-bl-md bg-[var(--bg)] ring-1 ring-[var(--border)]'}`}>
                  <span className="sr-only">{mine ? t('Vous : ') : t('La personne : ')}</span>
                  {m.body}
                </p>
                <p className="px-2 text-sm text-[var(--fg-muted)]">{fmtTime(m.at, locale)}</p>
              </div>
            </Fragment>
          );
        })}
      </div>

      {closed ? (
        <p className="flex items-center gap-2 border-t border-[var(--border)] p-4 text-[var(--fg-muted)]"><Check size={18} aria-hidden /> {t('Conversation close.')}</p>
      ) : (
        <>
          <div className="space-y-2 border-t border-[var(--border)] px-3 pt-3">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t('Réponses toutes prêtes')}>
              {OPENERS.map((o) => (
                <button key={o} type="button" className="btn btn-soft !min-h-10 shrink-0 !px-3 text-sm font-medium" onClick={() => setDraft((x) => (x.trim() ? `${x.trim()} ${t(o)}` : t(o)))}>
                  {t(o)}
                </button>
              ))}
            </div>
          </div>
          {/* Case de réponse : toujours visible au-dessus de la barre du bas du téléphone. */}
          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 space-y-2 bg-[var(--card)] p-3 shadow-[0_-10px_18px_-16px_rgb(0_0_0/0.35)] md:bottom-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const body = draft.trim();
                if (body) void act('/messages', { body }).then((ok) => ok && setDraft(''));
              }}
            >
              <label htmlFor="reponse" className="sr-only">{t('Votre réponse')}</label>
              <textarea
                id="reponse"
                rows={2}
                maxLength={2000}
                className="input !min-h-14 flex-1 resize-y !py-3"
                placeholder={free ? t('Répondre prend la conversation.') : t('Votre réponse…')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button type="submit" className="btn btn-primary !h-14 !w-14 shrink-0 !px-0" aria-label={t('Envoyer')} disabled={busy || !draft.trim()}>
                {busy ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Send size={22} aria-hidden />}
              </button>
            </form>
            {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
          </div>
          <div className="space-y-3 px-4 pb-4 pt-1">
            <p className="text-sm text-[var(--fg-muted)]">{t('La personne est prévenue dans l’application ; par SMS, un texte neutre seulement.')}</p>
            {confirmClose ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--bg)] p-3">
                <p className="min-w-0 flex-1 font-semibold">{t('Clore la conversation ?')}</p>
                <button type="button" className="btn btn-primary !min-h-11" disabled={busy} onClick={() => void act('/close').then(() => setConfirmClose(false))}>{t('Oui, clore')}</button>
                <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setConfirmClose(false)}>{t('Annuler')}</button>
              </div>
            ) : (
              <button type="button" className="btn btn-ghost !min-h-11" onClick={() => setConfirmClose(true)}>
                <X size={18} aria-hidden /> {t('Clore')}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
