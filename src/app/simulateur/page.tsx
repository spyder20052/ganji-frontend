import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { Simulator } from './Simulator';

export const metadata: Metadata = {
  title: 'Simulateur SMS, USSD et voix',
  description: 'Ce que reçoit un téléphone simple : SMS, menu USSD *229*25#, appel vocal. Démonstration en direct.',
};

export default async function SimulateurPage({ searchParams }: { searchParams: Promise<{ tel?: string | string[] }> }) {
  const { tel } = await searchParams;
  const initialTel = (Array.isArray(tel) ? tel[0] : tel)?.replace(/[^\d+]/g, '').slice(0, 16) ?? '';
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        <Simulator initialTel={initialTel} />
      </main>
    </>
  );
}
