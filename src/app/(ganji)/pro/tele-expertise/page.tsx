import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Paperclip } from 'lucide-react';
import { PageHead } from '@/app/app/_components/ui';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import { SPECIALTY_LABEL, waited } from '../_lib/labels';
import { getMe } from '../_lib/me';
import type { TeleItem } from '../_lib/types';
import { Pill } from '../_lib/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Télé-expertise') };
}

export default async function TeleInbox() {
  const [me, rows, t, locale] = await Promise.all([getMe(), tryServerApi<TeleItem[]>('/tele-expertise'), getT(), getLocale()]);
  const all = rows ?? [];
  const pendingFirst = (a: TeleItem, b: TeleItem) =>
    Number(a.status === 'REPONDUE') - Number(b.status === 'REPONDUE') ||
    Number(b.urgency === 'URGENTE') - Number(a.urgency === 'URGENTE') ||
    +new Date(a.createdAt) - +new Date(b.createdAt);
  const toAnswer = all.filter((x) => !x.mine).sort(pendingFirst);
  const mine = all.filter((x) => x.mine).sort(pendingFirst);
  const specialty = me.practitioner?.specialty;

  return (
    <div className="space-y-6">
      <PageHead
        icon="talk"
        title={t('Télé-expertise')}
        listen={t('Avis asynchrones entre soignants, pensés pour le faible débit : une question écrite, jusqu’à 3 photos compressées, une réponse inscrite dans le carnet du patient.')}
      />
      {rows === null && <p className="text-[var(--fg-muted)]">{t('Boîte indisponible pour le moment. Réessayez dans un instant.')}</p>}

      <section aria-labelledby="h-answer" className="card p-5">
        <h2 id="h-answer" className="text-xl font-bold">
          {specialty
            ? t('À répondre ({specialty})', { specialty: SPECIALTY_LABEL[specialty] ? t(SPECIALTY_LABEL[specialty].toLowerCase()) : specialty })
            : t('À répondre (ma spécialité)')}
        </h2>
        <TeleList items={toAnswer} empty={t('Aucune demande pour votre spécialité.')} showRequester t={t} locale={locale} />
      </section>

      <section aria-labelledby="h-mine" className="card p-5">
        <h2 id="h-mine" className="text-xl font-bold">
          {t('Mes demandes')}
        </h2>
        <TeleList items={mine} empty={t('Vous n’avez demandé aucun avis. Depuis la fiche d’un patient : « Demander un avis ».')} t={t} locale={locale} />
      </section>
    </div>
  );
}

function TeleList({ items, empty, showRequester = false, t, locale }: { items: TeleItem[]; empty: string; showRequester?: boolean; t: T; locale: Locale }) {
  if (!items.length) return <p className="mt-3 text-[var(--fg-muted)]">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-[var(--border)]">
      {items.map((item) => {
        const answered = item.status === 'REPONDUE';
        return (
          <li key={item.id}>
            <Link href={`/pro/tele-expertise/${item.id}`} className="flex min-h-16 flex-wrap items-start gap-x-3 gap-y-1 rounded-xl px-2 py-3 hover:bg-[var(--bg)]">
              <span className="min-w-0 flex-1 basis-72">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{item.patient}</span>
                  <span className="text-sm text-[var(--fg-muted)]">
                    {SPECIALTY_LABEL[item.specialty] ? t(SPECIALTY_LABEL[item.specialty]) : item.specialty}
                    {showRequester ? ` · ${item.requester}${item.site ? `, ${item.site}` : ''}` : ''} · {fmtDate(item.createdAt, { day: 'numeric', month: 'short' }, locale)}
                  </span>
                  {item.attachments > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-sm text-[var(--fg-muted)]">
                      <Paperclip size={14} aria-hidden /> {item.attachments}
                      <span className="sr-only">{t(' photo(s)')}</span>
                    </span>
                  )}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[0.95rem]">{item.question}</span>
                {answered && item.answeredBy && <span className="block text-sm text-[var(--color-brand-700)]">{t('Répondu par {name}', { name: item.answeredBy })}</span>}
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2">
                {item.urgency === 'URGENTE' && !answered && <Pill tone="ocre">{t('Urgent')}</Pill>}
                {answered ? (
                  <Pill tone="brand">{t('Répondu en {time}', { time: waited(item.hoursWaiting, t) })}</Pill>
                ) : (
                  <Pill tone="muted">{t('En attente depuis {time}', { time: waited(item.hoursWaiting, t) })}</Pill>
                )}
                <ArrowRight size={18} aria-hidden className="text-[var(--fg-muted)]" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
