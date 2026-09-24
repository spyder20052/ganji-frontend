import type { Metadata } from 'next';
import { BadgeCheck, Siren } from 'lucide-react';
import { Notice, PageHead, PreviewBadge, PreviewNotice, Section } from '../../_components/ui';
import { getMe } from '../../_lib/load';
import { CostEstimator } from './CostEstimator';

export const metadata: Metadata = { title: 'Mes droits et frais' };

export default async function DroitsPage() {
  const me = await getMe();
  const covered = true; // maquette : statut ARCH fictif
  return (
    <>
      <PageHead
        icon="shield"
        title="Mes droits et frais"
        intro="Savoir ce qui est pris en charge, combien il reste à payer, et payer depuis son téléphone."
        listen="Cette page montre votre couverture santé ARCH, une estimation du prix de vos soins et de vos médicaments, et ce qu'il vous reste à payer. En urgence vitale, on vous soigne d'abord : on paie après."
        audioKey="app.droits"
      >
        <PreviewBadge />
      </PageHead>

      <PreviewNotice>
        Maquette cliquable (module M14). Le statut ARCH et les tarifs des actes sont fictifs ; les prix des médicaments viennent de la recherche Alafia. Le paiement est un bac à sable : rien n’est débité.
      </PreviewNotice>

      <Section id="h-arch" title="Ma couverture santé" icon="shield">
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-[var(--color-brand-900)] p-5 text-white">
          <BadgeCheck size={40} aria-hidden className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">{covered ? 'Couvert par l’ARCH' : 'Pas encore couvert'}</p>
            <p className="text-lg text-[var(--color-brand-100)]">
              Assurance maladie · {me.displayName} · droits valables jusqu’au 31 décembre (exemple)
            </p>
          </div>
          <span className="pill bg-white text-[var(--color-brand-900)]">Vérifié via X-Road (simulé)</span>
        </div>
        <p className="mt-3 text-base text-[var(--fg-muted)]">
          Dans la version réelle, Alafia interroge le registre ARCH avec votre NPI, sans que vous ayez à montrer de papier.
        </p>
      </Section>

      <Section id="h-cout" title="Combien vais-je payer ?" icon="care">
        <CostEstimator covered={covered} />
      </Section>

      <Section id="h-bon" title="Bon d’urgence vitale" icon="emergency">
        <Notice tone="danger" title="En urgence vitale : soigné d’abord, payé après">
          <p>
            Quand votre vie est en danger (hémorragie, accouchement difficile, accident grave), l’hôpital émet un bon d’urgence vitale dans Alafia. Les soins commencent tout de suite, sans avance d’argent.
          </p>
        </Notice>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['1', 'Le soignant constate l’urgence et crée le bon, tracé dans votre journal.'],
            ['2', 'Les soins, le sang et les médicaments sont délivrés sans paiement préalable.'],
            ['3', 'La facture est réglée ensuite : ARCH, fonds d’urgence, puis vous si un reste existe.'],
          ].map(([n, t]) => (
            <li key={n} className="flex gap-3 rounded-2xl bg-[var(--bg)] p-4">
              <span className="num grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-danger-600)] font-bold text-white">{n}</span>
              <span className="text-base">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-center gap-2 text-base text-[var(--fg-muted)]">
          <Siren size={18} aria-hidden /> Le principe proposé : un soin d’urgence vitale ne se refuse jamais faute d’argent.
        </p>
      </Section>
    </>
  );
}
