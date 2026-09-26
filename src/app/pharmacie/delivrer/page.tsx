import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../../app/_components/ui';
import { DispenseDesk } from '../DispenseDesk';
import { OnDutyToggle } from '../OnDutyToggle';
import type { StockResponse } from '../types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Délivrer') };
}

/** Délivrance au comptoir (QR de l'ordonnance) et garde de la pharmacie. */
export default async function DelivrerPage() {
  const t = await getT();
  const stock = await tryServerApi<StockResponse>('/pharmacy/stock');
  return (
    <div className="space-y-5">
      <PageHead
        icon="qr"
        title={t('Délivrer')}
        listen={t('Scannez le QR de l’ordonnance du patient. Ganji vérifie la signature du médecin et qu’elle n’a jamais servi.')}
        audioKey="pharmacie.delivrer"
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        <DispenseDesk />
        {stock && <OnDutyToggle initial={stock.pharmacy.onDuty} />}
      </div>
    </div>
  );
}
