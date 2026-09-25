import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { BloodRequestView } from '@/lib/types';
import { BloodLive } from './BloodLive';

export const metadata: Metadata = { title: 'Demande de sang en direct' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BloodRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let initial: BloodRequestView;
  try {
    initial = await serverApi<BloodRequestView>(`/blood/requests/${id}`);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) notFound();
    if (e instanceof ServerApiError && e.status === 403) {
      return (
        <div className="card max-w-xl space-y-3 p-6">
          <h1 className="text-2xl font-bold">Demande non accessible</h1>
          <p className="text-[var(--fg-muted)]">Seuls le prescripteur, l’équipe soignante du patient et la banque de sang suivent cette demande.</p>
          <Link href="/pro" className="btn btn-primary">
            Retour à mes patients
          </Link>
        </div>
      );
    }
    throw e;
  }
  return <BloodLive id={id} initial={initial} />;
}
