import type { Metadata } from 'next';
import Link from 'next/link';
import { Pictogram } from '@/components/Pictogram';
import { getLocale, getT } from '@/i18n/server';
import { fmtDate } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { SCOPE_LABEL } from '../../_lib/labels';
import { getMe, load } from '../../_lib/load';
import { RevokeButton } from '../partage/RevokeButton';
import { I18nScope } from '@/i18n/I18nScope';
import { AddDelegation, DiscreetToggle } from './Delegations';
import { OfflinePin } from './OfflinePin';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Aidants et réglages') };
}

interface Delegation { id: string; relation: string; scopes: string[]; createdAt: string; caregiver: { displayName: string } }

export default async function AidantsPage() {
  const [me, t, locale] = await Promise.all([getMe(), getT(), getLocale()]);
  const scopeList = (scopes: string[]) => scopes.map((s) => (SCOPE_LABEL[s] ? t(SCOPE_LABEL[s]) : s).toLowerCase()).join(', ');
  const [delRes, sumRes] = me.patientId ? await Promise.all([load<Delegation[]>('/me/delegations'), load<Summary>('/me/summary')]) : [null, null];
  const dels = delRes?.data ?? [];

  return (
    <>
      <PageHead
        icon="care"
        title={t('Aidants et réglages')}
        intro={t('Choisissez les proches qui peuvent vous aider, et protégez votre carnet sur ce téléphone.')}
        listen={t('Ici, vous pouvez ajouter un proche comme aidant avec son numéro de téléphone. Il pourra voir ce que vous choisissez, jamais vos données très sensibles. Vous pouvez aussi activer le mode discret et protéger votre carnet par un code PIN.')}
        audioKey="app.aidants"
      />

      {me.delegations.length > 0 && (
        <Section id="h-jaide" title={t('Les personnes que j’aide')} icon="people">
          <ul className="grid gap-3 sm:grid-cols-2">
            {me.delegations.map((d) => (
              <li key={d.patient.id} className="rounded-2xl border border-[var(--border)] p-4">
                <p className="text-lg font-bold">{d.patient.firstName} {d.patient.lastName} <span className="font-normal text-[var(--fg-muted)]">({d.relation})</span></p>
                <p className="text-sm text-[var(--fg-muted)]">{t('Vous pouvez voir : {list}', { list: scopeList(d.scopes) })}</p>
                <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-soft mt-3 w-full">{t('Ouvrir son carnet')}</Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {me.patientId && (
        <Section id="h-aidants" title={t('Mes aidants')} icon="care">
          {delRes?.error && <ErrorNote error={delRes.error} />}
          {delRes?.data && dels.length === 0 && <Empty>{t('Aucun aidant pour le moment.')}</Empty>}
          {dels.length > 0 && (
            <ul className="mb-5 space-y-3">
              {dels.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="people" size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold">{d.caregiver.displayName} <span className="font-normal text-[var(--fg-muted)]">({d.relation})</span></p>
                    <p className="text-sm text-[var(--fg-muted)]">
                      {t('Depuis le {date} · peut voir : {list}', { date: fmtDate(d.createdAt, { day: 'numeric', month: 'long' }, locale), list: scopeList(d.scopes) })}
                    </p>
                  </div>
                  <RevokeButton id={d.id} who={d.caregiver.displayName} path="/me/delegations" label={t('Retirer cet aidant')} />
                </li>
              ))}
            </ul>
          )}
          <I18nScope area="compte">
            <I18nScope area="livraison">
              <AddDelegation />
            </I18nScope>
          </I18nScope>
        </Section>
      )}

      {me.patientId && (
        <Section id="h-discret" title={t('Discrétion')} icon="eye" className="simple-hide">
          {sumRes?.error && <ErrorNote error={sumRes.error} />}
          {sumRes?.data && <DiscreetToggle initial={sumRes.data.discreetMode} />}
        </Section>
      )}

      {me.patientId && (
        <Section id="h-pin" title={t('Carnet hors ligne protégé par code PIN')} icon="shield">
          <OfflinePin />
        </Section>
      )}

      <Section id="h-affichage" title={t('Affichage et voix')} icon="a11y" className="simple-hide">
        <p className="text-base">
          {t('Taille du texte (jusqu’à 200 %), thème sombre, langue de la voix (fon, yoruba, bariba, dendi) et mode simple : touchez la roue dentée en haut de l’écran.')}
        </p>
      </Section>
    </>
  );
}
