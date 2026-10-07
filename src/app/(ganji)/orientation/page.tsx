import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { Triage } from './Triage';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("J'ai un symptôme"),
    description: t('Où aller : maison, pharmacie, centre de santé ou urgence ? Orientation anonyme par pictogrammes, sans compte.'),
  };
}

export default function OrientationPage() {
  return (
    <I18nScope area="orientation">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <Triage />
      </main>
    </I18nScope>
  );
}
