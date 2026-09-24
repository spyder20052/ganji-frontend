import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, MessageSquareReply } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';
import { serverApi, ServerApiError, tryServerApi } from '@/lib/server-api';
import { SPECIALTY_LABEL, waited } from '../../_lib/labels';
import { getMe } from '../../_lib/me';
import type { TeleDetail, TeleItem } from '../../_lib/types';
import { Pill } from '../../_lib/ui';
import { AnswerForm } from './AnswerForm';

export const metadata: Metadata = { title: 'Demande d’avis' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Type d'image deviné depuis l'en-tête base64 (JPEG, PNG, WebP). */
function dataUrl(b64: string) {
  const mime = b64.startsWith('/9j/') ? 'image/jpeg' : b64.startsWith('iVBOR') ? 'image/png' : b64.startsWith('UklGR') ? 'image/webp' : null;
  return mime ? `data:${mime};base64,${b64}` : null;
}

export default async function TeleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let t: TeleDetail;
  try {
    t = await serverApi<TeleDetail>(`/tele-expertise/${id}`);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 404) notFound();
    if (e instanceof ServerApiError && e.status === 403) {
      return (
        <div className="card mx-auto max-w-xl space-y-3 p-6">
          <h1 className="text-2xl font-bold">Demande non accessible</h1>
          <p className="text-[var(--fg-muted)]">Votre accès au carnet de ce patient a expiré. La tentative a été inscrite dans son journal d’accès.</p>
          <Link href="/pro/tele-expertise" className="btn btn-primary">
            Retour à la boîte
          </Link>
        </div>
      );
    }
    throw e;
  }
  const [me, inbox] = await Promise.all([getMe(), tryServerApi<TeleItem[]>('/tele-expertise')]);
  const row = inbox?.find((x) => x.id === id);
  const answered = t.status === 'REPONDUE';
  const canAnswer = !answered && me.practitioner?.specialty === t.specialty && t.requesterId !== me.id;
  const hours = row?.hoursWaiting ?? Math.round((+new Date(t.answeredAt ?? Date.now()) - +new Date(t.createdAt)) / 3600_000);
  const photos = (t.attachments ?? []).map(dataUrl).filter((u): u is string => !!u);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/pro/tele-expertise" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        ← Télé-expertise
      </Link>

      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="label">Avis en {SPECIALTY_LABEL[t.specialty]?.toLowerCase() ?? t.specialty}</p>
          <h1 className="text-2xl font-bold">
            {row?.patient ?? 'Patient'} · demande de {t.requesterName}
            {t.requesterSite ? ` (${t.requesterSite})` : ''}
          </h1>
          <p className="text-[var(--fg-muted)]">Envoyée le {fmtDateTime(t.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {t.urgency === 'URGENTE' && <Pill tone="ocre">Urgent</Pill>}
          {answered ? (
            <Pill tone="brand">Répondu en {waited(hours)}</Pill>
          ) : (
            <Pill tone="muted">
              <Clock size={14} aria-hidden /> En attente depuis {waited(hours)}
            </Pill>
          )}
        </div>
      </header>

      <section aria-labelledby="h-q" className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="h-q" className="flex-1 text-xl font-bold">
            Question
          </h2>
          <Link href={`/pro/patients/${t.patientId}`} className="btn btn-soft !min-h-11 text-base">
            Ouvrir le carnet du patient <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
        <p className="whitespace-pre-line text-lg">{t.question}</p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((src, i) => (
              <li key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element -- photo embarquée (base64), pas d'optimisation possible */}
                <img src={src} alt={`Photo ${i + 1} jointe à la demande`} className="w-full rounded-2xl border border-[var(--border)] object-contain" loading="lazy" />
              </li>
            ))}
          </ul>
        )}
        {t.attachments.length > photos.length && <p className="text-sm text-[var(--fg-muted)]">{t.attachments.length - photos.length} pièce(s) jointe(s) dans un format non affichable.</p>}
      </section>

      {answered ? (
        <section aria-labelledby="h-a" className="card space-y-3 border-[var(--color-brand-500)]/40 bg-[var(--color-brand-50)] p-5 dark:bg-[var(--card)]">
          <h2 id="h-a" className="flex items-center gap-2 text-xl font-bold text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
            <MessageSquareReply size={22} aria-hidden /> Avis de {t.answeredByName ?? 'spécialiste'}
          </h2>
          <p className="whitespace-pre-line text-lg">{t.answer}</p>
          <p className="text-sm text-[var(--fg-muted)]">
            {t.answeredAt ? `Rendu le ${fmtDateTime(t.answeredAt)} · ` : ''}inscrit dans la chronologie du carnet du patient.
          </p>
        </section>
      ) : canAnswer ? (
        <section aria-labelledby="h-form" className="card p-5">
          <h2 id="h-form" className="text-xl font-bold">
            Votre avis
          </h2>
          <p className="mb-3 text-sm text-[var(--fg-muted)]">Il sera envoyé à {t.requesterName} et inscrit dans le carnet du patient.</p>
          <AnswerForm id={t.id} />
        </section>
      ) : (
        <p className="card p-5 text-[var(--fg-muted)]">
          {t.requesterId === me.id
            ? `En attente de l’avis d’un spécialiste en ${SPECIALTY_LABEL[t.specialty]?.toLowerCase() ?? t.specialty}. Vous serez prévenu dès la réponse.`
            : 'Seul un spécialiste de la discipline peut répondre à cette demande.'}
        </p>
      )}
    </div>
  );
}
