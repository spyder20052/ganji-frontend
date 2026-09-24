import type { Metadata } from 'next';
import Link from 'next/link';
import { Empty, PageHead } from '../../_components/ui';
import { getMe } from '../../_lib/load';
import { SosButton } from './SosButton';

export const metadata: Metadata = { title: 'Alerte SOS' };

export default async function SosPage() {
  const me = await getMe();
  return (
    <>
      <PageHead
        icon="sos"
        danger
        title="Alerte SOS"
        listen="Touchez le gros bouton rouge, puis confirmez. Vos proches et le relais de votre commune reçoivent un message avec votre position. Pour une urgence grave, appelez aussi le 118."
        audioKey="app.sos"
      />
      <section aria-label="Bouton SOS" className="card p-6 sm:p-10">
        {me.patientId ? <SosButton /> : <Empty>L’alerte SOS est rattachée au carnet du patient. En urgence, appelez le 118.</Empty>}
      </section>
      <p className="text-base text-[var(--fg-muted)]">
        Les secours ont besoin de vos informations vitales ? Montrez votre <Link href="/app/carte-urgence" className="font-bold underline">carte d’urgence</Link>.
      </p>
    </>
  );
}
