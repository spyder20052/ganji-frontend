'use client';
import { Check, Eye, EyeOff, Loader2, MapPin, Phone, PhoneCall, Plus, Send, Siren, X } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDateTime, fmtPhone, fmtTime } from '@/lib/format';
import { DaySeparator } from './DaySeparator';
import { dayStarts } from './time';
import { callbackMoments, type ListenMessage, type ListenThread, type ListenThreadSummary } from './types';

/** Phrases toutes prêtes : un toucher remplit la case, la personne n'a plus qu'à envoyer. */
const PHRASES = ['J’ai besoin de parler', 'Je me sens seul·e', 'Je n’arrive plus à dormir', 'J’ai peur', 'Merci'];
const POLL_MS = 5000;

function useErrorText() {
  const t = useT();
  return (e: unknown) => (e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez dans un instant.'));
}

/**
 * Écoute : conversation confidentielle avec la cellule d'écoute. Les mots de détresse sont détectés par
 * l'API (toutes les langues) : la conversation passe « urgente » et la consigne de sécurité s'affiche.
 */
export function ListenChat({ initial, past }: { initial: ListenThread | null; past: ListenThreadSummary[] }) {
  const [thread, setThread] = useState<ListenThread | null>(initial);
  const urgent = Boolean(thread && thread.urgent && thread.status !== 'CLOS');
  return (
    <div className="space-y-4">
      <EmergencyStrip urgent={urgent} />
      {thread ? <Conversation thread={thread} onChange={setThread} onNew={() => setThread(null)} /> : <StartForm onOpened={setThread} />}
      {past.length > 0 && <PastList past={past} />}
    </div>
  );
}

/** Bandeau 118 toujours visible ; en grand dès que l'API a reconnu des mots de détresse. */
function EmergencyStrip({ urgent }: { urgent: boolean }) {
  const t = useT();
  if (!urgent) {
    return (
      <a href="tel:118" className="flex min-h-14 items-center gap-3 rounded-3xl bg-[var(--color-danger-50)] py-2 pr-2 pl-4 text-[var(--color-danger-800)]">
        <Siren size={22} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1 font-bold">{t('En danger ? Appelez le 118')}</span>
        <span className="btn btn-danger !min-h-11 shrink-0 !px-4" aria-hidden>
          <Phone size={18} /> <span className="num">118</span>
        </span>
      </a>
    );
  }
  return (
    <div role="alert" className="space-y-3 rounded-3xl bg-[var(--color-danger-600)] p-5 text-white">
      <p className="text-2xl font-bold">{t('Vous comptez. Parlons maintenant.')}</p>
      <p className="text-lg">{t('En danger maintenant ? Appelez le 118 ou allez aux urgences. Une écoutante est prévenue.')}</p>
      <div className="flex flex-wrap gap-3">
        <a href="tel:118" className="btn bg-white text-[var(--color-danger-800)]">
          <Phone size={20} aria-hidden /> {t('Appeler le 118')}
        </a>
        <Link href="/urgence" className="btn border border-white/70 text-white">
          <MapPin size={20} aria-hidden /> {t('Urgences proches')}
        </Link>
      </div>
    </div>
  );
}

function Phrases({ onPick }: { onPick: (p: string) => void }) {
  const t = useT();
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t('Phrases toutes prêtes')}>
      {PHRASES.map((p) => (
        <button key={p} type="button" onClick={() => onPick(t(p))} className="btn btn-soft !min-h-11 shrink-0 !px-4 text-base font-medium">
          <Plus size={16} aria-hidden /> {t(p)}
        </button>
      ))}
    </div>
  );
}

function AnonSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center gap-3 rounded-2xl bg-[var(--bg)] p-3 text-left"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--card)] text-[var(--color-brand-900)] dark:text-[var(--color-leaf)]">
        {value ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{t('Anonyme')}</span>
        <span className="block text-base text-[var(--fg-muted)]">
          {value ? t('L’écoutante ne voit ni votre nom ni votre carnet.') : t('L’écoutante voit votre nom, jamais votre carnet.')}
        </span>
      </span>
      <span aria-hidden className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${value ? 'bg-[var(--color-brand-900)]' : 'bg-[var(--border)]'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${value ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  );
}

function StartForm({ onOpened }: { onOpened: (t: ListenThread) => void }) {
  const t = useT();
  const errorText = useErrorText();
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      onOpened(await api<ListenThread>('/me/listen', { method: 'POST', json: { anonymous, firstMessage: text.trim() } }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      aria-labelledby="h-ecrire"
      className="card space-y-4 p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 id="h-ecrire" className="text-2xl font-semibold">{t('Qu’est-ce qui vous pèse ?')}</h2>
      <Phrases onPick={(p) => setText((x) => (x.trim() ? `${x.trim()} ${p}` : p))} />
      <label htmlFor="ecoute-premier" className="sr-only">{t('Votre message')}</label>
      <textarea
        id="ecoute-premier"
        rows={4}
        maxLength={2000}
        className="input !min-h-36 resize-y !py-3 text-lg"
        placeholder={t('Écrivez ici, avec vos mots.')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <AnonSwitch value={anonymous} onChange={setAnonymous} />
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
      <button type="submit" className="btn btn-primary !min-h-14 w-full text-lg" disabled={busy || !text.trim()}>
        {busy ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Send size={22} aria-hidden />} {t('Envoyer')}
      </button>
    </form>
  );
}

function Conversation({ thread, onChange, onNew }: { thread: ListenThread; onChange: (t: ListenThread) => void; onNew: () => void }) {
  const t = useT();
  const locale = useLocale();
  const errorText = useErrorText();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'callback' | 'close'>('none');
  const logRef = useRef<HTMLDivElement>(null);
  const closed = thread.status === 'CLOS';

  // Réponses de l'écoutante : lecture toutes les 5 s quand l'écran est visible (démo : pas de WebSocket).
  const refresh = useCallback(() => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    api<ListenThread>(`/me/listen/${thread.id}`).then(onChange).catch(() => undefined);
  }, [thread.id, onChange]);
  useEffect(() => {
    if (closed) return;
    const id = window.setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [closed, refresh]);

  const count = thread.messages.length;
  useEffect(() => {
    const box = logRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [count]);

  async function act(path: string, json?: unknown) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<ListenThread>(`/me/listen/${thread.id}${path}`, { method: 'POST', json: json ?? {} }));
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const body = draft.trim();
    if (!body) return;
    if (await act('/messages', { body })) setDraft('');
  }

  const starts = dayStarts(thread.messages);
  const status = closed ? t('Conversation close') : thread.status === 'EN_COURS' ? t('Vous répond ici') : t('Une écoutante va vous répondre ici');

  return (
    <section aria-labelledby="h-conversation" className="card">
      <header className="flex items-center gap-3 border-b border-[var(--border)] p-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
          <Pictogram name="listen" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="h-conversation" className="text-lg font-semibold">{thread.counselorName ?? t('Cellule d’écoute')}</h2>
          <p className="text-base text-[var(--fg-muted)]">{status}</p>
        </div>
        <span className="pill shrink-0 bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]">
          {thread.anonymous ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          {thread.anonymous ? t('Anonyme') : t('Nom partagé')}
        </span>
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-label={t('Conversation')} className="max-h-[32vh] min-h-40 space-y-3 overflow-y-auto p-4 sm:max-h-[min(60vh,34rem)]">
        {thread.messages.map((m, i) => (
          <Fragment key={m.id}>
            {starts.has(i) && <DaySeparator at={m.at} />}
            <Message m={m} counselor={thread.counselorName} />
          </Fragment>
        ))}
      </div>

      {thread.callback && !closed && (
        <p className="mx-4 mb-3 flex items-start gap-2 rounded-2xl bg-[var(--color-brand-100)] p-3 text-base font-semibold text-[var(--color-ink)]">
          <PhoneCall size={18} aria-hidden className="mt-1 shrink-0" />
          <span>
            {t('Rappel demandé : {when}', { when: fmtDateTime(thread.callback.at, locale) })}
            {thread.callback.phone && <span className="num whitespace-nowrap"> · {fmtPhone(thread.callback.phone)}</span>}
          </span>
        </p>
      )}

      {closed ? (
        <div className="border-t border-[var(--border)] p-4">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-base text-[var(--fg-muted)]">
              <Check size={18} aria-hidden /> {t('Conversation close. Vous pouvez en ouvrir une autre à tout moment.')}
            </p>
            <button type="button" className="btn btn-primary !min-h-14 w-full text-lg" onClick={onNew}>
              <Plus size={22} aria-hidden /> {t('Nouvelle conversation')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Case d'écriture et phrases toutes prêtes : toujours visibles au-dessus de la barre du bas du téléphone. */}
          <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 space-y-2 rounded-b-3xl border-t border-[var(--border)] bg-[var(--card)] p-3 shadow-[0_-10px_18px_-16px_rgb(0_0_0/0.35)] md:bottom-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label htmlFor="ecoute-msg" className="sr-only">{t('Votre message')}</label>
              <textarea
                id="ecoute-msg"
                rows={1}
                maxLength={2000}
                className="input !min-h-14 flex-1 resize-none !py-3 text-lg"
                placeholder={t('Écrivez ici…')}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="submit" className="btn btn-primary !h-14 !w-14 shrink-0 !px-0" aria-label={t('Envoyer')} disabled={busy || !draft.trim()}>
                {busy ? <Loader2 size={24} className="animate-spin" aria-hidden /> : <Send size={24} aria-hidden />}
              </button>
            </form>
            {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
            <Phrases onPick={(p) => setDraft((x) => (x.trim() ? `${x.trim()} ${p}` : p))} />
          </div>
          <div className="space-y-3 px-4 pb-4 pt-1">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost !min-h-12" aria-expanded={panel === 'callback'} onClick={() => setPanel((p) => (p === 'callback' ? 'none' : 'callback'))}>
                <PhoneCall size={20} aria-hidden /> {t('Être rappelé')}
              </button>
              <button type="button" className="btn btn-ghost !min-h-12" aria-expanded={panel === 'close'} onClick={() => setPanel((p) => (p === 'close' ? 'none' : 'close'))}>
                <X size={20} aria-hidden /> {t('Clore')}
              </button>
            </div>
            {panel === 'callback' && (
              <CallbackForm
                busy={busy}
                onSubmit={async (phone, at) => {
                  if (await act('/callback', { phone, when: at.toISOString() })) setPanel('none');
                }}
              />
            )}
            {panel === 'close' && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                <p className="min-w-0 flex-1 font-bold">{t('Clore la conversation ?')}</p>
                <button type="button" className="btn btn-primary !min-h-12" disabled={busy} onClick={() => void act('/close').then((ok) => ok && setPanel('none'))}>
                  {t('Oui, clore')}
                </button>
                <button type="button" className="btn btn-ghost !min-h-12" onClick={() => setPanel('none')}>{t('Annuler')}</button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Message({ m, counselor }: { m: ListenMessage; counselor: string | null }) {
  const t = useT();
  const locale = useLocale();
  if (m.author === 'SYSTEME') {
    if (m.system === 'safety') {
      return (
        <div className="flex gap-3 rounded-2xl bg-[var(--color-danger-50)] p-4 text-[var(--color-danger-800)]">
          <Siren size={22} aria-hidden className="mt-0.5 shrink-0" />
          <div className="space-y-2">
            <p className="font-semibold">{t(m.body)}</p>
            <a href="tel:118" className="btn btn-danger !min-h-11 !px-4">
              <Phone size={18} aria-hidden /> {t('Appeler le 118')}
            </a>
          </div>
        </div>
      );
    }
    return <p className="mx-auto max-w-[32rem] px-2 text-center text-base text-[var(--fg-muted)]">{t(m.body)}</p>;
  }
  const mine = m.author === 'PERSONNE';
  return (
    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : ''}`}>
      <div className={`max-w-[85%] space-y-1 ${mine ? 'text-right' : ''}`}>
        <p
          className={`inline-block rounded-3xl px-4 py-3 text-left text-lg whitespace-pre-line ${
            mine ? 'rounded-br-md bg-[var(--color-brand-900)] text-white' : 'rounded-bl-md bg-[var(--color-brand-100)] text-[var(--color-ink)]'
          }`}
        >
          <span className="sr-only">{mine ? t('Vous : ') : t('{name} : ', { name: counselor ?? t('Écoutante') })}</span>
          {m.body}
        </p>
        <p className="px-2 text-sm text-[var(--fg-muted)]">
          {!mine && `${counselor ?? t('Écoutante')} · `}
          {fmtTime(m.at, locale)}
        </p>
      </div>
      {!mine && <ListenButton text={m.body} compact label={t('Écouter le message')} />}
    </div>
  );
}

function CallbackForm({ busy, onSubmit }: { busy: boolean; onSubmit: (phone: string, at: Date) => void }) {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [moments] = useState(() => callbackMoments());
  const [when, setWhen] = useState(moments[0].key);
  const at = moments.find((m) => m.key === when)?.at ?? new Date();
  return (
    <form
      className="space-y-3 rounded-2xl bg-[var(--bg)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(phone, at);
      }}
    >
      <label className="block">
        <span className="label mb-1.5 block">{t('Votre numéro (seule l’écoutante le voit)')}</span>
        <input className="input num !min-h-14 text-lg" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01 97 00 00 00" required />
      </label>
      <fieldset>
        <legend className="label mb-1.5">{t('Quand ?')}</legend>
        <div className="flex flex-wrap gap-2">
          {moments.map((m) => (
            <label key={m.key} className={`btn !min-h-12 cursor-pointer !px-4 ${when === m.key ? 'btn-primary' : 'btn-ghost'}`}>
              <input type="radio" name="quand" value={m.key} checked={when === m.key} onChange={() => setWhen(m.key)} className="sr-only" />
              {t(m.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="btn btn-primary !min-h-14 w-full" disabled={busy || phone.replace(/\D/g, '').length < 8}>
        <PhoneCall size={20} aria-hidden /> {t('Demander le rappel')}
      </button>
    </form>
  );
}

function PastList({ past }: { past: ListenThreadSummary[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <details className="card p-4">
      <summary className="flex min-h-12 cursor-pointer items-center font-semibold">{t('Conversations passées ({n})', { n: past.length })}</summary>
      <ul className="mt-2 divide-y divide-[var(--border)]">
        {past.map((p) => (
          <li key={p.id}>
            <Link href={`/app/ecoute?c=${p.id}`} className="flex min-h-14 flex-col justify-center gap-0.5 rounded-xl px-2 py-2 hover:bg-[var(--bg)]">
              <span className="font-semibold">{fmtDateTime(p.createdAt, locale)}{p.counselorName ? ` · ${p.counselorName}` : ''}</span>
              {p.last && <span className="line-clamp-1 text-base text-[var(--fg-muted)]">{p.last.author === 'SYSTEME' ? t(p.last.body) : p.last.body}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
