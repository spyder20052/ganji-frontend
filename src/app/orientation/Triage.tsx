'use client';
import { ArrowLeft, HeartHandshake, Loader2, Phone, RotateCcw, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ListenButton } from '@/components/ListenButton';
import { LocateControl } from '@/components/LocateControl';
import { Pictogram } from '@/components/Pictogram';
import { PlaceList } from '@/components/PlaceList';
import { api } from '@/lib/api';
import type { LatLng, Place } from '@/lib/places';
import { useGeolocation } from '@/lib/use-geolocation';

type Outcome = 'MAISON' | 'PHARMACIE' | 'CENTRE_SANTE' | 'URGENCE';

interface TriageAnswer { label: string; pictogram: string; next?: string; outcome?: Outcome; flags?: string[] }
interface TriageNode { id: string; text: string; pictogram: string; audioKey: string; answers: TriageAnswer[] }
interface TriageTree {
  start: string;
  nodes: Record<string, TriageNode>;
  disclaimer: string;
  validatedBy: string | null;
  advice?: Partial<Record<Outcome, { title: string; advice: string[] }>>;
}
interface TriageResult {
  complete: boolean;
  outcome?: Outcome;
  flags?: string[];
  title?: string;
  advice?: string[];
  path?: { question: string; answer: string }[];
  places?: Place[];
  crisis?: boolean;
  disclaimer?: string;
  /** Calculé sur le téléphone, sans réseau. */
  offline?: boolean;
}

const MAX_STEPS = 4;

/** Pictogrammes de l'arbre qui n'ont pas (encore) d'icône dédiée : équivalent le plus proche. */
const PICTO_ALIAS: Record<string, string> = {
  breathing: 'breath', 'stiff-neck': 'pain', 'blood-stool': 'bleeding', dehydration: 'water-loss', ors: 'drop',
  'chest-pain': 'heart', stroke: 'headache', question: 'other', jaundice: 'eye', 'blood-cough': 'bleeding',
  'blood-vomit': 'bleeding', nose: 'bleeding', bandage: 'bruise', 'sickle-cell': 'blood', fracture: 'injury',
  burn: 'swelling', bite: 'warning', crisis: 'mind', talk: 'chat', urine: 'drop',
};
const picto = (name: string) => PICTO_ALIAS[name] ?? name;

/** Copie locale des conseils (même texte que l'API) : sert quand il n'y a pas de réseau. */
const LOCAL_ADVICE: Record<Outcome, { title: string; advice: string[] }> = {
  MAISON: {
    title: 'Soins à la maison',
    advice: [
      'Reposez-vous et buvez souvent de l’eau propre.',
      'Pour un enfant : continuez l’allaitement et les repas.',
      'En cas de diarrhée, donnez des SRO (sels de réhydratation orale).',
      'Dormez sous une moustiquaire imprégnée.',
    ],
  },
  PHARMACIE: {
    title: 'Conseil en pharmacie',
    advice: [
      'Allez dans une pharmacie proche ou de garde et expliquez les signes.',
      'Pour une diarrhée d’enfant : SRO et zinc pendant 10 jours.',
      'Ne prenez pas d’antibiotique sans ordonnance.',
      'Suivez les doses indiquées, ne dépassez pas la dose de paracétamol.',
    ],
  },
  CENTRE_SANTE: {
    title: 'Consultez un centre de santé aujourd’hui',
    advice: [
      'Allez au centre de santé le plus proche aujourd’hui, sans attendre plusieurs jours.',
      'Ne prenez pas de médicament contre le paludisme sans test.',
      'Apportez votre carnet de santé et la liste de vos médicaments.',
      'Si un signe de danger apparaît en chemin, allez directement aux urgences.',
    ],
  },
  URGENCE: {
    title: 'Urgence : partez maintenant',
    advice: [
      'Rendez-vous immédiatement aux urgences de l’hôpital le plus proche.',
      'Si la personne ne peut pas être transportée, appelez les secours (sapeurs-pompiers : 118).',
      'Ne donnez rien à boire ni à manger à une personne inconsciente ou qui convulse ; couchez-la sur le côté.',
      'Emportez le carnet de santé et les médicaments déjà pris.',
    ],
  },
};

