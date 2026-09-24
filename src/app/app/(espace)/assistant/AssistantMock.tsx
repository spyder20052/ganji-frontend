'use client';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { ListenButton } from '@/components/ListenButton';

export interface RxItemLite { dci: string; strength: string; form: string; dosage: string; duration: string }

/** Formes galéniques en mots de tous les jours. */
const FORM_WORD: Record<string, string> = {
  comprimé: 'un comprimé à avaler avec de l’eau',
  gélule: 'une gélule à avaler avec de l’eau',
  sirop: 'un sirop à boire avec la cuillère fournie',
  injectable: 'une piqûre faite par un soignant',
  pommade: 'une pommade à mettre sur la peau',
  suppositoire: 'un suppositoire',
};

function plainForm(form: string) {
  const key = Object.keys(FORM_WORD).find((k) => form.toLowerCase().includes(k));
  return key ? FORM_WORD[key] : `un médicament sous forme de ${form.toLowerCase()}`;
}

function explain(items: RxItemLite[]) {
  return items.map((i) => `${i.dci} ${i.strength} : c’est ${plainForm(i.form)}. À prendre ainsi : ${i.dosage.toLowerCase()}, pendant ${i.duration}. N’arrêtez pas avant la fin sans en parler à votre médecin.`);
}

/** Garde-fous : l'assistant n'établit jamais de diagnostic et renvoie vers un soignant. */
const DIAGNOSIS = ['est-ce que j’ai', "est-ce que j'ai", 'c’est grave', "c'est grave", 'diagnostic', 'quelle maladie', 'ai-je', 'je suis malade de', 'cancer', 'sida', 'vih', 'palu'];
const DOSE_CHANGE = ['doubler', 'augmenter', 'arrêter', 'arreter', 'plus de comprimés', 'moins de comprimés', 'sauter'];

function answer(q: string, items: RxItemLite[]): string {
  const s = q.toLowerCase();
  if (DIAGNOSIS.some((w) => s.includes(w))) {
    return 'Je ne peux pas dire quelle maladie vous avez : seul un soignant peut le faire. Si vous ne vous sentez pas bien, utilisez « Je ne me sens pas bien » ou allez au centre de santé.';
  }
  if (DOSE_CHANGE.some((w) => s.includes(w))) {
    return 'Je ne peux pas changer votre traitement. Suivez l’ordonnance telle qu’elle est, et posez la question à votre médecin ou à votre pharmacien.';
  }
  if (s.includes('oubli')) {
    return 'Si vous avez oublié une prise : ne doublez pas la suivante. Prenez la prochaine à l’heure prévue et demandez conseil au pharmacien.';
  }
  if (s.includes('manger') || s.includes('repas')) {
    return 'Beaucoup de médicaments se prennent pendant ou après le repas pour protéger l’estomac. Pour le vôtre, le pharmacien peut vous le confirmer en lisant l’ordonnance.';
  }
  if (items.length && (s.includes('ordonnance') || s.includes('explique') || s.includes('comment'))) {
    return explain(items).join(' ');
  }
  return 'Je peux expliquer votre ordonnance avec des mots simples et vous la lire. Pour toute question sur votre santé, parlez-en à un soignant.';
}

export function AssistantMock({ items, prescriber }: { items: RxItemLite[]; prescriber: string | null }) {
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const lines = explain(items);

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Mon ordonnance, expliquée simplement</h2>
        {items.length === 0 ? (
          <p className="text-[var(--fg-muted)]">Aucune ordonnance à expliquer pour le moment. Exemple de ce que vous verriez : « Paracétamol 500 mg : c’est un comprimé à avaler avec de l’eau. »</p>
        ) : (
          <>
            {prescriber && <p className="text-base text-[var(--fg-muted)]">Prescrite par {prescriber}</p>}
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l} className="rounded-2xl bg-[var(--color-brand-50)] p-4 text-lg text-[var(--color-brand-950)]">{l}</li>
              ))}
            </ul>
            <ListenButton text={lines.join(' ')} label="Me lire l’explication" />
          </>
        )}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="text-xl font-bold">Poser une question</h2>
        <div className="flex flex-wrap gap-2">
          {['Explique mon ordonnance', 'J’ai oublié une prise', 'Est-ce que j’ai le palu ?', 'Je peux doubler la dose ?'].map((s) => (
            <button key={s} type="button" className="btn btn-ghost !min-h-11 text-base" onClick={() => setHistory((h) => [...h, { q: s, a: answer(s, items) }])}>
              {s}
            </button>
          ))}
        </div>
        <ul className="space-y-3" aria-live="polite">
          {history.map((h, i) => (
            <li key={i} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-md bg-[var(--color-brand-900)] px-4 py-2 text-white"><span className="sr-only">Vous : </span>{h.q}</p>
              <div className="flex max-w-[85%] flex-col items-start gap-2 rounded-3xl rounded-bl-md bg-[var(--bg)] px-4 py-3">
                <p><span className="sr-only">Assistant : </span>{h.a}</p>
                <ListenButton text={h.a} />
              </div>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!q.trim()) return;
            setHistory((h) => [...h, { q: q.trim(), a: answer(q, items) }]);
            setQ('');
          }}
        >
          <label htmlFor="assist-q" className="sr-only">Votre question</label>
          <input id="assist-q" className="input flex-1" placeholder="Votre question…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn btn-primary" aria-label="Envoyer" disabled={!q.trim()}><Send size={20} aria-hidden /></button>
        </form>
      </div>
    </div>
  );
}
