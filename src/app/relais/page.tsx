import type { Metadata } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import { PageHead } from '../app/_components/ui';
import { RelayHome } from './RelayHome';
import { RelayVisits, type VisitList } from './RelayVisits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Accueil') };
}

/**
 * Accueil du relais : d'abord les visites demandées par le cercle de soins, puis le signalement en 3 gestes.
 * Un seul bouton Écouter, en tête : il lit les visites du jour puis la marche à suivre pour signaler.
 */
export default async function RelaisPage() {
  const [t, visits] = await Promise.all([getT(), tryServerApi<VisitList>('/relay/visits')]);
  const todo = visits?.todo ?? [];
  const list = todo.map((v) => (v.commune ? `${v.firstName}, ${v.commune}` : v.firstName)).join(' ; ');
  const listen = [
    todo.length === 0
      ? t('Aucune visite à faire.')
      : todo.length > 1
        ? t('{n} visites à faire : {list}. Passez prendre des nouvelles, puis touchez « Fait ».', { n: todo.length, list })
        : t('{n} visite à faire : {list}. Passez prendre des nouvelles, puis touchez « Fait ».', { n: todo.length, list }),
    t('Pour signaler une maladie : touchez ce que vous avez vu, dites combien de personnes sont malades, puis où.'),
  ].join(' ');

  return (
    <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
      <PageHead icon="people" title={t('Relais')} intro={t('Visites à faire et signalements de votre commune.')} listen={listen} audioKey="relay.accueil" />
      <I18nScope area="ecoute">
        <RelayVisits initial={visits} />
      </I18nScope>
      <RelayHome />
    </main>
  );
}
