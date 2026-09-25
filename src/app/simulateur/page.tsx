import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { Simulator } from './Simulator';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Simulateur SMS, USSD et voix'),
    description: t('Ce que reçoit un téléphone simple : SMS, menu USSD *229*25#, appel vocal. Démonstration en direct.'),
  };
}

export default async function SimulateurPage({ searchParams }: { searchParams: Promise<{ tel?: string | string[] }> }) {
  const { tel } = await searchParams;
  const initialTel = (Array.isArray(tel) ? tel[0] : tel)?.replace(/[^\d+]/g, '').slice(0, 16) ?? '';
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        <I18nScope area="relay">
          <Simulator initialTel={initialTel} />
        </I18nScope>
      </main>
    </>
  );
}
