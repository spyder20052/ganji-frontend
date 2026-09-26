import type { Metadata } from 'next';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { ErrorNote, PageHead } from '../../_components/ui';
import { load } from '../../_lib/load';
import { ListenChat } from './ListenChat';
import type { ListenThread, ListenThreadSummary } from './types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Écoute') };
}

/**
 * Écoute : écrire à la cellule d'écoute (psychologues), anonymement par défaut. La conversation en cours
 * s'ouvre directement ; sinon, une case pour écrire. ?c=<id> rouvre une conversation passée.
 */
export default async function EcoutePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [t, { c }] = await Promise.all([getT(), searchParams]);
  const list = await load<ListenThreadSummary[]>('/me/listen');
  const threads = list.data ?? [];
  const chosen = (c && threads.find((x) => x.id === c)) || threads.find((x) => x.status !== 'CLOS') || null;
  const detail = chosen ? await load<ListenThread>(`/me/listen/${chosen.id}`) : null;
  const current = detail?.data ?? null;
  const past = threads.filter((x) => x.status === 'CLOS' && x.id !== current?.id).slice(0, 5);

  return (
    <>
      <PageHead
        icon="listen"
        title={t('Écoute')}
        intro={t('Écrire à une écoutante formée, sans donner son nom si on le souhaite.')}
        listen={t(
          'Ici, vous pouvez écrire à une écoutante formée, sans donner votre nom si vous le souhaitez. Elle vous répond ici et vous êtes prévenu par une notification. Vous pouvez aussi demander à être rappelé. Si vous êtes en danger, appelez le 118.',
        )}
        audioKey="app.ecoute"
      />
      {list.error && <ErrorNote error={list.error} />}
      {detail?.error && <ErrorNote error={detail.error} />}
      <I18nScope area="ecoute">
        <ListenChat key={current?.id ?? 'nouvelle'} initial={current} past={past} />
      </I18nScope>
    </>
  );
}
