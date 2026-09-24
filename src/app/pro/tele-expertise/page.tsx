import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Paperclip } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import { SPECIALTY_LABEL, waited } from '../_lib/labels';
import { getMe } from '../_lib/me';
import type { TeleItem } from '../_lib/types';
import { Pill } from '../_lib/ui';

export const metadata: Metadata = { title: 'Télé-expertise' };

export default async function TeleInbox() {
  const [me, rows] = await Promise.all([getMe(), tryServerApi<TeleItem[]>('/tele-expertise')]);
  const all = rows ?? [];
  const pendingFirst = (a: TeleItem, b: TeleItem) =>
    Number(a.status === 'REPONDUE') - Number(b.status === 'REPONDUE') ||
    Number(b.urgency === 'URGENTE') - Number(a.urgency === 'URGENTE') ||
    +new Date(a.createdAt) - +new Date(b.createdAt);
  const toAnswer = all.filter((t) => !t.mine).sort(pendingFirst);
  const mine = all.filter((t) => t.mine).sort(pendingFirst);
  const specialty = me.practitioner?.specialty;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Télé-expertise</h1>
        <p className="mt-1 max-w-3xl text-[var(--fg-muted)]">
          Avis asynchrones entre soignants, pensés pour le faible débit : une question écrite, jusqu’à 3 photos compressées, une réponse inscrite dans le carnet du patient.
        </p>
      </div>
      {rows === null && <p className="text-[var(--fg-muted)]">Boîte indisponible pour le moment. Réessayez dans un instant.</p>}

      <section aria-labelledby="h-answer" className="card p-5">
        <h2 id="h-answer" className="text-xl font-bold">
          À répondre {specialty ? `(${SPECIALTY_LABEL[specialty]?.toLowerCase() ?? specialty})` : '(ma spécialité)'}
        </h2>
        <TeleList items={toAnswer} empty="Aucune demande pour votre spécialité." showRequester />
      </section>

      <section aria-labelledby="h-mine" className="card p-5">
        <h2 id="h-mine" className="text-xl font-bold">
          Mes demandes
        </h2>
        <TeleList items={mine} empty="Vous n’avez demandé aucun avis. Depuis la fiche d’un patient : « Demander un avis »." />
      </section>
    </div>
  );
}

function TeleList({ items, empty, showRequester = false }: { items: TeleItem[]; empty: string; showRequester?: boolean }) {
  if (!items.length) return <p className="mt-3 text-[var(--fg-muted)]">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-[var(--border)]">
      {items.map((t) => {
        const answered = t.status === 'REPONDUE';
        return (
          <li key={t.id}>
            <Link href={`/pro/tele-expertise/${t.id}`} className="flex min-h-16 flex-wrap items-start gap-x-3 gap-y-1 rounded-xl px-2 py-3 hover:bg-[var(--bg)]">
              <span className="min-w-0 flex-1 basis-72">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{t.patient}</span>
                  <span className="text-sm text-[var(--fg-muted)]">
                    {SPECIALTY_LABEL[t.specialty] ?? t.specialty}
                    {showRequester ? ` · ${t.requester}${t.site ? `, ${t.site}` : ''}` : ''} · {fmtDate(t.createdAt, { day: 'numeric', month: 'short' })}
                  </span>
                  {t.attachments > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-sm text-[var(--fg-muted)]">
                      <Paperclip size={14} aria-hidden /> {t.attachments}
                      <span className="sr-only"> photo(s)</span>
                    </span>
                  )}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[0.95rem]">{t.question}</span>
                {answered && t.answeredBy && <span className="block text-sm text-[var(--color-brand-700)]">Répondu par {t.answeredBy}</span>}
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2">
                {t.urgency === 'URGENTE' && !answered && <Pill tone="ocre">Urgent</Pill>}
                {answered ? <Pill tone="brand">Répondu en {waited(t.hoursWaiting)}</Pill> : <Pill tone="muted">En attente depuis {waited(t.hoursWaiting)}</Pill>}
                <ArrowRight size={18} aria-hidden className="text-[var(--fg-muted)]" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
