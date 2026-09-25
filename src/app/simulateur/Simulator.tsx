'use client';
import {
  BatteryMedium, Bell, CalendarClock, Delete, Loader2, MessageSquare, Phone, PhoneCall, PhoneOff, Send, Signal, Smartphone, User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtTime, fmtPhone } from '@/lib/format';

interface OutboxItem {
  id: string;
  channel: 'SMS' | 'VOICE' | 'PUSH' | string;
  to: string;
  lang: string;
  body: string;
  audioKey: string | null;
  status: string;
  ref: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface DemoPhones {
  personas: { label: string; phone: string; role: string; persona: string }[];
  donors: { label: string; phone: string; smartphone: boolean }[];
}

interface SentSms { id: string; to: string; body: string; at: string; handled?: string; error?: string }

const LANG: Record<string, string> = { fr: 'français', en: 'anglais', fon: 'fon', yoruba: 'yoruba', bariba: 'bariba', dendi: 'dendi' };

const HANDLED: Record<string, string> = {
  DON_ACCEPTE: 'Don accepté : la demande de sang est mise à jour en direct',
  DON_REFUSE: 'Refus enregistré : un autre donneur sera sollicité',
  RAPPEL_CONFIRME: 'Rappel confirmé',
  RDV: 'Prochain rendez-vous envoyé',
  STOP: 'Désinscrit des appels au don',
  DON: 'Réinscrit aux appels au don',
  IGNORE: 'Message non reconnu : aide renvoyée',
};

const ROLE: Record<string, string> = {
  PATIENT: 'patient', CAREGIVER: 'aidant', PRACTITIONER: 'médecin', NURSE: 'infirmier·ère', PHARMACIST: 'pharmacien',
  BLOOD_BANK: 'banque de sang', RELAY: 'relais', MINISTRY: 'ministère', ADMIN: 'contrôle',
};

const USSD_CODE = '*229*25#';
const POLL_MS = 3000;

/** 0196000123 → 01 96 00 01 23 (lisible à voix haute). */

function voiceText(body: string) {
  return body.replace(/^Message vocal \([^)]*\)\s*:\s*/i, '');
}

