'use client';
import { Phone, PhoneCall, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/client';

/** Les messages « ganji » sont gardés en français et traduits à l'affichage. */
interface Msg { from: 'moi' | 'ganji'; text: string }

/** Mots qui déclenchent tout de suite l'aide de crise (sans accents, en minuscules), en français et en anglais. */
const CRISIS = [
  'suicide', 'suicider', 'me tuer', 'en finir', 'plus envie de vivre', 'mourir', 'me faire du mal', 'disparaitre', 'je veux partir pour toujours',
  'kill myself', 'end it all', 'end my life', 'take my life', 'want to die', 'wanna die', 'better off dead', 'no reason to live',
  'dont want to live', "don't want to live", 'don’t want to live', 'hurt myself', 'harm myself', 'self-harm', 'self harm', 'disappear forever',
];
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const FIRST_REPLY: Msg = {
  from: 'ganji',
  text: 'Merci de nous écrire. Vous pouvez tout dire ici, sans donner votre nom. Une écoutante formée vous répondra sous 24 heures.',
};

/** Maquette : rien n'est envoyé ni enregistré. Tout disparaît en quittant la page. */
export function ListenChat() {
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'ganji', text: 'Bonjour. Ici, personne ne vous juge. Qu’est-ce qui vous pèse en ce moment ?' }]);
  const [draft, setDraft] = useState('');
  const [crisis, setCrisis] = useState(false);
  const [callback, setCallback] = useState(false);
  const [phone, setPhone] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [msgs]);

  // Détection pendant la frappe : l'aide s'affiche avant même l'envoi.
  useEffect(() => {
    if (CRISIS.some((w) => fold(draft).includes(w))) setCrisis(true);
  }, [draft]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const isCrisis = CRISIS.some((w) => fold(text).includes(w));
    if (isCrisis) setCrisis(true);
    setMsgs((m) => [
      ...m,
      { from: 'moi', text },
      ...(m.some((x) => x.from === 'moi') ? [] : [FIRST_REPLY]),
      ...(isCrisis ? [{ from: 'ganji' as const, text: 'Ce que vous vivez compte. Vous n’êtes pas seul·e : quelqu’un peut vous parler maintenant, voir le bandeau en haut.' }] : []),
    ]);
    setDraft('');
  }

  return (
    <div className="space-y-4">
      {crisis && (
        <div role="alert" className="space-y-3 rounded-3xl bg-[var(--color-danger-600)] p-5 text-white">
          <p className="text-2xl font-bold">{t('Vous comptez. Parlons maintenant.')}</p>
          <p className="text-lg">{t('Si vous pensez à mettre fin à vos jours, ne restez pas seul·e. Une personne formée peut vous écouter tout de suite.')}</p>
          <div className="flex flex-wrap gap-3">
            <a href="tel:118" className="btn bg-white text-[var(--color-danger-800)]">
              <Phone size={20} aria-hidden /> {t('Parler à quelqu’un maintenant')}
            </a>
            <button type="button" className="btn border border-white/70 text-white" onClick={() => setCallback(true)} aria-expanded={callback}>
              <PhoneCall size={20} aria-hidden /> {t('Être rappelé·e')}
            </button>
          </div>
          {callback && (
            <form
              className="space-y-2 rounded-2xl bg-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                setMsgs((m) => [...m, { from: 'ganji', text: 'Demande de rappel notée (maquette : rien n’est envoyé). Dans la version réelle, une écoutante vous appelle dans l’heure.' }]);
                setCallback(false);
                setPhone('');
              }}
            >
              <label className="block">
                <span className="mb-1 block font-bold">{t('Numéro où vous rappeler (il n’est pas enregistré)')}</span>
                <input className="input num !text-[var(--fg)]" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </label>
              <button type="submit" className="btn bg-white text-[var(--color-danger-800)]">{t('Demander le rappel')}</button>
            </form>
          )}
          <p className="text-sm text-white/90">{t('Numéro d’appel de la démonstration : sapeurs-pompiers 118. La ligne d’écoute dédiée reste à désigner avec le ministère.')}</p>
        </div>
      )}

      <div className="card flex h-[26rem] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-4" role="log" aria-live="polite" aria-label={t('Conversation')}>
          {msgs.map((m, i) => (
            <p
              key={i}
              className={`max-w-[85%] rounded-3xl px-4 py-3 ${m.from === 'moi' ? 'ml-auto rounded-br-md bg-[var(--color-brand-900)] text-white' : 'rounded-bl-md bg-[var(--color-brand-100)] text-[var(--color-brand-950)]'}`}
            >
              <span className="sr-only">{m.from === 'moi' ? t('Vous : ') : t('Écoute Ganji : ')}</span>
              {m.from === 'ganji' ? t(m.text) : m.text}
            </p>
          ))}
          <div ref={endRef} />
        </div>
        <form
          className="flex gap-2 border-t border-[var(--border)] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="ecoute-msg" className="sr-only">{t('Votre message')}</label>
          <input id="ecoute-msg" className="input flex-1" placeholder={t('Écrivez ici…')} value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn btn-primary" aria-label={t('Envoyer')} disabled={!draft.trim()}>
            <Send size={20} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
