import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { tryServerApi } from '@/lib/server-api';
import type { CounselorThread, ListenQueue } from '../../app/(espace)/ecoute/types';
import { requireRole } from '../_lib/me';
import { CounselorDesk } from './CounselorDesk';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('File d’écoute') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cellule d'écoute : réservée aux psychologues vérifiés (contrôle réel côté API). */
export default async function ProEcoutePage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const [me, t, { c }] = await Promise.all([requireRole(['PRACTITIONER', 'NURSE']), getT(), searchParams]);
  const counselor = me.role === 'PRACTITIONER' && me.practitioner?.specialty === 'PSYCHOLOGIE';
  if (!counselor) {
    return (
      <div className="card flex gap-3 p-5">
        <ShieldAlert size={22} aria-hidden className="mt-0.5 shrink-0 text-[var(--color-ocre-700)]" />
        <div>
          <h1 className="text-xl font-bold">{t('File d’écoute')}</h1>
          <p className="text-[var(--fg-muted)]">{t('Réservée à la cellule d’écoute (psychologues vérifiés).')}</p>
        </div>
      </div>
    );
  }
  const [queue, thread] = await Promise.all([
    tryServerApi<ListenQueue>('/listen/queue'),
    c && UUID.test(c) ? tryServerApi<CounselorThread>(`/listen/${c}`) : Promise.resolve(null),
  ]);
  return (
    <I18nScope area="ecoute">
      {queue ? (
        <CounselorDesk initialQueue={queue} initialThread={thread} />
      ) : (
        <p className="card p-5 text-[var(--fg-muted)]">{t('File indisponible pour le moment. Réessayez dans un instant.')}</p>
      )}
    </I18nScope>
  );
}
