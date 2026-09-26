import type { Metadata } from 'next';
import Link from 'next/link';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { ErrorNote, PageHead } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { AssistantBoard } from './AssistantBoard';
import type { Adherence, PlanRx, Today } from './_lib/assistant';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Assistant') };
}

/**
 * Assistant de traitement : les prises du jour, l'observance, le plan de prises créé depuis
 * l'ordonnance, et les questions sur son traitement. Un aidant voit celui de la personne aidée
 * (délégation « rappels ») ; les ordonnances et les questions demandent la délégation « ordonnances ».
 */
export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [me, t, sp] = await Promise.all([getMe(), getT(), searchParams]);
  // Un aidant voit d'abord le traitement de la personne qu'il aide (délégation « rappels ») ; « Moi » pour le sien.
  const helpable = me.delegations.filter((d) => d.scopes.includes('reminders') || d.scopes.includes('all'));
  let helped = sp.p ? (helpable.find((d) => d.patient.id === sp.p) ?? null) : null;
  if (!helped && sp.p !== 'moi' && (!me.patientId || me.role === 'CAREGIVER')) helped = helpable[0] ?? null;
  const patientId = helped?.patient.id;
  const q = patientId ? `?patientId=${patientId}` : '';

  const [today, adherence, plans] = await Promise.all([
    load<Today>(`/me/assistant/today${q}`),
    load<Adherence>(`/me/assistant/adherence${q}`),
    load<PlanRx[]>(`/me/assistant/plans${q}`),
  ]);
  const canPrescriptions = !!plans.data;
  // Un seul bouton « Écouter » par écran (en-tête) : il lit l'essentiel, dont les prises du jour.
  const doses = today.data?.doses ?? [];
  const rate = adherence.data?.last7.rate ?? null;
  const listen = [
    doses.length
      ? t('Aujourd’hui : {n} prises.', { n: doses.length }) +
        ' ' +
        doses.map((d) => t('{time} : {medication}, {dose}.', { time: d.time, medication: d.masked ? t(d.medication) : d.medication, dose: d.dose ?? '' })).join(' ')
      : t('Pas de prise prévue aujourd’hui.'),
    t('Touchez « Pris » quand c’est fait, ou « Oublié ».'),
    rate !== null ? t('Cette semaine, {rate} % des prises ont été faites.', { rate }) : '',
    canPrescriptions ? t('Votre plan de prises se crée depuis l’ordonnance, avec des rappels par SMS. Posez vos questions sur vos médicaments : je réponds avec votre ordonnance, sans diagnostic.') : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <I18nScope area="droits">
      <PageHead
        icon="chat"
        title={helped ? t('Traitement de {prenom}', { prenom: helped.patient.firstName }) : t('Assistant')}
        intro={t('Vos prises du jour, votre plan de prises et vos questions sur votre traitement.')}
        listen={listen}
        audioKey="app.assistant"
      />
      {me.patientId && helpable.length > 0 && (
        <nav aria-label={t('Traitement de')} className="flex flex-wrap gap-2">
          {[{ id: 'moi', label: t('Moi') }, ...helpable.map((d) => ({ id: d.patient.id, label: d.patient.firstName }))].map((x) => {
            const current = x.id === 'moi' ? !helped : helped?.patient.id === x.id;
            return (
              <Link
                key={x.id}
                href={`/app/assistant?p=${x.id}`}
                aria-current={current ? 'page' : undefined}
                className={`btn !min-h-12 ${current ? 'btn-primary' : 'btn-ghost'}`}
              >
                {x.label}
              </Link>
            );
          })}
        </nav>
      )}
      {today.data ? (
        <AssistantBoard
          key={patientId ?? 'moi'}
          initialToday={today.data}
          initialAdherence={adherence.data}
          initialPlans={plans.data}
          patientId={patientId}
          who={helped?.patient.firstName}
          canAsk={canPrescriptions}
        />
      ) : (
        <ErrorNote what={t('Prises du jour')} error={today.error} />
      )}
    </I18nScope>
  );
}
