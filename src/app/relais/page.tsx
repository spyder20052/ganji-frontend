import type { Metadata } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { RelayHome } from './RelayHome';
import { RelayVisits } from './RelayVisits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Signaler en 3 gestes') };
}

export default function RelaisPage() {
  return (
    <main id="contenu" className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6">
      <RelayHome
        top={
          <I18nScope area="ecoute">
            <RelayVisits />
          </I18nScope>
        }
      />
    </main>
  );
}
