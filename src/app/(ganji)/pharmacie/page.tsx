import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../app/_components/ui';
import { PharmacyOrders } from './_commandes/PharmacyOrders';
import type { PharmacyOrders as Orders } from './_commandes/types';

/** Accueil de l'officine : les commandes d'abord (à accepter, à préparer, à remettre). */
export default async function PharmaciePage() {
  const t = await getT();
  const data = await tryServerApi<Orders>('/pharmacy/orders');
  const fresh = data?.orders.filter((o) => o.status === 'RECUE').length ?? 0;
  const busy = data?.counts.inProgress ?? 0;
  const listen = [
    fresh > 1 ? t('{n} nouvelles commandes à accepter ou refuser.', { n: fresh }) : fresh ? t('{n} nouvelle commande à accepter ou refuser.', { n: fresh }) : t('Aucune nouvelle commande.'),
    busy ? t('{n} en préparation ou en route.', { n: busy }) : '',
    t('Pour remettre une commande, demandez le code à 4 chiffres du patient.'),
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="space-y-5">
      <PageHead icon="delivery" title={t('Commandes')} listen={listen} audioKey="pharmacie.commandes" />
      <PharmacyOrders data={data} />
    </div>
  );
}
