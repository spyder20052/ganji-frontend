import type { Metadata } from 'next';
import { Ban, BookOpen, Stethoscope, Volume2 } from 'lucide-react';
import { PageHead, PreviewBadge, PreviewNotice, Section } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { AssistantMock, type RxItemLite } from './AssistantMock';

export const metadata: Metadata = { title: 'Assistant' };

interface Rx { status: string; prescriber: string; items: RxItemLite[] }

const GUARDRAILS = [
  { Icon: Ban, t: 'Jamais de diagnostic', d: 'Il ne dit pas quelle maladie vous avez et ne change jamais un traitement.' },
  { Icon: BookOpen, t: 'Seulement vos documents', d: 'Il explique ce qui est écrit sur votre ordonnance, avec des mots simples.' },
  { Icon: Stethoscope, t: 'Toujours vers un soignant', d: 'Au moindre doute, il vous oriente vers le centre de santé ou le pharmacien.' },
  { Icon: Volume2, t: 'À l’écrit et à voix haute', d: 'Chaque réponse peut être lue, pour ceux qui lisent peu.' },
];

export default async function AssistantPage() {
  const me = await getMe();
  const res = me.patientId ? await load<Rx[]>('/prescriptions/mine') : null;
  const rx = res?.data?.find((r) => r.status === 'ACTIVE') ?? res?.data?.[0] ?? null;

  return (
    <>
      <PageHead
        icon="chat"
        title="Assistant"
        intro="Votre ordonnance expliquée avec des mots simples, et lue à voix haute."
        listen="L'assistant explique votre ordonnance avec des mots simples et peut vous la lire. Il ne fait jamais de diagnostic : pour toute question sur votre santé, il vous envoie vers un soignant."
        audioKey="app.assistant"
      >
        <PreviewBadge />
      </PageHead>

      <PreviewNotice>
        Maquette cliquable (module M8). Les réponses viennent de règles fixes écrites à l’avance, pas d’une intelligence artificielle : c’est ce comportement, avec ses garde-fous, qui sera à valider par des médecins.
      </PreviewNotice>

      <Section id="h-garde" title="Ses garde-fous" icon="shield">
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUARDRAILS.map(({ Icon, t, d }) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-[var(--bg)] p-4">
              <Icon size={24} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />
              <span>
                <span className="block font-bold">{t}</span>
                <span className="block text-base text-[var(--fg-muted)]">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <AssistantMock items={rx?.items ?? []} prescriber={rx?.prescriber ?? null} />
    </>
  );
}
