import type { Metadata } from 'next';
import { tryServerApi } from '@/lib/server-api';
import { Dashboard, type National } from './Dashboard';

export const metadata: Metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

export default async function MinisterePage() {
  // Premier affichage rendu côté serveur ; le tableau de bord s'actualise ensuite toutes les 10 s.
  const initial = await tryServerApi<National>('/dashboard/national');
  return (
    <main id="contenu" className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-6">
      <Dashboard initial={initial} />
    </main>
  );
}
