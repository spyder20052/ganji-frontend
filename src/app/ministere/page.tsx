import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { Dashboard, type National } from './Dashboard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Tableau de bord') };
}
export const dynamic = 'force-dynamic';

export default async function MinisterePage() {
  // Premier affichage rendu côté serveur ; le tableau de bord s'actualise ensuite toutes les 10 s.
  const initial = await tryServerApi<National>('/dashboard/national');
  return (
    <main id="contenu" className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6">
      <Dashboard initial={initial} />
    </main>
  );
}
