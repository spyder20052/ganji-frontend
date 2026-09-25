import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, MessageSquareReply } from 'lucide-react';
import { getLocale, getT } from '@/i18n/server';
import { fmtDateTime } from '@/lib/format';
import { serverApi, ServerApiError, tryServerApi } from '@/lib/server-api';
import { SPECIALTY_LABEL, waited } from '../../_lib/labels';
import { getMe } from '../../_lib/me';
import type { TeleDetail, TeleItem } from '../../_lib/types';
import { Pill } from '../../_lib/ui';
import { AnswerForm } from './AnswerForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Demande d’avis') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Type d'image deviné depuis l'en-tête base64 (JPEG, PNG, WebP). */
function dataUrl(b64: string) {
  const mime = b64.startsWith('/9j/') ? 'image/jpeg' : b64.startsWith('iVBOR') ? 'image/png' : b64.startsWith('UklGR') ? 'image/webp' : null;
  return mime ? `data:${mime};base64,${b64}` : null;
}

export default async function TeleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [t, locale] = await Promise.all([getT(), getLocale()]);

  let req: TeleDetail;
  try {
    req = await serverApi<TeleDetail>(`/tele-expertise/${id}`);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) notFound();
    if (e instanceof ServerApiError && e.status === 403) {
      return (
        <div className="card max-w-xl space-y-3 p-6">
          <h1 className="text-2xl font-bold">{t('Demande non accessible')}</h1>
          <p className="text-[var(--fg-muted)]">{t('Votre accès au carnet de ce patient a expiré. La tentative a été inscrite dans son journal d’accès.')}</p>
          <Link href="/pro/tele-expertise" className="btn btn-primary">
            {t('Retour à la boîte')}
          </Link>
        </div>
      );
    }
    throw e;
  }
  const [me, inbox] = await Promise.all([getMe(), tryServerApi<TeleItem[]>('/tele-expertise')]);
  const row = inbox?.find((x) => x.id === id);
  const answered = req.status === 'REPONDUE';
  const canAnswer = !answered && me.practitioner?.specialty === req.specialty && req.requesterId !== me.id;
  const hours = row?.hoursWaiting ?? Math.round((+new Date(req.answeredAt ?? Date.now()) - +new Date(req.createdAt)) / 3600_000);
  const photos = (req.attachments ?? []).map(dataUrl).filter((u): u is string => !!u);

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/pro/tele-expertise" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        {t('← Télé-expertise')}
      </Link>

      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="label">{t('Avis en {specialty}', { specialty: SPECIALTY_LABEL[req.specialty] ? t(SPECIALTY_LABEL[req.specialty].toLowerCase()) : req.specialty })}</p>
          <h1 className="text-2xl font-bold">
            {t('{patient} · demande de {name}', { patient: row?.patient ?? t('Patient'), name: req.requesterName })}
            {req.requesterSite ? ` (${req.requesterSite})` : ''}
          </h1>
          <p className="text-[var(--fg-muted)]">{t('Envoyée le {date}', { date: fmtDateTime(req.createdAt, locale) })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {req.urgency === 'URGENTE' && <Pill tone="ocre">{t('Urgent')}</Pill>}
          {answered ? (
            <Pill tone="brand">{t('Répondu en {time}', { time: waited(hours, t) })}</Pill>
          ) : (
            <Pill tone="muted">
              <Clock size={14} aria-hidden /> {t('En attente depuis {time}', { time: waited(hours, t) })}
            </Pill>
          )}
        </div>
      </header>

      <section aria-labelledby="h-q" className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="h-q" className="flex-1 text-xl font-bold">
            {t('Question')}
          </h2>
          <Link href={`/pro/patients/${req.patientId}`} className="btn btn-soft !min-h-11 text-base">
            {t('Ouvrir le carnet du patient')} <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <p className="whitespace-pre-line text-lg">{req.question}</p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((src, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photo embarquée (base64), pas d'optimisation possible */}
                <img src={src} alt={t('Photo {n} jointe à la demande', { n: i + 1 })} className="w-full rounded-2xl border border-[var(--border)] object-contain" loading="lazy" />
              </li>
            ))}
          </ul>
        )}
        {req.attachments.length > photos.length && (
          <p className="text-sm text-[var(--fg-muted)]">{t('{n} pièce(s) jointe(s) dans un format non affichable.', { n: req.attachments.length - photos.length })}</p>
        )}
      </section>

      {answered ? (
        <section aria-labelledby="h-a" className="card space-y-3 border-[var(--color-brand-500)]/40 bg-[var(--color-brand-50)] p-5 dark:bg-[var(--card)]">
          <h2 id="h-a" className="flex items-center gap-2 text-xl font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
            <MessageSquareReply size={22} aria-hidden /> {req.answeredByName ? t('Avis de {name}', { name: req.answeredByName }) : t('Avis de spécialiste')}
          </h2>
          <p className="whitespace-pre-line text-lg">{req.answer}</p>
          <p className="text-sm text-[var(--fg-muted)]">
            {req.answeredAt
              ? t('Rendu le {date} · inscrit dans la chronologie du carnet du patient.', { date: fmtDateTime(req.answeredAt, locale) })
              : t('inscrit dans la chronologie du carnet du patient.')}
          </p>
        </section>
      ) : canAnswer ? (
        <section aria-labelledby="h-form" className="card p-5">
          <h2 id="h-form" className="text-xl font-bold">
            {t('Votre avis')}
          </h2>
          <p className="mb-3 text-sm text-[var(--fg-muted)]">{t('Il sera envoyé à {name} et inscrit dans le carnet du patient.', { name: req.requesterName })}</p>
          <AnswerForm id={req.id} />
        </section>
      ) : (
        <p className="card p-5 text-[var(--fg-muted)]">
          {req.requesterId === me.id
            ? t('En attente de l’avis d’un spécialiste en {specialty}. Vous serez prévenu dès la réponse.', {
                specialty: SPECIALTY_LABEL[req.specialty] ? t(SPECIALTY_LABEL[req.specialty].toLowerCase()) : req.specialty,
              })
            : t('Seul un spécialiste de la discipline peut répondre à cette demande.')}
        </p>
      )}
    </div>
  );
}