const OUTCOME_UI: Record<Outcome, { heading: string; icon: string; placesTitle: string; card: string; iconBox: string }> = {
  URGENCE: {
    heading: 'Allez aux urgences maintenant',
    icon: 'emergency',
    placesTitle: 'Urgences ouvertes les plus proches',
    card: 'bg-[var(--color-danger-600)] text-white !border-0',
    iconBox: 'bg-white text-[var(--color-danger-600)]',
  },
  CENTRE_SANTE: {
    heading: 'Allez au centre de santé aujourd’hui',
    icon: 'stethoscope',
    placesTitle: 'Centres de santé les plus proches',
    card: 'bg-[var(--color-brand-900)] text-white !border-0',
    iconBox: 'bg-white text-[var(--color-brand-900)]',
  },
  PHARMACIE: {
    heading: 'Demandez conseil en pharmacie',
    icon: 'pharmacy',
    placesTitle: 'Pharmacies de garde les plus proches',
    card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-950)] !border-0',
    iconBox: 'bg-white text-[var(--color-brand-900)]',
  },
  MAISON: {
    heading: 'Vous pouvez vous soigner à la maison',
    icon: 'home',
    placesTitle: 'Pharmacie de garde la plus proche',
    card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-950)] !border-0',
    iconBox: 'bg-white text-[var(--color-brand-900)]',
  },
};

/** Consignes ciblées selon les signes choisis. */
const FLAG_NOTES: Record<string, { icon: string; text: string }> = {
  TDR_PALU: { icon: 'fever', text: 'Demandez un test rapide du paludisme (TDR). Ne prenez pas de traitement contre le paludisme sans test.' },
  SRO_ZINC: { icon: 'drop', text: 'Demandez des SRO et du zinc pour l’enfant (zinc pendant 10 jours).' },
  SRO: { icon: 'drop', text: 'Buvez des SRO (sels de réhydratation orale) après chaque selle liquide.' },
  DEPISTAGE_TB: { icon: 'cough', text: 'Demandez un dépistage de la tuberculose (examen des crachats).' },
  CPN: { icon: 'pregnant', text: 'Faites votre consultation prénatale (CPN) et apportez votre carnet.' },
  GROSSESSE: { icon: 'pregnant', text: 'Dites tout de suite que vous êtes enceinte.' },
  CONVULSIONS: { icon: 'convulsion', text: 'Pendant les convulsions : protégez la tête, ne mettez rien dans la bouche, puis couchez la personne sur le côté.' },
  BRULURE_GRAVE: { icon: 'swelling', text: 'Refroidissez la brûlure sous l’eau propre pendant 15 minutes. Pas de glace, pas d’huile.' },
  MORSURE: { icon: 'warning', text: 'Lavez la plaie à l’eau et au savon. Pour un serpent : gardez la personne immobile, pas de garrot ni d’incision.' },
  HEMORRAGIE: { icon: 'bleeding', text: 'Appuyez fort et sans relâcher sur la plaie avec un tissu propre.' },
  DESHYDRATATION: { icon: 'drop', text: 'Faites boire des SRO par petites gorgées pendant le trajet si la personne peut boire.' },
};

const COME_BACK_IF: [string, string][] = [
  ['fever', 'La fièvre dure plus de 2 jours'],
  ['no-drink', 'La personne ne peut plus boire ou téter'],
  ['breath', 'Elle respire vite ou difficilement'],
  ['bleeding', 'Du sang apparaît (selles, vomissements, crachats)'],
  ['lethargy', 'Elle est très endormie ou a des convulsions'],
  ['calendar', 'Cela ne va pas mieux dans 2 jours'],
];

