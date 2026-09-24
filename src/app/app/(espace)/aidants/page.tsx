import type { Metadata } from 'next';
import Link from 'next/link';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { SCOPE_LABEL } from '../../_lib/labels';
import { getMe, load } from '../../_lib/load';
import { RevokeButton } from '../partage/RevokeButton';
import { AddDelegation, DiscreetToggle } from './Delegations';
import { OfflinePin } from './OfflinePin';

export const metadata: Metadata = { title: 'Aidants et réglages' };

interface Delegation { id: string; relation: string; scopes: string[]; createdAt: string; caregiver: { displayName: string } }

export default async function AidantsPage() {
  const me = await getMe();
  const [delRes, sumRes] = me.patientId ? await Promise.all([load<Delegation[]>('/me/delegations'), load<Summary>('/me/summary')]) : [null, null];
  const dels = delRes?.data ?? [];

  return (
    <>
      <PageHead
        icon="care"
        title="Aidants et réglages"
        intro="Choisissez les proches qui peuvent vous aider, et protégez votre carnet sur ce téléphone."
        listen="Ici, vous pouvez ajouter un proche comme aidant avec son numéro de téléphone. Il pourra voir ce que vous choisissez, jamais vos données très sensibles. Vous pouvez aussi activer le mode discret et protéger votre carnet par un code PIN."
        audioKey="app.aidants"
      />

      {me.delegations.length > 0 && (
        <Section id="h-jaide" title="Les personnes que j’aide" icon="people">
          <ul className="grid gap-3 sm:grid-cols-2">
            {me.delegations.map((d) => (
              <li key={d.patient.id} className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-lg font-bold">{d.patient.firstName} {d.patient.lastName} <span className="font-normal text-[var(--fg-muted)]">({d.relation})</span></p>
                <p className="text-sm text-[var(--fg-muted)]">Vous pouvez voir : {d.scopes.map((s) => (SCOPE_LABEL[s] ?? s).toLowerCase()).join(', ')}</p>
                <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-soft mt-3 w-full">Ouvrir son carnet</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {me.patientId && (
        <Section id="h-aidants" title="Mes aidants" icon="care">
          {delRes?.error && <ErrorNote error={delRes.error} />}
          {delRes?.data && dels.length === 0 && <Empty>Aucun aidant pour le moment.</Empty>}
          {dels.length > 0 && (
            <ul className="mb-5 space-y-3">
              {dels.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="people" size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{d.caregiver.displayName} <span className="font-normal text-[var(--fg-muted)]">({d.relation})</span></p>
                    <p className="text-sm text-[var(--fg-muted)]">
                      Depuis le {fmtDate(d.createdAt, { day: 'numeric', month: 'long' })} · peut voir : {d.scopes.map((s) => (SCOPE_LABEL[s] ?? s).toLowerCase()).join(', ')}
                    </p>
                  </div>
                  <RevokeButton id={d.id} who={d.caregiver.displayName} path="/me/delegations" label="Retirer cet aidant" />
                </li>
              ))}
            </ul>
          )}
          <AddDelegation />
        </Section>
      )}

      {me.patientId && (
        <Section id="h-discret" title="Discrétion" icon="eye" className="simple-hide">
          {sumRes?.error && <ErrorNote error={sumRes.error} />}
          {sumRes?.data && <DiscreetToggle initial={sumRes.data.discreetMode} />}
        </Section>
      )}

      {me.patientId && (
        <Section id="h-pin" title="Carnet hors ligne protégé par code PIN" icon="shield">
          <OfflinePin />
        </Section>
      )}

      <Section id="h-affichage" title="Affichage et voix" icon="a11y" className="simple-hide">
        <p className="text-base">
          Taille du texte (jusqu’à 200 %), thème sombre, langue de la voix (fon, yoruba, bariba, dendi) et mode simple : touchez la roue dentée en haut de l’écran.
        </p>
      </Section>
    </>
  );
}
