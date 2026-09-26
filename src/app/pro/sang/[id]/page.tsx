import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { serverApi, ServerApiError } from '@/lib/server-api';
import { BloodLive } from './BloodLive';
import type { LiveRequest } from './types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Demande de sang en direct') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BloodRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let initial: LiveRequest;
  try {
    initial = await serverApi<LiveRequest>(`/blood/requests/${id}`);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) notFound();
    if (e instanceof ServerApiError && e.status === 403) {
      const t = await getT();
      return (
        <div className="card max-w-xl space-y-3 p-6">
          <h1 className="text-2xl font-bold">{t('Demande non accessible')}</h1>
          <p className="text-[var(--fg-muted)]">{t('Seuls le prescripteur, l’équipe soignante du patient et la banque de sang suivent cette demande.')}</p>
          <Link href="/pro" className="btn btn-primary">
            {t('Retour à mes patients')}
          </Link>
        </div>
      );
    }
    throw e;
  }
  return (
    <I18nScope area="sangPartage">
      <BloodLive id={id} initial={initial} />
    </I18nScope>
  );
}