/** Rejoue le parcours sur le téléphone (même logique que l'API). */
function computeLocal(tree: TriageTree, answers: number[]): TriageResult {
  let nodeId: string | undefined = tree.start;
  const flags = new Set<string>();
  const path: { question: string; answer: string }[] = [];
  let outcome: Outcome | undefined;
  for (const idx of answers) {
    const node: TriageNode | undefined = nodeId ? tree.nodes[nodeId] : undefined;
    const a: TriageAnswer | undefined = node?.answers[idx];
    if (!node || !a) break;
    path.push({ question: node.text, answer: a.label });
    a.flags?.forEach((f) => flags.add(f));
    if (a.outcome) {
      outcome = a.outcome;
      break;
    }
    nodeId = a.next;
  }
  if (!outcome) return { complete: false };
  const adv = tree.advice?.[outcome] ?? LOCAL_ADVICE[outcome];
  return {
    complete: true,
    outcome,
    flags: [...flags],
    title: adv.title,
    advice: adv.advice,
    path,
    places: [],
    crisis: flags.has('CRISE'),
    disclaimer: 'Ceci est une orientation, pas un diagnostic.',
  };
}

export function Triage() {
  const [tree, setTree] = useState<TriageTree | null>(null);
  const [treeError, setTreeError] = useState(false);
  const [stack, setStack] = useState<string[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [askWhere, setAskWhere] = useState(true);
  const geo = useGeolocation({ autoIfGranted: true });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const requestId = useRef(0);

  const loadTree = useCallback(() => {
    setTreeError(false);
    api<TriageTree>('/triage/tree')
      .then((t) => {
        setTree(t);
        setStack([t.start]);
      })
      .catch(() => setTreeError(true));
  }, []);

  useEffect(loadTree, [loadTree]);

  const submit = useCallback(
    async (t: TriageTree, ans: number[], p: LatLng | null) => {
      const id = ++requestId.current;
      const local = computeLocal(t, ans);
      setSubmitting(true);
      let next: TriageResult;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        next = { ...local, offline: true };
      } else {
        try {
          const r = await api<TriageResult>('/triage', { method: 'POST', json: { answers: ans, ...(p ? { lat: p.lat, lng: p.lng } : {}) } });
          next = r.complete ? r : local;
        } catch {
          next = { ...local, offline: true };
        }
      }
      if (id !== requestId.current) return;
      setResult(next);
      setSubmitting(false);
    },
    [],
  );

  // Position obtenue après le résultat : on redemande les lieux les plus proches.
  useEffect(() => {
    if (tree && result?.complete && geo.pos) void submit(tree, answers, geo.pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.pos]);

  // Déplace le focus sur la nouvelle question ou le résultat (lecteurs d'écran, clavier).
  useEffect(() => {
    if (stack.length > 1 || result) headingRef.current?.focus();
  }, [stack.length, result]);

  function choose(idx: number) {
    if (!tree) return;
    const node = tree.nodes[stack[stack.length - 1]];
    const a = node?.answers[idx];
    if (!a) return;
    const ans = [...answers, idx];
    setAnswers(ans);
    if (a.outcome || !a.next || !tree.nodes[a.next]) {
      setResult(computeLocal(tree, ans)); // affichage immédiat, complété par l'API (lieux proches)
      void submit(tree, ans, geo.pos);
      return;
    }
    setStack([...stack, a.next]);
  }

  function back() {
    if (result) {
      requestId.current++;
      setResult(null);
      setSubmitting(false);
      setAnswers(answers.slice(0, -1));
      return;
    }
    if (stack.length <= 1) return;
    setStack(stack.slice(0, -1));
    setAnswers(answers.slice(0, -1));
  }

  function restart() {
    requestId.current++;
    setResult(null);
    setSubmitting(false);
    setAnswers([]);
    if (tree) setStack([tree.start]);
    window.scrollTo({ top: 0 });
  }

  if (treeError) {
    return (
      <div className="space-y-5">
        <Intro />
        <div className="card space-y-4 p-6">
          <p className="flex items-center gap-2 font-bold"><WifiOff aria-hidden /> Les questions n’ont pas pu être chargées (pas de réseau).</p>
          <p>En cas de signe grave, n’attendez pas : allez à l’hôpital ou appelez les secours.</p>
          <EmergencyNumbers />
          <button type="button" className="btn btn-primary" onClick={loadTree}><RotateCcw size={20} aria-hidden /> Réessayer</button>
        </div>
        <Disclaimer />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="space-y-5">
        <Intro />
        <p className="flex items-center gap-2 text-[var(--fg-muted)]" role="status"><Loader2 className="animate-spin" aria-hidden /> Chargement des questions…</p>
      </div>
    );
  }

  if (result?.complete && result.outcome) {
    return (
      <ResultView
        tree={tree}
        result={result}
        submitting={submitting}
        headingRef={headingRef}
        pos={geo.pos}
        geo={geo}
        onBack={back}
        onRestart={restart}
      />
    );
  }

  const node = tree.nodes[stack[stack.length - 1]];
  if (!node) return null;
  const step = stack.length;
  const spoken = `${node.text} ${node.answers.map((a, i) => `Réponse ${i + 1} : ${a.label}.`).join(' ')}`;

  return (
    <div className="space-y-6">
      <Intro />

      {askWhere && !geo.pos && step === 1 && (
        <section aria-labelledby="h-where" className="card space-y-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="h-where" className="font-bold">Où êtes-vous ? <span className="font-normal text-[var(--fg-muted)]">(facultatif)</span></h2>
            <button type="button" className="text-base font-bold underline underline-offset-2" onClick={() => setAskWhere(false)}>Plus tard</button>
          </div>
          <p className="text-base text-[var(--fg-muted)]">Pour vous montrer le lieu de soin ouvert le plus proche. Votre position n’est pas enregistrée.</p>
          <LocateControl idPrefix="where" status={geo.status} source={geo.source} onLocate={geo.request} onCommune={(p) => geo.setManual(p)} compact />
        </section>
      )}
      {geo.pos && step === 1 && (
        <p className="flex items-center gap-2 text-base text-[var(--fg-muted)]" role="status">
          <Pictogram name="map" size={18} /> {geo.source === 'gps' ? 'Position trouvée' : 'Commune choisie'} : les lieux les plus proches seront proposés.
        </p>
      )}

      <section aria-labelledby="q-title" className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label">Étape {step} sur {MAX_STEPS} max</p>
          {step > 1 && (
            <button type="button" onClick={back} className="btn btn-ghost !min-h-11 text-base"><ArrowLeft size={18} aria-hidden /> Retour</button>
          )}
        </div>
        <div aria-hidden className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: MAX_STEPS }, (_, i) => (
            <span key={i} className={`h-2 rounded-full ${i < step ? 'bg-[var(--color-brand-900)]' : 'bg-[var(--border)]'}`} />
          ))}
        </div>

        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
            <Pictogram name={picto(node.pictogram)} size={34} />
          </span>
          <h2 id="q-title" ref={headingRef} tabIndex={-1} className="pt-2 text-3xl font-bold outline-none">{node.text}</h2>
        </div>
        <ListenButton key={node.id} text={spoken} audioKey={node.audioKey} />

        <ul className="grid gap-3 sm:grid-cols-2">
          {node.answers.map((a, i) => (
            <li key={`${node.id}-${i}`}>
              <button
                type="button"
                onClick={() => choose(i)}
                className="card flex min-h-20 w-full items-center gap-4 p-4 text-left transition-colors hover:border-[var(--color-brand-900)] active:scale-[.99]"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--bg)] text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
                  <Pictogram name={picto(a.pictogram)} size={30} />
                </span>
                <span className="text-lg font-bold leading-snug">{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Disclaimer tree={tree} />
    </div>
  );
}

