import type { Metadata } from 'next';
import { ShieldAlert, ShieldX } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { dayAndHour, logSentence, SCOPE_LABEL, type AccessLogEntry } from '../../_lib/labels';
import { getMe, load } from '../../_lib/load';
import { RevokeButton } from './RevokeButton';
import { ShareFlow } from './ShareFlow';
import type { ConsentView } from './types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Partager') };
}

const SOURCE: Record<string, string> = { QR: 'QR scanné', CODE: 'code à 6 chiffres', TEAM: 'équipe de soins', BREAK_GLASS: 'accès d’urgence', TELE_EXPERTISE: 'avis de spécialiste' };

export default async function PartagePage() {
  const [me, t, locale] = await Promise.all([getMe(), getT(), getLocale()]);
  if (!me.patientId) {
    return (
      <>
        <PageHead icon="qr" title={t('Partager')} />
        <Empty>{t('Le partage est réservé au titulaire du carnet. Les personnes que vous aidez partagent leur carnet depuis leur propre téléphone.')}</Empty>
      </>
    );
  }
  const [consRes, logRes, docRes, rxRes] = await Promise.all([
    load<ConsentView[]>('/me/consents'),
    load<AccessLogEntry[]>('/me/access-log'),
    load<{ id: string }[]>(`/patients/${me.patientId}/documents`),
    load<{ id: string }[]>('/prescriptions/mine'),
  ]);
  const preview = { documents: docRes.data?.length ?? 0, prescriptions: rxRes.data?.length ?? 0 };
  const active = (consRes.data ?? []).filter((c) => c.active);
  const past = (consRes.data ?? []).filter((c) => !c.active);
  const log = logRes.data ?? [];
  const alerts = log.filter((e) => e.action === 'DENIED' || e.action === 'BREAK_GLASS').length;

  return (
    <>
      <PageHead
        icon="qr"
        title={t('Partager')}
        intro={t('Vous choisissez qui voit quoi, et pour combien de temps. Personne ne lit votre carnet sans votre accord : chaque lecture est écrite dans votre journal.')}
        listen={t("Pour montrer votre carnet à un soignant, cochez ce qu'il peut voir, choisissez la durée, puis touchez le bouton vert. Il scanne le code. Vous pouvez retirer l'accès à tout moment.")}
        audioKey="app.partage"
      />

      <Section id="h-qr" title={t('Nouveau partage')} icon="qr">
        <I18nScope area="sangPartage">
          <ShareFlow preview={preview} />
        </I18nScope>
      </Section>

      <Section id="h-actifs" title={active.length ? t('Qui a accès en ce moment ({n})', { n: active.length }) : t('Qui a accès en ce moment')} icon="people">
        {consRes.error && <ErrorNote error={consRes.error} />}
        {consRes.data && active.length === 0 && <Empty>{t('Personne en dehors de votre équipe de soins.')}</Empty>}
        {active.length > 0 && (
          <ul className="space-y-3">
            {active.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${c.source === 'BREAK_GLASS' ? 'border-[var(--color-danger-600)]/40 bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'border-[var(--border)]'}`}>
                <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={c.source === 'BREAK_GLASS' ? 'emergency' : 'stethoscope'} size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{c.grantee ?? t('Soignant')}</p>
                  <p className="text-base">
                    {t('Jusqu’à {date} · {source}', { date: fmtDateTime(c.expiresAt, locale), source: SOURCE[c.source] ? t(SOURCE[c.source]) : c.source })}
                  </p>
                  <p className="text-sm opacity-80">{t('Voit : {list}', { list: c.scopes.map((s) => (SCOPE_LABEL[s] ? t(SCOPE_LABEL[s]) : s)).join(', ') })}</p>
                </div>
                <RevokeButton id={c.id} who={c.grantee ?? t('ce soignant')} />
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details className="simple-hide mt-4">
            <summary className="cursor-pointer py-2 font-bold">{t('Anciens partages ({n})', { n: past.length })}</summary>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {past.map((c) => (
                <li key={c.id} className="py-3 text-base">
                  <span className="font-bold">{c.grantee ?? t('Soignant')}</span> · {t('depuis le {date}', { date: fmtDate(c.since, { day: 'numeric', month: 'long' }, locale) })} ·{' '}
                  {c.revokedAt
                    ? t('retiré le {date}', { date: fmtDate(c.revokedAt, { day: 'numeric', month: 'long' }, locale) })
                    : t('terminé le {date}', { date: fmtDate(c.expiresAt, { day: 'numeric', month: 'long' }, locale) })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section id="h-journal" title={t('Journal d’accès')} icon="eye">
        <p className="mb-4 flex flex-wrap items-center gap-2 text-base text-[var(--fg-muted)]">
          {t('Personne ne peut l’effacer.')}
          {alerts > 0 && (
            <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
              {t('{n} à regarder', { n: alerts })}
            </span>
          )}
        </p>
        {logRes.error && <ErrorNote error={logRes.error} />}
        {logRes.data && log.length === 0 && <Empty>{t('Aucun accès pour le moment.')}</Empty>}
        {log.length > 0 && (
          <>
            <LogList entries={log.slice(0, RECENT)} me={me.displayName} t={t} locale={locale} />
            {log.length > RECENT && (
              <details className="group mt-3">
                <summary className="btn btn-soft w-full cursor-pointer list-none">
                  <span className="group-open:hidden">{t('Voir tout le journal ({n})', { n: log.length })}</span>
                  <span className="hidden group-open:inline">{t('Masquer')}</span>
                </summary>
                <div className="mt-3">
                  <LogList entries={log.slice(RECENT)} me={me.displayName} t={t} locale={locale} />
                </div>
              </details>
            )}
          </>
        )}
      </Section>
    </>
  );
}

const RECENT = 5;

function LogList({ entries, me, t, locale }: { entries: AccessLogEntry[]; me: string; t: T; locale: Locale }) {
  return (
    <ol className="space-y-2">
      {entries.map((e) => {
        const { text, tone } = documentRead(e, t, locale) ?? logSentence(e, me, t, locale);
        const style =
          tone === 'breakglass'
            ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]'
            : tone === 'denied'
              ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'
              : tone === 'self'
                ? 'text-[var(--fg-muted)]'
                : 'bg-[var(--bg)]';
        const Icon = tone === 'breakglass' ? ShieldAlert : tone === 'denied' ? ShieldX : null;
        return (
          <li key={e.id} className={`flex gap-3 rounded-3xl px-4 py-3 text-base ${style}`}>
            {Icon && <Icon size={20} aria-hidden className="mt-0.5 shrink-0" />}
            <p>{text}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Ouverture d'un document précis par un soignant : « Dr X a ouvert votre document « Bilan » le … ». */
function documentRead(e: AccessLogEntry, t: T, locale: Locale): { text: string; tone: 'normal' | 'breakglass' | 'denied' } | null {
  const m = /^Document « (.+) »$/.exec(e.resource);
  if (!m) return null;
  const vars = { who: e.who, title: m[1], when: dayAndHour(e.at, t, locale) };
  if (e.action === 'READ') return { text: t('{who} a ouvert votre document « {title} » le {when}.', vars), tone: 'normal' };
  if (e.action === 'READ_BREAK_GLASS') return { text: t('{who} a ouvert votre document « {title} » le {when}, en accès d’urgence.', vars), tone: 'breakglass' };
  if (e.action === 'DENIED') return { text: t('Tentative refusée : {who} a voulu ouvrir votre document « {title} » sans votre accord, le {when}.', vars), tone: 'denied' };
  return null;
}
