import type { Metadata } from 'next';
import Link from 'next/link';
import { BellRing, Check, HeartPulse, House, MessageSquare, Smartphone, UserCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { T } from '@/i18n/translate';
import { fmtDateTime, fmtTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { DoneButton, EscalationSwitch } from './CircleActions';
import type { Channel, Circle, CircleEvent, CircleMember, ReminderState, TodayReminder } from './types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Cercle de soins') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cercle de soins : qui veille sur le patient et quand chacun est prévenu. Le dessin encode le délai :
 * plus un membre est loin du centre, plus il est prévenu tard (aidants à 2 h, relais à 6 h ; l'équipe
 * de soins, en pointillé, pour les signes d'alerte).
 */
export default async function CerclePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [t, locale, me, { p }] = await Promise.all([getT(), getLocale(), getMe(), searchParams]);
  const patientId = p && UUID.test(p) ? p : undefined;
  const res = await load<Circle>(`/me/circle${patientId ? `?patientId=${patientId}` : ''}`);
  const c = res.data;
  const owner = c?.viewer === 'OWNER';
  const name = c?.patient.firstName ?? '';

  return (
    <I18nScope area="ecoute">
      <PageHead
        icon="people"
        title={t('Cercle de soins')}
        intro={t('Vos aidants, le relais de votre quartier et votre équipe de soins, chacun avec son rôle.')}
        listen={t(
          'Votre cercle de soins : vos aidants, le relais communautaire et votre équipe de soins. Si un rappel reste sans réponse deux heures, vos aidants sont prévenus. Après six heures, le relais passe prendre des nouvelles. Touchez « C’est fait » quand c’est fait.',
        )}
        audioKey="app.cercle"
      />

      {me.role === 'CAREGIVER' && me.delegations.length > 1 && (
        <nav aria-label={t('Personne accompagnée')} className="flex flex-wrap gap-2">
          {me.delegations.map((d) => (
            <Link
              key={d.patient.id}
              href={`/app/cercle?p=${d.patient.id}`}
              aria-current={d.patient.id === c?.patient.id ? 'page' : undefined}
              className={`btn !min-h-12 ${d.patient.id === c?.patient.id ? 'btn-primary' : 'btn-ghost'}`}
            >
              {d.patient.firstName}
            </Link>
          ))}
        </nav>
      )}

      {res.error && <ErrorNote error={res.error} what={t('Cercle de soins')} />}

      {c && (
        <>
          <Section id="h-rappels" icon="calendar" title={owner ? t('Mes rappels du jour') : t('Rappels du jour de {name}', { name })}>
            {c.today.length === 0 ? (
              <Empty>{t('Aucun rappel aujourd’hui.')}</Empty>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {c.today.map((r) => (
                  <ReminderCard key={r.id} r={r} t={t} locale={locale} />
                ))}
              </ul>
            )}
          </Section>

          <Section id="h-cercle" icon="people" title={owner ? t('Qui veille sur vous') : t('Qui veille sur {name}', { name })}>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
              <Ring circle={c} center={owner ? t('Vous') : name} t={t} />
              <Members circle={c} t={t} />
            </div>
          </Section>

          <Section id="h-journal" icon="check" title={t('Ce qui s’est passé')}>
            {c.events.length === 0 ? <Empty>{t('Rien pour le moment : tout est à jour.')}</Empty> : <Timeline events={c.events} t={t} locale={locale} />}
          </Section>
        </>
      )}
    </I18nScope>
  );
}

// ─── Rappels du jour ─────────────────────────────────────────────────

const KIND_ICON: Record<string, string> = { MEDICATION: 'pill', APPOINTMENT: 'calendar', LAB: 'blood', CPN: 'pregnant', VACCINE: 'vaccine', DONATION: 'blood' };
const STATE: Record<ReminderState, { label: string; cls: string }> = {
  FAIT: { label: 'Fait', cls: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' },
  SANS_REPONSE: { label: 'Sans réponse', cls: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' },
  A_FAIRE: { label: 'À faire', cls: 'bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]' },
  A_VENIR: { label: 'Plus tard', cls: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]' },
};

function ReminderCard({ r, t, locale }: { r: TodayReminder; t: T; locale: Awaited<ReturnType<typeof getLocale>> }) {
  const s = STATE[r.state];
  return (
    <li className={`space-y-3 rounded-3xl border p-4 ${r.state === 'SANS_REPONSE' ? 'border-[var(--color-ocre-500)]' : 'border-[var(--border)]'}`}>
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
          <Pictogram name={KIND_ICON[r.kind] ?? 'calendar'} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="num text-2xl font-semibold">{fmtTime(r.dueAt, locale)}</p>
          <p className="text-lg leading-snug">{t(r.title)}</p>
        </div>
        <span className={`pill shrink-0 ${s.cls}`}>
          {r.state === 'FAIT' && <Check size={15} aria-hidden />}
          {t(s.label)}
        </span>
      </div>
      {r.canConfirm && <DoneButton reminderId={r.id} title={t(r.title)} />}
    </li>
  );
}

// ─── Le cercle dessiné ───────────────────────────────────────────────

/** Rayon de chaque anneau (en % du côté) : aidants à 2 h, relais à 6 h, équipe de soins (signes d'alerte). */
const RING = { CAREGIVER: 25, RELAY: 36, CARE_TEAM: 45 } as const;
/** Angles (degrés, 0 = droite, sens horaire) : jamais à l'horizontale, pour que les prénoms tiennent sur 360 px. */
const ANGLES = { CAREGIVER: [-150, -30, 150, 30, -90, 90], RELAY: [60, -60, 120], CARE_TEAM: [120, -120, 60] } as const;
const NODE_STYLE: Record<CircleMember['type'], string> = {
  CAREGIVER: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  RELAY: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  CARE_TEAM: 'bg-[var(--card)] text-[var(--fg)] ring-2 ring-[var(--border)]',
};
const NODE_ICON: Record<CircleMember['type'], string> = { CAREGIVER: 'care', RELAY: 'home', CARE_TEAM: 'stethoscope' };

function shortLabel(m: CircleMember) {
  return m.type === 'CARE_TEAM' ? m.name : m.name.split(' ')[0];
}

function Ring({ circle, center, t }: { circle: Circle; center: string; t: T }) {
  const placed = (['CAREGIVER', 'RELAY', 'CARE_TEAM'] as const).flatMap((type) =>
    circle.members
      .filter((m) => m.type === type)
      .slice(0, ANGLES[type].length)
      .map((m, i) => {
        const a = (ANGLES[type][i] * Math.PI) / 180;
        return { m, x: 50 + RING[type] * Math.cos(a), y: 50 + RING[type] * Math.sin(a), above: Math.sin(a) < 0 };
      }),
  );
  const ringLabel = (r: number, content: ReactNode) => (
    <span
      className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--card)] px-2 py-0.5 text-xs font-bold text-[var(--fg-muted)] ring-1 ring-[var(--border)]"
      style={{ top: `${50 - r}%` }}
    >
      {content}
    </span>
  );
  return (
    <figure className="mx-auto w-full max-w-[22rem] py-6" aria-label={t('Le cercle de soins de {name}', { name: circle.patient.firstName })}>
      <div className="relative aspect-square w-full" aria-hidden>
        {(['CAREGIVER', 'RELAY', 'CARE_TEAM'] as const).map((type) => (
          <span
            key={type}
            className={`absolute rounded-full border-2 ${type === 'CARE_TEAM' ? 'border-dashed' : ''} border-[var(--border)]`}
            style={{ inset: `${50 - RING[type]}%` }}
          />
        ))}
        {ringLabel(RING.CAREGIVER, t('{h} h', { h: circle.rules.caregiversAfterHours }))}
        {ringLabel(RING.RELAY, t('{h} h', { h: circle.rules.relayAfterHours }))}
        {ringLabel(RING.CARE_TEAM, <HeartPulse size={12} className="inline align-[-1px]" />)}
        <span className="absolute top-1/2 left-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-brand-900)] px-1 text-center text-lg leading-tight font-semibold text-white shadow-[var(--shadow-soft)] dark:ring-2 dark:ring-[var(--color-leaf)]">
          {center}
        </span>
        {placed.map(({ m, x, y, above }) => (
          <span key={`${m.type}-${m.id}`} className="absolute -mt-6 -ml-6 h-12 w-12" style={{ left: `${x}%`, top: `${y}%` }}>
            <span
              className={`grid h-12 w-12 place-items-center rounded-full ${NODE_STYLE[m.type]} ${m.type === 'CAREGIVER' && !m.escalations ? 'opacity-50' : ''}`}
            >
              <Pictogram name={NODE_ICON[m.type]} size={22} />
            </span>
            <span className={`absolute left-1/2 max-w-[7rem] -translate-x-1/2 truncate text-sm font-semibold whitespace-nowrap ${above ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
              {shortLabel(m)}
            </span>
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {t('Au centre : {name}. Aidants prévenus après {a} h sans réponse, relais après {b} h, équipe de soins pour les signes d’alerte.', {
          name: circle.patient.firstName,
          a: circle.rules.caregiversAfterHours,
          b: circle.rules.relayAfterHours,
        })}
      </figcaption>
    </figure>
  );
}

function Channels({ channels, t }: { channels: Channel[]; t: T }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {channels.includes('APP') && (
        <span className="pill bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]">
          <Smartphone size={14} aria-hidden /> {t('Appli')}
        </span>
      )}
      {channels.includes('SMS') && (
        <span className="pill bg-[var(--bg)] text-[var(--fg)] ring-1 ring-[var(--border)]">
          <MessageSquare size={14} aria-hidden /> SMS
        </span>
      )}
    </span>
  );
}

function Members({ circle, t }: { circle: Circle; t: T }) {
  const groups = [
    { type: 'CAREGIVER' as const, title: t('Aidants'), when: t('Prévenus après {h} h sans réponse', { h: circle.rules.caregiversAfterHours }) },
    { type: 'RELAY' as const, title: t('Relais communautaire'), when: t('Visite après {h} h sans réponse', { h: circle.rules.relayAfterHours }) },
    { type: 'CARE_TEAM' as const, title: t('Équipe de soins'), when: t('Prévenue en cas de signe d’alerte') },
  ];
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const members = circle.members.filter((m) => m.type === g.type);
        return (
          <div key={g.type} className="space-y-2">
            <h3 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold">
              <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${NODE_STYLE[g.type]}`} />
              {g.title}
              <span className="text-base font-normal text-[var(--fg-muted)]">· {g.when}</span>
            </h3>
            {members.length === 0 ? (
              <Empty>{g.type === 'CAREGIVER' ? t('Aucun aidant pour l’instant.') : t('Personne pour l’instant.')}</Empty>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] p-3">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${NODE_STYLE[m.type]}`}>
                      <Pictogram name={NODE_ICON[m.type]} size={20} />
                    </span>
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="block font-semibold">{m.name}</span>
                      <span className="block text-base text-[var(--fg-muted)]">
                        {m.type === 'CAREGIVER'
                          ? `${t(m.relation)}${m.fullAccess ? ` · ${t('Tous les droits')}` : m.escalations ? '' : ` · ${t('Pas prévenu·e')}`}`
                          : m.type === 'RELAY'
                            ? m.local
                              ? t('Relais de votre commune')
                              : t('Relais de renfort : pas encore de relais dans cette commune')
                            : [m.role, m.facility].filter(Boolean).join(' · ')}
                      </span>
                      {(m.type !== 'CAREGIVER' || m.escalations) && <Channels channels={m.channels} t={t} />}
                    </span>
                    {m.type === 'CAREGIVER' && circle.canEdit && !m.fullAccess && <EscalationSwitch delegationId={m.id} name={m.name} on={m.escalations} />}
                  </li>
                ))}
              </ul>
            )}
            {/* Le cercle est l'entrée : ajouter, retirer ou régler un aidant se fait dans « Aidants ». */}
            {g.type === 'CAREGIVER' && circle.canEdit && (
              <Link href="/app/aidants" className="btn btn-soft !min-h-12 w-full sm:w-auto">
                <Pictogram name="care" size={20} /> {t('Gérer mes aidants')}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Ce qui s'est passé ──────────────────────────────────────────────

function Timeline({ events, t, locale }: { events: CircleEvent[]; t: T; locale: Awaited<ReturnType<typeof getLocale>> }) {
  const view = (e: CircleEvent): { Icon: typeof Check; tone: string; title: string; detail?: ReactNode } => {
    const title = e.title ? t(e.title) : '';
    switch (e.type) {
      case 'CONFIRMED':
        return { Icon: Check, tone: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', title: t('{title} : c’est fait', { title }) };
      case 'MISSED':
        return {
          Icon: BellRing,
          tone: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
          title: t('{title} : sans réponse', { title }),
          detail: e.people?.length ? (
            <span className="flex flex-wrap gap-1.5">
              {e.people.map((p) => (
                <span key={p.name} className="pill bg-[var(--card)] text-[var(--fg)] ring-1 ring-[var(--border)]">
                  <UserCheck size={14} aria-hidden /> {t('{name} prévenu·e', { name: p.name.split(' ')[0] })} · {p.channels.map((ch) => (ch === 'APP' ? t('Appli') : 'SMS')).join(' + ')}
                </span>
              ))}
            </span>
          ) : (
            t('Aucun aidant à prévenir')
          ),
        };
      case 'VISIT_PLANNED':
        return {
          Icon: House,
          tone: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
          title: t('Visite du relais demandée'),
          detail: t('{relay} · {date}', { relay: e.relayName ?? t('Relais'), date: e.dueAt ? fmtDateTime(e.dueAt, locale) : '' }),
        };
      case 'VISIT_DONE':
        return {
          Icon: House,
          tone: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
          title: t('{relay} est passé', { relay: e.relayName ?? t('Le relais') }),
          detail: e.note ? <q className="italic">{e.note}</q> : undefined,
        };
      default:
        return { Icon: X, tone: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]', title: t('Visite annulée : rappel confirmé') };
    }
  };
  const list = (items: CircleEvent[]) => (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-0.5 before:bg-[var(--border)]">
      {items.map((e) => {
        const v = view(e);
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full ${v.tone}`}>
              <v.Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1 pt-1">
              <p className="font-semibold leading-snug">{v.title}</p>
              {v.detail && <div className="text-base text-[var(--fg-muted)]">{v.detail}</div>}
              <p className="text-sm text-[var(--fg-muted)]">{fmtDateTime(e.at, locale)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
  // Les derniers d'abord ; le reste sur demande (l'écran reste court sur téléphone).
  const SHOWN = 6;
  return (
    <div className="space-y-4">
      {list(events.slice(0, SHOWN))}
      {events.length > SHOWN && (
        <details className="group">
          <summary className="btn btn-ghost !min-h-12 cursor-pointer list-none">{t('Voir tout ({n})', { n: events.length })}</summary>
          <div className="mt-4">{list(events.slice(SHOWN))}</div>
        </details>
      )}
    </div>
  );
}