function Intro() {
  return (
    <div>
      <p className="label">Orientation anonyme · sans compte</p>
      <h1 className="mt-1 text-2xl font-bold">J’ai un symptôme : où aller ?</h1>
    </div>
  );
}

function EmergencyNumbers({ onDark = false }: { onDark?: boolean }) {
  const cls = onDark ? 'bg-white text-[var(--color-danger-800)]' : 'btn-danger';
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a href="tel:118" className={`btn ${cls} !min-h-16 justify-start !rounded-2xl text-left`}>
        <Phone size={26} aria-hidden />
        <span><span className="num block text-3xl leading-none">118</span><span className="block text-base font-bold">Sapeurs-pompiers</span></span>
      </a>
      <a href="tel:117" className={`btn ${cls} !min-h-16 justify-start !rounded-2xl text-left`}>
        <Phone size={26} aria-hidden />
        <span><span className="num block text-3xl leading-none">117</span><span className="block text-base font-bold">Police secours</span></span>
      </a>
    </div>
  );
}

function Disclaimer({ tree }: { tree?: TriageTree }) {
  return (
    <aside className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-base text-[var(--fg-muted)]">
      <p className="font-bold text-[var(--fg)]">Orientation, pas diagnostic.</p>
      <p>
        Ganji vous dit où aller et avec quelle urgence ; seul un soignant peut poser un diagnostic. Arbre de décision inspiré de la PCIME (OMS/UNICEF),{' '}
        {tree?.validatedBy ? `validé par ${tree.validatedBy}.` : 'version de démonstration à valider par des médecins référents.'}
      </p>
    </aside>
  );
}

