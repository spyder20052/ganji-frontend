import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { AlertsBoard } from './AlertsBoard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Alertes sanitaires'),
    description: t('Alertes officielles du ministère de la Santé pour votre commune : épidémies, campagnes de vaccination, ruptures.'),
  };
}

export default function AlertesPage() {
  return (
    <I18nScope area="public">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        <AlertsBoard />
      </main>
    </I18nScope>
  );
}
