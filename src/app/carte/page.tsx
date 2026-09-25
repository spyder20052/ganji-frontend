import type { Metadata } from 'next';
import { ListenButton } from '@/components/ListenButton';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { CareMap } from './CareMap';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Lieux de soin'),
    description: t('Hôpitaux, maternités, urgences 24 h/24, pharmacies de garde et sites de transfusion du Bénin.'),
  };
}

export default async function CartePage() {
  const t = await getT();
  return (
    <I18nScope area="public">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-5 px-4 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">{t('Sans compte')}</p>
            <h1 className="mt-1 text-3xl font-bold">{t('Lieux de soin')}</h1>
            <p className="mt-1 max-w-2xl text-[var(--fg-muted)]">{t('Hôpitaux, maternités, urgences, pharmacies de garde et sites de transfusion. Touchez « Autour de moi » pour voir les plus proches.')}</p>
          </div>
          <ListenButton
            text={t("Carte des lieux de soin. Choisissez un type de lieu, puis touchez Autour de moi pour voir les plus proches, avec la distance et l'itinéraire.")}
            audioKey="map.intro"
          />
        </div>
        <CareMap />
      </main>
    </I18nScope>
  );
}