function ResultView({
  tree,
  result,
  submitting,
  headingRef,
  pos,
  geo,
  onBack,
  onRestart,
}: {
  tree: TriageTree;
  result: TriageResult;
  submitting: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  pos: LatLng | null;
  geo: ReturnType<typeof useGeolocation>;
  onBack: () => void;
  onRestart: () => void;
}) {
  const outcome = result.outcome as Outcome;
  const ui = OUTCOME_UI[outcome];
  const flags = result.flags ?? [];
  const crisis = result.crisis || flags.includes('CRISE');
  const listen = flags.includes('ECOUTE');
  const notes = flags.map((f) => FLAG_NOTES[f]).filter((n): n is { icon: string; text: string } => Boolean(n));
  const tdr = flags.includes('TDR_PALU');
  const places = result.places ?? [];
  const spoken = [ui.heading, ...notes.map((n) => n.text), ...(result.advice ?? [])].join(' ');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Résultat de l’orientation</p>
        <button type="button" onClick={onBack} className="btn btn-ghost !min-h-11 text-base"><ArrowLeft size={18} aria-hidden /> Modifier ma réponse</button>
      </div>

      {result.offline && (
        <p className="flex items-start gap-2 rounded-2xl bg-[var(--color-ocre-100)] p-4 text-base font-bold text-[var(--color-ocre-700)]" role="status">
          <WifiOff size={20} className="mt-0.5 shrink-0" aria-hidden />
          Hors ligne : conseil calculé sur votre téléphone. Les lieux de soin s’afficheront au retour du réseau.
        </p>
      )}

      {crisis && (
        <section aria-labelledby="h-crisis" className="card space-y-3 !border-0 bg-[var(--color-brand-950)] p-6 text-white">
          <h2 id="h-crisis" className="flex items-center gap-3 text-2xl font-bold"><HeartHandshake size={30} aria-hidden /> Vous n’êtes pas seul·e.</h2>
          <p className="text-[var(--color-brand-100)]">
            Ce que vous ressentez peut se soigner. Parlez-en maintenant à quelqu’un de confiance, ou à un écoutant formé, de façon anonyme.
            Si vous êtes en danger immédiat, appelez le 118.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/ecoute" className="btn bg-white text-[var(--color-brand-900)]">Parler à quelqu’un maintenant</Link>
            <a href="tel:118" className="btn border border-white/60 text-white"><Phone size={20} aria-hidden /> Appeler le 118</a>
          </div>
        </section>
      )}

      <section aria-labelledby="h-result" className={`card space-y-4 p-6 ${ui.card}`}>
        <div className="flex items-start gap-4">
          <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-3xl ${ui.iconBox}`}>
            <Pictogram name={ui.icon} size={34} />
          </span>
          <div>
            <h2 id="h-result" ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">{ui.heading}</h2>
            {result.title && result.title !== ui.heading && <p className="mt-1 text-lg opacity-90">{result.title}</p>}
          </div>
        </div>
        {outcome === 'URGENCE' && <EmergencyNumbers onDark />}
        {tdr && (
          <p className="flex items-start gap-3 rounded-2xl bg-[var(--color-ocre-100)] p-4 text-lg font-bold text-[var(--color-ocre-700)]">
            <Pictogram name="fever" size={26} className="shrink-0" />
            Demandez un test rapide du paludisme (TDR).
          </p>
        )}
        <ListenButton text={spoken} audioKey={`triage.outcome.${outcome.toLowerCase()}`} />
      </section>

      {(notes.filter((n) => n !== FLAG_NOTES.TDR_PALU).length > 0 || (result.advice?.length ?? 0) > 0) && (
        <section aria-labelledby="h-advice" className="card space-y-3 p-6">
          <h2 id="h-advice" className="text-xl font-bold">Ce qu’il faut faire</h2>
          <ul className="space-y-3">
            {notes.filter((n) => n !== FLAG_NOTES.TDR_PALU).map((n) => (
              <li key={n.text} className="flex items-start gap-3 font-bold">
                <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={n.icon} size={22} /></span>
                <span className="pt-2.5">{n.text}</span>
              </li>
            ))}
            {result.advice?.map((a) => (
              <li key={a} className="flex items-start gap-3">
                <span aria-hidden className="mt-3 h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand-500)]" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          {listen && !crisis && (
            <p className="rounded-2xl bg-[var(--color-brand-50)] p-4 text-base dark:bg-[var(--bg)]">
              Parler aide. <Link href="/app/ecoute" className="font-bold underline">Espace d’écoute anonyme</Link> : un écoutant formé vous répond.
            </p>
          )}
        </section>
      )}

      {(outcome === 'MAISON' || outcome === 'PHARMACIE') && (
        <section aria-labelledby="h-back" className="card space-y-3 p-6">
          <h2 id="h-back" className="text-xl font-bold">Allez au centre de santé si…</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {COME_BACK_IF.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                <span className="chip-round shrink-0 text-[var(--color-ocre-700)]"><Pictogram name={icon} size={22} /></span>
                <span className="font-bold">{text}</span>
              </li>
            ))}
          </ul>
          <ListenButton text={`Allez au centre de santé si : ${COME_BACK_IF.map(([, t]) => t).join('. ')}.`} audioKey="triage.come_back_if" />
        </section>
      )}

      {!result.offline && (
        <section aria-labelledby="h-places" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="h-places" className="text-xl font-bold">{ui.placesTitle}</h2>
            {submitting && <span className="flex items-center gap-2 text-base text-[var(--fg-muted)]" role="status"><Loader2 size={18} className="animate-spin" aria-hidden /> Recherche…</span>}
          </div>
          {pos ? (
            <PlaceList places={places} from={geo.source === 'gps' ? pos : null} empty={submitting ? 'Recherche des lieux…' : 'Aucun lieu trouvé près de vous. Allez à l’hôpital de zone le plus proche.'} />
          ) : (
            <div className="card space-y-3 p-4">
              <p>Indiquez où vous êtes pour voir le lieu le plus proche.</p>
              <LocateControl idPrefix="result" status={geo.status} source={geo.source} onLocate={geo.request} onCommune={(p) => geo.setManual(p)} />
            </div>
          )}
          <p className="text-sm text-[var(--fg-muted)]">
            Distances à vol d’oiseau ; positions des établissements approximatives. <Link href="/carte" className="underline">Voir tous les lieux de soin</Link>
          </p>
        </section>
      )}

      {result.path && result.path.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer font-bold">Mes réponses ({result.path.length})</summary>
          <ol className="mt-3 space-y-2 text-base">
            {result.path.map((p, i) => (
              <li key={i}><span className="text-[var(--fg-muted)]">{p.question}</span> <strong>{p.answer}</strong></li>
            ))}
          </ol>
        </details>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRestart} className="btn btn-primary"><RotateCcw size={20} aria-hidden /> Recommencer</button>
        <Link href="/" className="btn btn-ghost">Accueil</Link>
      </div>

      <Disclaimer tree={tree} />
    </div>
  );
}
