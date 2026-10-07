import type { Metadata } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../app/_components/ui';
import { getMe } from '../pro/_lib/me';
import type { LiveRequest } from '../pro/sang/[id]/types';
import { AntsRequests } from './AntsRequests';
import type { StockSite } from './stock';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Demandes de sang') };
}

const OPEN = ['OUVERTE', 'DONNEURS_ALERTES', 'DONNEUR_TROUVE', 'POCHES_RESERVEES'];

/** Accueil de la banque de sang : les demandes des hôpitaux, les plus urgentes d'abord. */
export default async function AntsPage() {
  const t = await getT();
  const [me, sites, requests] = await Promise.all([getMe(), tryServerApi<StockSite[]>('/blood/stocks'), tryServerApi<LiveRequest[]>('/blood/requests')]);
  const own = sites?.find((s) => s.id === me.facilityId) ?? null;
  const open = (requests ?? []).filter((r) => OPEN.includes(r.status)).length;
  const vital = (requests ?? []).filter((r) => r.urgency === 'VITALE' && ['OUVERTE', 'DONNEURS_ALERTES'].includes(r.status)).length;

  return (
    <div className="space-y-5">
      <PageHead
        icon="hospital"
        title={t('Demandes de sang')}
        listen={t(
          'Les demandes des hôpitaux arrivent ici, les plus urgentes d’abord. Réservez des poches de votre stock, relancez les donneurs, appelez ceux qui ont dit oui. Quand la transfusion est faite, cochez les donneurs qui sont venus donner.',
        )}
      >
        <span className="pill bg-[var(--color-ocre-100)] !text-base text-[var(--color-ocre-700)]">{t('{n} en cours', { n: open })}</span>
        {vital > 0 && (
          <span className="pill bg-[var(--color-danger-50)] !text-base text-[var(--color-danger-800)]">
            {vital > 1 ? t('{n} vitales sans donneur', { n: vital }) : t('{n} vitale sans donneur', { n: vital })}
          </span>
        )}
      </PageHead>

      <section aria-label={t('Demandes des hôpitaux')} className="card p-4 sm:p-5">
        {requests === null ? (
          <p className="text-[var(--fg-muted)]">{t('Demandes indisponibles pour le moment.')}</p>
        ) : (
          <I18nScope area="sangPartage">
            <AntsRequests initial={requests} own={own} />
          </I18nScope>
        )}
      </section>
    </div>
  );
}
