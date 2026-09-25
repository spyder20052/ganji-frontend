'use client';
import { Check, Droplet, FileText, PhoneCall, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/client';

/**
 * L'histoire de Koffi (parcours héros du cahier des charges), racontée au scroll.
 * Ordinateur : le téléphone reste fixe et son écran suit l'étape lue. Téléphone : chaque étape a
 * son écran. À l'étape de Rodrigue, c'est le visiteur qui appuie sur « 1 ».
 */
const STEPS = [
  { id: 'demande', title: 'Le médecin demande des plaquettes', text: 'Dr Houngbédji demande 2 poches pour Koffi. Ganji vérifie aussitôt les stocks de l’ANTS.' },
  { id: 'alerte', title: '14 donneurs alertés', text: 'Stock insuffisant : les donneurs compatibles, disponibles et proches reçoivent un appel au don.' },
  { id: 'reponse', title: 'Rodrigue répond « 1 »', text: 'Sur un simple téléphone à touches, sans internet. À vous : appuyez sur 1.' },
  { id: 'trouve', title: 'Donneur trouvé, en direct', text: 'Le médecin le voit tout de suite. Afiavi, la mère de Koffi, reçoit un message vocal en fon.' },
  { id: 'carnet', title: 'La transfusion entre au carnet', text: 'Koffi la retrouve dans sa chronologie de soins, avec la date et le lieu.' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export function KoffiStory() {
  const t = useT();
  const [active, setActive] = useState<StepId>('demande');
  const [replied, setReplied] = useState(false);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.step as StepId);
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-16">
      <div className="hidden md:block">
        <div className="sticky top-28">
          <Phone>
            <Screen step={active} replied={replied} onReply={() => setReplied(true)} />
          </Phone>
        </div>
      </div>

      <ol className="space-y-6 md:space-y-0">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-step={s.id}
            className="flex gap-4 md:min-h-[62vh] md:items-center"
          >
            <span aria-hidden className={`font-display grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-medium transition-colors md:self-center ${active === s.id ? 'bg-brand-900 text-white' : 'bg-brand-100 text-brand-900'}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <h3 className="text-2xl font-medium">{t(s.title)}</h3>
              <p className="max-w-[46ch] text-lg text-fg-muted">{t(s.text)}</p>
              {/* Téléphone : l'écran de l'étape, sous son texte. */}
              <div className="pt-3 md:hidden">
                <Phone compact>
                  <Screen step={s.id} replied={replied} onReply={() => setReplied(true)} />
                </Phone>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Phone({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`mx-auto w-full rounded-[2.4rem] border-[9px] border-ink bg-ink ${compact ? 'max-w-[320px]' : 'max-w-[340px]'}`}>
      <div className={`flex flex-col overflow-hidden rounded-[1.8rem] bg-surface text-ink [&_:focus-visible]:!outline-brand-900 ${compact ? 'min-h-[300px]' : 'min-h-[520px]'}`}>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 text-xs font-semibold text-muted">
          <span>08:14</span>
          <span>2G</span>
        </div>
        <div className="flex flex-1 flex-col px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

function Screen({ step, replied, onReply }: { step: StepId; replied: boolean; onReply: () => void }) {
  const t = useT();
  // L'écran des deux dernières étapes suppose la réponse de Rodrigue.
  const found = replied || step === 'trouve' || step === 'carnet';
  switch (step) {
    case 'demande':
      return (
        <ScreenCard title={t('Demande de sang · Koffi A.')}>
          <p className="font-display text-3xl font-medium">{t('2 poches')}</p>
          <p className="text-base">{t('Plaquettes · groupe O+')}</p>
          <p className="mt-3 rounded-2xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-800">{t('Stock insuffisant à moins de 60 km : 1 poche')}</p>
        </ScreenCard>
      );
    case 'alerte':
      return (
        <ScreenCard title={t('Appel aux donneurs')}>
          <p className="flex flex-wrap items-end gap-x-2">
            <span className="font-display text-5xl font-medium">14</span>
            <span className="pb-1 text-base">{t('donneurs alertés')}</span>
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {['Rodrigue · 0,9 km', 'Chimène · 1,5 km', 'Landry · 1,6 km'].map((d) => (
              <li key={d} className="flex flex-wrap items-center justify-between gap-x-2 rounded-2xl bg-white px-3 py-2">
                <span>{d}</span>
                <span className="text-muted">{t('en attente')}</span>
              </li>
            ))}
          </ul>
        </ScreenCard>
      );
    case 'reponse':
      return (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm font-semibold text-muted">{t('SMS · Ganji')}</p>
          <p className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-3 py-2 text-base">{t('Rodrigue, votre don de sang peut sauver une vie à CNHU-HKM, à 1 km. Répondez 1 pour OUI ou 2 pour NON.')}</p>
          {replied && (
            <>
              <p className="ml-auto rounded-2xl rounded-tr-md bg-brand-900 px-4 py-2 text-base text-white">1</p>
              <p className="max-w-[92%] rounded-2xl rounded-tl-md bg-white px-3 py-2 text-base">{t('Merci Rodrigue ! Rendez-vous demain à 8 h à CNHU-HKM.')}</p>
            </>
          )}
          <div className="mt-auto grid grid-cols-3 gap-2 pt-2" role="group" aria-label={t('Clavier du téléphone')}>
            {['1', '2', '3'].map((k) => (
              <button
                key={k}
                type="button"
                onClick={k === '1' ? onReply : undefined}
                disabled={k !== '1' || replied}
                aria-label={k === '1' ? t('Répondre 1 : oui, je donne mon sang') : t('Touche {k}', { k })}
                className={`font-display grid h-12 place-items-center rounded-2xl text-xl font-medium ${k === '1' && !replied ? 'bg-leaf text-brand-900 ring-4 ring-leaf/40' : 'bg-white text-muted'}`}
              >
                {k === '1' && replied ? <Check size={20} aria-hidden /> : k}
              </button>
            ))}
          </div>
          <p aria-live="polite" className="sr-only">
            {replied ? t('Réponse envoyée. Le médecin voit : donneur trouvé.') : ''}
          </p>
        </div>
      );
    case 'trouve':
      return (
        <ScreenCard title={t('Demande de sang · Koffi A.')}>
          <p className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-lg font-semibold ${found ? 'bg-brand-900 text-white' : 'bg-white'}`}>
            <Droplet size={20} aria-hidden /> {t('Donneur trouvé')}
          </p>
          <p className="mt-2 text-base">{t('Rodrigue viendra demain à 8 h.')}</p>
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm">
            <PhoneCall size={18} aria-hidden className="shrink-0 text-brand-500" />
            <span className="min-w-0">
              {t('Message vocal en fon envoyé à')} <strong>Afiavi</strong>
            </span>
          </div>
        </ScreenCard>
      );
    default:
      return (
        <ScreenCard title={t('Carnet de Koffi · mes soins')}>
          <div className="flex gap-3 rounded-2xl bg-white p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-danger-600 text-white">
              <Droplet size={18} aria-hidden />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-muted">{t('Aujourd’hui · CNHU-HKM')}</p>
              <p className="text-base font-semibold">{t('Transfusion')}</p>
              <p>{t('2 poches de plaquettes (O+)')}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-3 rounded-2xl bg-white/60 p-3 text-sm text-muted">
            <FileText size={18} aria-hidden className="mt-0.5 shrink-0" />
            <span>{t('Ordonnance · il y a 2 jours')}</span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <Send size={14} aria-hidden /> {t('Visible aussi par son équipe de soins')}
          </p>
        </ScreenCard>
      );
  }
}

function ScreenCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-3 text-sm font-semibold text-muted">{title}</p>
      <div className="rounded-3xl bg-brand-100 p-4">{children}</div>
    </div>
  );
}
