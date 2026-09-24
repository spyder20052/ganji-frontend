import type { Metadata } from 'next';
import { ShieldAlert, ShieldX } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { logSentence, SCOPE_LABEL, type AccessLogEntry } from '../../_lib/labels';
import { getMe, load } from '../../_lib/load';
import { RevokeButton } from './RevokeButton';
import { ShareFlow } from './ShareFlow';
import type { ConsentView } from './types';

export const metadata: Metadata = { title: 'Partager mon carnet' };

const SOURCE: Record<string, string> = { QR: 'QR scanné', CODE: 'code à 6 chiffres', TEAM: 'équipe de soins', BREAK_GLASS: 'accès d’urgence', TELE_EXPERTISE: 'avis de spécialiste' };

export default async function PartagePage() {
  const me = await getMe();
  if (!me.patientId) {
    return (
      <>
        <PageHead icon="qr" title="Partager mon carnet" />
        <Empty>Le partage est réservé au titulaire du carnet. Les personnes que vous aidez partagent leur carnet depuis leur propre téléphone.</Empty>
      </>
    );
  }
  const [consRes, logRes] = await Promise.all([load<ConsentView[]>('/me/consents'), load<AccessLogEntry[]>('/me/access-log')]);
  const active = (consRes.data ?? []).filter((c) => c.active);
  const past = (consRes.data ?? []).filter((c) => !c.active);
  const log = logRes.data ?? [];
  const alerts = log.filter((e) => e.action === 'DENIED' || e.action === 'BREAK_GLASS').length;

  return (
    <>
      <PageHead
        icon="qr"
        title="Partager mon carnet"
        intro="Vous choisissez qui voit quoi, et pour combien de temps. Personne ne lit votre carnet sans votre accord : chaque lecture est écrite dans votre journal."
        listen="Pour montrer votre carnet à un soignant, cochez ce qu'il peut voir, choisissez la durée, puis touchez le bouton vert. Il scanne le code. Vous pouvez retirer l'accès à tout moment."
        audioKey="app.partage"
      />

      <Section id="h-qr" title="Nouveau partage" icon="qr">
        <ShareFlow />
      </Section>

      <Section id="h-actifs" title={`Qui a accès en ce moment${active.length ? ` (${active.length})` : ''}`} icon="people">
        {consRes.error && <ErrorNote error={consRes.error} />}
        {consRes.data && active.length === 0 && <Empty>Personne en dehors de votre équipe de soins.</Empty>}
        {active.length > 0 && (
          <ul className="space-y-3">
            {active.map((c) => (
              <li key={c.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${c.source === 'BREAK_GLASS' ? 'border-[var(--color-danger-600)]/40 bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'border-[var(--border)]'}`}>
                <span className="chip-round shrink-0 text-[var(--color-brand-900)]"><Pictogram name={c.source === 'BREAK_GLASS' ? 'emergency' : 'stethoscope'} size={20} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{c.grantee ?? 'Soignant'}</p>
                  <p className="text-base">
                    Jusqu’à {fmtDateTime(c.expiresAt)} · {SOURCE[c.source] ?? c.source}
                  </p>
                  <p className="text-sm opacity-80">Voit : {c.scopes.map((s) => SCOPE_LABEL[s] ?? s).join(', ')}</p>
                </div>
                <RevokeButton id={c.id} who={c.grantee ?? 'ce soignant'} />
              </li>
            ))}
          </ul>
        )}
        {past.length > 0 && (
          <details className="simple-hide mt-4">
            <summary className="cursor-pointer py-2 font-bold">Anciens partages ({past.length})</summary>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {past.map((c) => (
                <li key={c.id} className="py-3 text-base">
                  <span className="font-bold">{c.grantee ?? 'Soignant'}</span> · depuis le {fmtDate(c.since, { day: 'numeric', month: 'long' })} ·{' '}
                  {c.revokedAt ? `retiré le ${fmtDate(c.revokedAt, { day: 'numeric', month: 'long' })}` : `terminé le ${fmtDate(c.expiresAt, { day: 'numeric', month: 'long' })}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section id="h-journal" title="Journal d’accès" icon="eye">
        <p className="mb-4 flex flex-wrap items-center gap-2 text-base text-[var(--fg-muted)]">
          Personne ne peut l’effacer.
          {alerts > 0 && (
            <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">
              {alerts} à regarder
            </span>
          )}
        </p>
        {logRes.error && <ErrorNote error={logRes.error} />}
        {logRes.data && log.length === 0 && <Empty>Aucun accès pour le moment.</Empty>}
        {log.length > 0 && (
          <>
            <LogList entries={log.slice(0, RECENT)} me={me.displayName} />
            {log.length > RECENT && (
              <details className="group mt-3">
                <summary className="btn btn-soft w-full cursor-pointer list-none">
                  <span className="group-open:hidden">Voir tout le journal ({log.length})</span>
                  <span className="hidden group-open:inline">Masquer</span>
                </summary>
                <div className="mt-3">
                  <LogList entries={log.slice(RECENT)} me={me.displayName} />
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

function LogList({ entries, me }: { entries: AccessLogEntry[]; me: string }) {
  return (
    <ol className="space-y-2">
      {entries.map((e) => {
        const { text, tone } = logSentence(e, me);
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
