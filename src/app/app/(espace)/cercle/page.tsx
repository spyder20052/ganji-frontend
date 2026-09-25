import type { Metadata } from 'next';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { PageHead, PreviewBadge, PreviewNotice, Section } from '../../_components/ui';
import { CircleSimulation } from './CircleSimulation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Cercle de soin') };
}

/** Données d'exemple de la maquette (personnes fictives). */
const CIRCLE = [
  { name: 'Afiavi', role: 'Mère · aidante principale', does: 'Rappels, sang, fiche vitale', icon: 'care', lead: true },
  { name: 'Sèna', role: 'Sœur · aidante', does: 'Rappels de rendez-vous', icon: 'people' },
  { name: 'Mathieu', role: 'Relais communautaire', does: 'Visites à domicile, sans accès au dossier', icon: 'home' },
  { name: 'Dr Houngbédji', role: 'Hématologue référent', does: 'Équipe de soins', icon: 'stethoscope' },
];

const VISITS = [
  { date: 'Lundi 14 h', who: 'Mathieu (relais)', what: 'Visite faite : traitement pris, pas de fièvre. Aucun signe d’alerte.', done: true },
  { date: 'Jeudi 10 h', who: 'Mathieu (relais)', what: 'Visite prévue : apporter le rappel de la prise de sang de contrôle.', done: false },
];

export default async function CerclePage() {
  const t = await getT();
  return (
    <I18nScope area="patient3">
      <PageHead
        icon="people"
        title={t('Cercle de soin')}
        intro={t('Plusieurs proches et le relais du quartier, chacun avec son rôle. Quand un rappel n’est pas confirmé, le cercle prend le relais.')}
        listen={t('Le cercle de soin réunit vos aidants, le relais communautaire et votre équipe de soins. Si vous ne confirmez pas un rappel, un aidant est prévenu, sans détail médical.')}
        audioKey="app.cercle"
      >
        <PreviewBadge />
      </PageHead>

      <PreviewNotice>
        {t('Maquette cliquable (module M15). Les personnes et les visites sont des exemples fictifs ; les aidants réels se gèrent déjà dans « Aidants et réglages ».')}
      </PreviewNotice>

      <Section id="h-cercle" title={t('Qui fait partie du cercle')} icon="people">
        <ul className="grid gap-3 sm:grid-cols-2">
          {CIRCLE.map((c) => (
            <li key={c.name} className={`flex items-center gap-3 rounded-2xl border p-4 ${c.lead ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-950)]' : 'border-[var(--border)]'}`}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name={c.icon} size={22} /></span>
              <span className="min-w-0">
                <span className="block text-lg font-bold">{c.name}</span>
                <span className="block text-base">{t(c.role)}</span>
                <span className="block text-sm opacity-80">{t(c.does)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="h-escalade" title={t('Rappel non confirmé : aidant prévenu')} icon="calendar">
        <CircleSimulation />
      </Section>

      <Section id="h-visites" title={t('Visites du relais')} icon="home">
        <ul className="space-y-2">
          {VISITS.map((v) => (
            <li key={v.date} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--bg)] p-4">
              <span className={`pill ${v.done ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--card)] ring-1 ring-[var(--border)]'}`}>{v.done ? t('Faite') : t('Prévue')}</span>
              <span className="font-bold">{t(v.date)}</span>
              <span className="text-[var(--fg-muted)]">· {t(v.who)}</span>
              <p className="w-full text-base">{t(v.what)}</p>
            </li>
          ))}
        </ul>
      </Section>
    </I18nScope>
  );
}