/** Rafraîchit à intervalle régulier, en pause quand l'onglet est caché. */
function usePoll(fn: () => void, ms: number, enabled: boolean) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  useEffect(() => {
    if (!enabled) return;
    ref.current();
    const id = setInterval(() => {
      if (!document.hidden) ref.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

export function Simulator({ initialTel }: { initialTel: string }) {
  const t = useT();
  const locale = useLocale();
  // Pluriel : le français met 0 au singulier, l'anglais au pluriel.
  const many = (n: number) => n > 1 || (n === 0 && locale !== 'fr');
  const [phones, setPhones] = useState<DemoPhones | null>(null);
  const [demoOff, setDemoOff] = useState(false);
  const [phone, setPhone] = useState(initialTel);
  const [free, setFree] = useState(initialTel);
  const [inbox, setInbox] = useState<OutboxItem[]>([]);
  const [feed, setFeed] = useState<OutboxItem[]>([]);
  const [sent, setSent] = useState<SentSms[]>([]);
  const [tab, setTab] = useState<'sms' | 'ussd'>('sms');
  const [tick, setTick] = useState<{ loading: boolean; text?: string; error?: string }>({ loading: false });

  useEffect(() => {
    api<DemoPhones>('/sms/phones')
      .then((p) => {
        setPhones(p);
        if (!initialTel) {
          const first = p.donors[0]?.phone ?? p.personas.find((x) => x.persona === 'bio')?.phone ?? p.personas[0]?.phone;
          if (first) {
            setPhone(first);
            setFree(first);
          }
        }
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setDemoOff(true);
        setPhones({ personas: [], donors: [] });
      });
  }, [initialTel]);

  const select = useCallback((p: string) => {
    setPhone(p);
    setFree(p);
    try {
      window.history.replaceState(null, '', `?tel=${encodeURIComponent(p)}`);
    } catch {}
  }, []);

  const phoneRef = useRef(phone);
  useEffect(() => {
    phoneRef.current = phone;
  }, [phone]);

  const loadInbox = useCallback(() => {
    if (!phone) return;
    const current = phone;
    api<OutboxItem[]>(`/sms/outbox?to=${encodeURIComponent(current)}`)
      // Ignore une réponse arrivée après un changement de téléphone.
      .then((r) => {
        if (phoneRef.current === current) setInbox(r);
      })
      .catch(() => undefined);
  }, [phone]);

  const loadFeed = useCallback(() => {
    api<OutboxItem[]>('/sms/outbox')
      .then(setFeed)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setInbox([]);
    loadInbox();
  }, [loadInbox]);
  usePoll(loadInbox, POLL_MS, Boolean(phone) && !demoOff);
  usePoll(loadFeed, POLL_MS, !demoOff);

  async function reply(body: string) {
    const text = body.trim();
    if (!text || !phone) return;
    const id = crypto.randomUUID();
    setSent((s) => [...s, { id, to: phone, body: text, at: new Date().toISOString() }]);
    try {
      const r = await api<{ handled: string }>('/sms/inbound', { method: 'POST', json: { from: phone, body: text } });
      setSent((s) => s.map((x) => (x.id === id ? { ...x, handled: r.handled } : x)));
    } catch (e) {
      setSent((s) => s.map((x) => (x.id === id ? { ...x, error: (e as Error).message } : x)));
    }
    loadInbox();
    loadFeed();
  }

  async function runTick() {
    setTick({ loading: true });
    try {
      const r = await api<{ remindersSent: number; donorAlertsExpired: number; clusterAlerts: number }>('/jobs/tick', { method: 'POST', json: { horizonHours: 24 } });
      setTick({
        loading: false,
        text: [
          many(r.remindersSent) ? t('{n} rappels envoyés (SMS, voix, application)', { n: r.remindersSent }) : t('{n} rappel envoyé (SMS, voix, application)', { n: r.remindersSent }),
          many(r.donorAlertsExpired) ? t('{n} appels au don expirés', { n: r.donorAlertsExpired }) : t('{n} appel au don expiré', { n: r.donorAlertsExpired }),
          many(r.clusterAlerts) ? t('{n} alertes de regroupement', { n: r.clusterAlerts }) : t('{n} alerte de regroupement', { n: r.clusterAlerts }),
        ].join(' · '),
      });
      loadInbox();
      loadFeed();
    } catch (e) {
      setTick({ loading: false, error: (e as Error).message });
    }
  }

  function submitFree(e: FormEvent) {
    e.preventDefault();
    const p = free.replace(/[^\d+]/g, '');
    if (p.length >= 8 && p.length <= 16) select(p);
  }

  const label = useMemo(() => {
    const persona = phones?.personas.find((p) => p.phone === phone);
    if (persona) return persona.label;
    const donor = phones?.donors.find((d) => d.phone === phone);
    return donor ? t('Donneur · {name}', { name: donor.label }) : t('Numéro libre');
  }, [phones, phone, t]);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="label">{t('Sans smartphone · démonstration')}</p>
          <h1 className="mt-1 text-3xl font-bold">{t('Simulateur de téléphone')}</h1>
          <p className="mt-2 max-w-3xl text-[var(--fg-muted)]">{t('Ce que reçoit un téléphone simple : SMS, menu USSD, appel vocal.')}</p>
        </div>
        <div className="space-y-2">
          <button type="button" className="btn btn-primary w-full" onClick={runTick} disabled={tick.loading || demoOff}>
            {tick.loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <CalendarClock size={20} aria-hidden />}
            {t('Envoyer les rappels du jour maintenant')}
          </button>
          <p aria-live="polite" className="max-w-sm text-sm">
            {tick.text && <span className="font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">{tick.text}</span>}
            {tick.error && <span className="font-bold">{tick.error}</span>}
          </p>
        </div>
      </div>

      {demoOff && (
        <p className="rounded-2xl bg-[var(--color-ocre-100)] p-4 font-bold text-[var(--color-ocre-700)]" role="alert">
          {t('Le simulateur n’est disponible qu’en mode démonstration (DEMO_MODE=true côté API).')}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
        {/* ── Choix du téléphone ── */}
        <section aria-labelledby="h-phones" className="space-y-4">
          <h2 id="h-phones" className="text-xl font-bold">{t('Quel téléphone ?')}</h2>
          <form onSubmit={submitFree} className="flex gap-2">
            <label htmlFor="sim-tel" className="sr-only">{t('Numéro de téléphone')}</label>
            <input id="sim-tel" type="tel" inputMode="tel" className="input num" placeholder="01 96 00 01 23" value={free} onChange={(e) => setFree(e.target.value)} />
            <button type="submit" className="btn btn-soft shrink-0 !px-4">{t('Voir')}</button>
          </form>
          {!phones && <p className="text-base text-[var(--fg-muted)]" role="status">{t('Chargement…')}</p>}
          {phones && phones.donors.length > 0 && (
            <PhoneGroup title={t('Donneurs alertés')}>
              {phones.donors.map((d) => (
                <PhoneButton key={d.phone} active={d.phone === phone} onClick={() => select(d.phone)} icon={d.smartphone ? 'smart' : 'simple'} title={d.label} sub={fmtPhone(d.phone)} />
              ))}
            </PhoneGroup>
          )}
          {phones && phones.personas.length > 0 && (
            <PhoneGroup title={t('Personnes de la démo')}>
              {phones.personas.map((p) => (
                <PhoneButton key={p.phone} active={p.phone === phone} onClick={() => select(p.phone)} icon="user" title={p.label} sub={`${ROLE[p.role] ? t(ROLE[p.role]) : p.role} · ${fmtPhone(p.phone)}`} />
              ))}
            </PhoneGroup>
          )}
        </section>

        {/* ── Le téléphone ── */}
        {/* Sur téléphone, l'écran du téléphone choisi passe avant la liste des numéros. */}
        <section aria-labelledby="h-device" className={`space-y-3 ${phone ? 'max-lg:order-first' : ''}`}>
          <h2 id="h-device" className="sr-only">{t('Écran du téléphone {phone}', { phone: phone ? fmtPhone(phone) : '' })}</h2>
          <div className="mx-auto w-full max-w-[360px] rounded-[2.75rem] border-[10px] border-[#1b2622] bg-[#1b2622] shadow-2xl">
            <div className="flex h-[640px] flex-col overflow-hidden rounded-[2.1rem] bg-[#f4f7f5] text-[#13241e]">
              <StatusBar />
              <div className="flex items-center gap-3 border-b border-[#d5e0da] bg-white px-4 py-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0b4f3c] text-sm font-bold text-white" aria-hidden>A</span>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-tight">Ganji</p>
                  <p className="truncate text-xs text-[#52635b]">{phone ? `${label} · ${fmtPhone(phone)}` : t('Choisissez un numéro')}</p>
                </div>
              </div>
              <div role="tablist" aria-label={t('Canal')} className="grid grid-cols-2 border-b border-[#d5e0da] bg-white text-sm font-bold">
                {(['sms', 'ussd'] as const).map((c) => (
                  <button
                    key={c}
                    role="tab"
                    type="button"
                    aria-selected={tab === c}
                    aria-controls={`panel-${c}`}
                    id={`tab-${c}`}
                    onClick={() => setTab(c)}
                    className={`min-h-11 border-b-2 ${tab === c ? 'border-[#0b4f3c] text-[#0b4f3c]' : 'border-transparent text-[#52635b]'}`}
                  >
                    {c === 'sms' ? t('Messages et appels') : `USSD ${USSD_CODE}`}
                  </button>
                ))}
              </div>
              {tab === 'sms' ? (
                <SmsPanel phone={phone} inbox={inbox} sent={sent.filter((s) => s.to === phone)} onReply={reply} />
              ) : (
                <UssdPanel phone={phone} />
              )}
            </div>
          </div>
          <p className="text-center text-sm text-[var(--fg-muted)]">{t('Actualisation automatique toutes les 3 secondes.')}</p>
        </section>

        {/* ── Tous les messages ── */}
        <section aria-labelledby="h-feed" className="space-y-3">
          <h2 id="h-feed" className="text-xl font-bold">{t('Tous les messages')} <span className="num text-base font-normal text-[var(--fg-muted)]">({feed.length})</span></h2>
          <ul className="card max-h-[680px] divide-y divide-[var(--border)] overflow-y-auto">
            {feed.length === 0 && <li className="p-4 text-base text-[var(--fg-muted)]">{t('Aucun message envoyé pour le moment.')}</li>}
            {feed.map((m) => (
              <li key={m.id} className="space-y-1 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <ChannelIcon channel={m.channel} />
                  <button type="button" onClick={() => select(m.to)} className="num font-bold underline-offset-2 hover:underline" title={t('Afficher ce téléphone')}>
                    {fmtPhone(m.to)}
                  </button>
                  <span className="ml-auto num text-[var(--fg-muted)]">{fmtTime(m.createdAt, locale)}</span>
                </div>
                <p className="line-clamp-2 text-[var(--fg-muted)]">{m.channel === 'VOICE' ? voiceText(m.body) : m.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function PhoneGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label">{title}</p>
      <ul className="grid gap-2">{children}</ul>
    </div>
  );
}

function PhoneButton({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: 'smart' | 'simple' | 'user'; title: string; sub: string }) {
  const Icon = icon === 'user' ? User : icon === 'smart' ? Smartphone : Phone;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left ${active ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-100)] text-[var(--color-brand-950)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
      >
        <Icon size={18} aria-hidden className="shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-base font-bold">{title}</span>
          <span className={`block truncate text-xs ${active ? '' : 'text-[var(--fg-muted)]'}`}>{sub}</span>
        </span>
      </button>
    </li>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const t = useT();
  if (channel === 'VOICE') return <Phone size={16} aria-label={t('Appel vocal')} className="shrink-0 text-[var(--color-brand-500)]" />;
  if (channel === 'PUSH') return <Bell size={16} aria-label={t('Notification')} className="shrink-0 text-[var(--color-ocre-700)]" />;
  return <MessageSquare size={16} aria-label="SMS" className="shrink-0 text-[var(--fg-muted)]" />;
}

function StatusBar() {
  const locale = useLocale();
  const [now, setNow] = useState<string>('');
  useEffect(() => {
    const up = () => setNow(fmtTime(new Date(), locale));
    up();
    const id = setInterval(up, 30_000);
    return () => clearInterval(id);
  }, [locale]);
  return (
    <div className="flex items-center justify-between bg-white px-5 pb-1 pt-2 text-xs font-bold" aria-hidden>
      <span className="num">{now}</span>
      <span className="flex items-center gap-1.5">
        <span>2G</span>
        <Signal size={14} />
        <BatteryMedium size={16} />
      </span>
    </div>
  );
}

type ThreadItem =
  | { kind: 'in'; at: string; item: OutboxItem }
  | { kind: 'out'; at: string; sms: SentSms };

function SmsPanel({ phone, inbox, sent, onReply }: { phone: string; inbox: OutboxItem[]; sent: SentSms[]; onReply: (body: string) => void }) {
  const t = useT();
  const locale = useLocale();
  const [draft, setDraft] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const thread: ThreadItem[] = useMemo(
    () =>
      [
        ...inbox.map((item) => ({ kind: 'in' as const, at: item.createdAt, item })),
        ...sent.map((sms) => ({ kind: 'out' as const, at: sms.at, sms })),
      ].sort((a, b) => +new Date(a.at) - +new Date(b.at)),
    [inbox, sent],
  );

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread.length]);

  function send(body: string) {
    onReply(body);
    setDraft('');
  }

  return (
    <div id="panel-sms" role="tabpanel" aria-labelledby="tab-sms" className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite" aria-relevant="additions">
        {!phone && <p className="p-4 text-center text-sm text-[#52635b]">{t('Choisissez un téléphone à gauche.')}</p>}
        {phone && thread.length === 0 && <p className="p-4 text-center text-sm text-[#52635b]">{t('Aucun message reçu sur ce numéro pour le moment.')}</p>}
        {thread.map((x) => {
          if (x.kind === 'out') {
            return (
              <div key={x.sms.id} className="ml-auto max-w-[80%] space-y-1">
                <p className="rounded-2xl rounded-br-md bg-[#0b4f3c] px-3 py-2 text-[15px] text-white">{x.sms.body}</p>
                <p className="text-right text-[11px] text-[#52635b]">
                  {fmtTime(x.sms.at, locale)} · {x.sms.error ? t('Échec : {error}', { error: x.sms.error }) : x.sms.handled ? (HANDLED[x.sms.handled] ? t(HANDLED[x.sms.handled]) : x.sms.handled) : t('Envoi…')}
                </p>
              </div>
            );
          }
          const m = x.item;
          if (m.channel === 'VOICE') {
            return (
              <div key={m.id} className="space-y-2 rounded-2xl border border-[#c3e2d3] bg-[#e3f1eb] p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-[#0b4f3c]">
                  <PhoneCall size={16} aria-hidden /> {t('Appel vocal ({lang})', { lang: LANG[m.lang] ? t(LANG[m.lang]) : m.lang })}
                  <span className="ml-auto num text-[11px] font-normal text-[#52635b]">{fmtTime(m.createdAt, locale)}</span>
                </p>
                <p className="text-[14px] text-[#13241e]">{voiceText(m.body)}</p>
                <ListenButton text={voiceText(m.body)} audioKey={m.audioKey ?? undefined} lang={m.lang} label={t('Écouter l’appel')} />
              </div>
            );
          }
          if (m.channel === 'PUSH') {
            return (
              <div key={m.id} className="flex items-start gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#d5e0da]">
                <Bell size={16} className="mt-0.5 shrink-0 text-[#8a5d06]" aria-hidden />
                <div className="min-w-0 text-[14px]">
                  <p className="text-xs font-bold text-[#52635b]">{t('Notification Ganji · {time}', { time: fmtTime(m.createdAt, locale) })}</p>
                  <p>{m.body}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="max-w-[85%] space-y-1">
              <p className="whitespace-pre-line rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[15px] shadow-sm ring-1 ring-[#d5e0da]">{m.body}</p>
              <p className="text-[11px] text-[#52635b]">SMS · {fmtTime(m.createdAt, locale)}</p>
            </div>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-[#d5e0da] bg-white p-3">
        <div className="flex gap-2" aria-label={t('Réponses rapides')}>
          {['1', '2', 'RDV'].map((q) => (
            <button key={q} type="button" disabled={!phone} onClick={() => send(q)} className="min-h-11 flex-1 rounded-full border border-[#d5e0da] text-base font-bold disabled:opacity-50">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="sms-draft" className="sr-only">{t('Répondre par SMS')}</label>
          <input
            id="sms-draft"
            className="min-h-11 flex-1 rounded-full border border-[#d5e0da] bg-[#f4f7f5] px-4 text-[15px] text-[#13241e]"
            placeholder={t('Répondre par SMS')}
            maxLength={160}
            value={draft}
            disabled={!phone}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" disabled={!phone || !draft.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0b4f3c] text-white disabled:opacity-50" aria-label={t('Envoyer le SMS')}>
            <Send size={18} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

/** Menu USSD : la saisie de la session est cumulée (« 2*1 »), CON = on continue, END = fin. */
function UssdPanel({ phone }: { phone: string }) {
  const t = useT();
  const [stage, setStage] = useState<'dial' | 'session' | 'ended'>('dial');
  const [input, setInput] = useState('');
  const [acc, setAcc] = useState('');
  const [screen, setScreen] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStage('dial');
    setInput('');
    setAcc('');
    setScreen('');
  }, [phone]);

  async function post(text: string) {
    setLoading(true);
    try {
      const r = await api<{ text: string }>('/ussd', { method: 'POST', json: { from: phone, text } });
      const end = r.text.startsWith('END');
      setScreen(r.text.replace(/^(CON|END)\s?/, ''));
      setStage(end ? 'ended' : 'session');
      setAcc(text);
    } catch (e) {
      setScreen(t('Erreur de connexion : {error}', { error: (e as Error).message }));
      setStage('ended');
    } finally {
      setLoading(false);
      setInput('');
    }
  }

  function call() {
    if (!phone) return;
    if (stage === 'dial') {
      if (input !== USSD_CODE) {
        setScreen(t('Code inconnu. Composez {code}', { code: USSD_CODE }));
        setStage('ended');
        setInput('');
        return;
      }
      void post('');
      return;
    }
    if (stage === 'session' && input) void post(acc ? `${acc}*${input}` : input);
  }

  function hangUp() {
    setStage('dial');
    setInput('');
    setAcc('');
    setScreen('');
  }

  return (
    <div id="panel-ussd" role="tabpanel" aria-labelledby="tab-ussd" className="flex min-h-0 flex-1 flex-col bg-[#1b2622] p-3 text-white">
      <div className="min-h-[190px] flex-1 overflow-y-auto rounded-2xl bg-[#e3f1eb] p-4 font-mono text-[15px] text-[#06291f]" aria-live="polite">
        {loading ? (
          <p className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" aria-hidden /> {t('Connexion USSD…')}</p>
        ) : stage === 'dial' ? (
          <div className="space-y-3">
            <p className="text-sm">{t('Composez le code puis appuyez sur la touche verte.')}</p>
            <button type="button" className="rounded-full bg-[#0b4f3c] px-4 py-2 text-sm font-bold text-white" onClick={() => setInput(USSD_CODE)} disabled={!phone}>
              {t('Composer {code}', { code: USSD_CODE })}
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-line">{screen}</p>
        )}
        {stage === 'session' && !loading && <p className="mt-3 border-t border-[#0b4f3c]/30 pt-2 text-xs">{t('Tapez votre choix puis la touche verte.')}{acc ? ` ${t('Saisie : {input}', { input: acc })}` : ''}</p>}
      </div>
      <p className="num my-2 min-h-8 text-center text-2xl tracking-widest" aria-label={t('Saisie')}>{input || (stage === 'dial' ? '' : ' ')}</p>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={!phone || loading || stage === 'ended'}
            onClick={() => setInput((v) => (v + k).slice(0, 20))}
            className="num min-h-12 rounded-2xl bg-white/10 text-xl font-bold hover:bg-white/20 disabled:opacity-40"
          >
            {k}
          </button>
        ))}
        <button type="button" onClick={hangUp} className="grid min-h-12 place-items-center rounded-2xl bg-white/25" aria-label={t('Raccrocher')}>
          <PhoneOff size={22} aria-hidden />
        </button>
        <button
          type="button"
          onClick={call}
          disabled={!phone || loading || stage === 'ended' || !input}
          className="grid min-h-12 place-items-center rounded-2xl bg-[#1f7a5a] disabled:opacity-40"
          aria-label={stage === 'dial' ? t('Appeler') : t('Envoyer')}
        >
          <PhoneCall size={22} aria-hidden />
        </button>
        <button type="button" onClick={() => setInput((v) => v.slice(0, -1))} className="grid min-h-12 place-items-center rounded-2xl bg-white/10" aria-label={t('Effacer')}>
          <Delete size={22} aria-hidden />
        </button>
      </div>
    </div>
  );
}
