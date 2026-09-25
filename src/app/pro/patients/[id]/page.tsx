import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle, Bed, Droplet, EyeOff, FileText, Lock, MessagesSquare, Phone, Pill, QrCode, ShieldAlert, ShieldCheck, Siren, Stethoscope, Syringe, type LucideIcon,
} from 'lucide-react';
import { LineChart } from '@/components/LineChart';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, fmtDateTime, fmtPhone, fmtTime } from '@/lib/format';
import { serverApi, ServerApiError } from '@/lib/server-api';
import type { Series, Summary, TimelineItem } from '@/lib/types';
import { SPECIALTY_LABEL } from '../../_lib/labels';
import { getMe } from '../../_lib/me';
import { ActionBar } from './ActionBar';
import { BreakGlassForm } from './BreakGlassForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Dossier patient') };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KIND: Record<string, { icon: LucideIcon; label: string; danger?: boolean }> = {
  CONSULTATION: { icon: Stethoscope, label: 'Consultation' },
  HOSPITALISATION: { icon: Bed, label: 'Hospitalisation' },
  TRANSFUSION: { icon: Droplet, label: 'Transfusion', danger: true },
  CHIMIOTHERAPIE: { icon: Syringe, label: 'Chimiothérapie' },
  URGENCE: { icon: Siren, label: 'Urgence', danger: true },
  TELE_EXPERTISE: { icon: MessagesSquare, label: 'Avis de spécialiste' },
  ORDONNANCE: { icon: Pill, label: 'Ordonnance' },
};

/** PLT d'abord (parcours hématologie), puis les autres dans un ordre clinique stable. */
const SERIES_ORDER = ['PLT', 'HB', 'WBC', 'GLY', 'TA_SYS', 'TA_DIA', 'WEIGHT', 'HEIGHT'];

/** Lecture d'une partie du dossier : `null` si ce volet n'est pas couvert par l'accès. */
async function part<T>(path: string): Promise<T | null> {
  try {
    return await serverApi<T>(path);
  } catch (e) {
    if (e instanceof ServerApiError) return null;
    throw e;
  }
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [t, locale] = await Promise.all([getT(), getLocale()]);

  let summary: Summary;
  try {
    summary = await serverApi<Summary>(`/patients/${id}/summary`);
  } catch (e) {
    if (e instanceof ServerApiError && e.status === 403) return <Refusal patientId={id} t={t} />;
    if (e instanceof ServerApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }

  const [me, timeline, series] = await Promise.all([getMe(), part<TimelineItem[]>(`/patients/${id}/timeline`), part<Series[]>(`/patients/${id}/observations`)]);
  const sortedSeries = [...(series ?? [])].sort((a, b) => rank(a.code) - rank(b.code));

  return (
    <div className="space-y-5">
      <Link href="/pro" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        {t('← Mes patients')}
      </Link>

      <header className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">
            {summary.firstName} {summary.lastName}
          </h1>
          <p className="text-[var(--fg-muted)]">
            {t('{age} ans', { age: summary.age })} · {summary.sex === 'F' ? t('femme') : t('homme')} ·{' '}
            {summary.sex === 'F' ? t('née le {date}', { date: fmtDate(summary.birthDate, undefined, locale) }) : t('né le {date}', { date: fmtDate(summary.birthDate, undefined, locale) })}
            {summary.commune ? ` · ${summary.commune}` : ''}
          </p>
        </div>
      </header>
      <AccessBanner access={summary.access} t={t} locale={locale} />

      <VitalCard s={summary} t={t} locale={locale} />

      <ActionBar patientId={summary.id} firstName={summary.firstName} bloodGroup={summary.bloodGroup} canPrescribe={me.role === 'PRACTITIONER'} />

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="h-timeline" className="card p-5">
          <h2 id="h-timeline" className="text-xl font-bold">
            {t('Chronologie de soins')}
          </h2>
          {timeline === null ? (
            <NotShared text={t('Le patient n’a pas partagé la chronologie avec vous.')} />
          ) : timeline.length === 0 ? (
            <p className="mt-3 text-[var(--fg-muted)]">{t('Aucun évènement enregistré.')}</p>
          ) : (
            <ol className="relative mt-4 space-y-4 border-l-2 border-[var(--border)] pl-5">
              {timeline.map((item) => {
                const k: { icon: LucideIcon; label: string; danger?: boolean } = KIND[item.kind] ?? { icon: FileText, label: item.kind };
                return (
                  <li key={`${item.kind}-${item.id}`} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-[2.3rem] top-0 grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--card)] ${k.danger ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}
                    >
                      <k.icon size={16} />
                    </span>
                    <p className="text-sm text-[var(--fg-muted)]">
                      <time dateTime={item.date}>{fmtDate(item.date, { day: 'numeric', month: 'short', year: 'numeric' }, locale)}</time>
                      {item.place ? ` · ${item.place}` : ''}
                    </p>
                    <p className="font-bold">{t(item.title)}</p>
                    {item.detail && <p className="mt-0.5 whitespace-pre-line text-[0.95rem]">{item.detail}</p>}
                    {item.author && <p className="text-sm text-[var(--fg-muted)]">{item.author}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-labelledby="h-obs" className="card p-5">
          <h2 id="h-obs" className="text-xl font-bold">
            {t('Analyses')}
          </h2>
          {series === null ? (
            <NotShared text={t('Le patient n’a pas partagé les résultats d’analyses avec vous.')} />
          ) : sortedSeries.length === 0 ? (
            <p className="mt-3 text-[var(--fg-muted)]">{t('Aucun résultat enregistré.')}</p>
          ) : (
            <div className="mt-4 space-y-6">
              {sortedSeries.map((s) => (
                <div key={s.code}>
                  <h3 className="flex items-baseline justify-between gap-2 font-bold">
                    {t(s.label)}{' '}
                    <span className="text-sm font-normal text-[var(--fg-muted)]">
                      {s.unit} · {s.points.length > 1 ? t('{n} mesures', { n: s.points.length }) : t('{n} mesure', { n: s.points.length })}
                    </span>
                  </h3>
                  <LineChart series={{ ...s, label: t(s.label) }} height={160} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function rank(code: string) {
  const i = SERIES_ORDER.indexOf(code);
  return i === -1 ? SERIES_ORDER.length : i;
}

/** « jusqu’à 17:30 » le jour même, « jusqu’à demain 06:19 » le lendemain, sinon la date complète. */
function until(d: string, t: T, locale: Locale) {
  const day = (x: Date) => fmtDate(x, { day: 'numeric', month: 'numeric', year: 'numeric' });
  const end = new Date(d);
  if (day(end) === day(new Date())) return t('jusqu’à {time}', { time: fmtTime(d, locale) });
  if (day(end) === day(new Date(Date.now() + 86_400_000))) return t('jusqu’à demain {time}', { time: fmtTime(d, locale) });
  return t('jusqu’au {date}', { date: fmtDateTime(d, locale) });
}

function AccessBanner({ access, t, locale }: { access: Summary['access']; t: T; locale: Locale }) {
  if (access.via === 'BREAK_GLASS') {
    return (
      <p role="note" className="flex items-start gap-3 rounded-2xl border border-[var(--color-ocre-500)]/50 bg-[var(--color-ocre-100)] p-3 text-[var(--color-ocre-700)]">
        <ShieldAlert size={22} aria-hidden className="mt-0.5 shrink-0" />
        <span>
          <strong>
            {access.expiresAt ? t('Accès d’urgence (bris de glace) {until}.', { until: until(access.expiresAt, t, locale) }) : t('Accès d’urgence (bris de glace).')}
          </strong>{' '}
          {t('Motif enregistré ; le patient, ses proches et le contrôleur ont été prévenus. Chaque lecture est journalisée.')}
        </span>
      </p>
    );
  }
  const text =
    access.via === 'CARE_TEAM'
      ? t('Accès : équipe de soins déclarée du patient.')
      : access.via === 'CONSENT'
        ? access.expiresAt
          ? t('Accès : consentement du patient, {until}.', { until: until(access.expiresAt, t, locale) })
          : t('Accès : consentement du patient.')
        : t('Accès : {via}.', { via: access.via.toLowerCase() });
  return (
    <p role="note" className="flex items-start gap-3 rounded-2xl bg-[var(--color-brand-100)] p-3 text-[var(--color-brand-900)]">
      <ShieldCheck size={22} aria-hidden className="mt-0.5 shrink-0" />
      <span>
        <strong>{text}</strong> {t('Le patient voit cette consultation dans son journal d’accès.')}
      </span>
    </p>
  );
}

function VitalCard({ s, t, locale }: { s: Summary; t: T; locale: Locale }) {
  return (
    <section aria-labelledby="h-vital" className="card grid gap-5 p-5 md:grid-cols-[auto_1fr_1fr]">
      <h2 id="h-vital" className="sr-only">
        {t('Fiche vitale')}
      </h2>
      <div className="flex flex-row items-center gap-4 md:flex-col md:items-start">
        <div className="grid h-24 w-28 place-items-center rounded-3xl bg-[var(--color-danger-50)] text-[var(--color-danger-800)]">
          <span className="label !text-[var(--color-danger-800)]">{t('Groupe')}</span>
          <span className="num -mt-2 text-4xl font-bold">{s.bloodGroup ?? '?'}</span>
        </div>
        {s.emergencyContact && (
          <div className="text-sm">
            <p className="label">{t('Contact d’urgence')}</p>
            <p className="font-bold">{s.emergencyContact.name}</p>
            {s.emergencyContact.phone && (
              <a href={`tel:${s.emergencyContact.phone}`} className="inline-flex min-h-11 items-center gap-1 font-bold text-[var(--color-brand-700)] underline">
                <Phone size={16} aria-hidden /> {fmtPhone(s.emergencyContact.phone)}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <p className="label">{t('Allergies')}</p>
          {s.allergies.length ? (
            <ul className="mt-1 flex flex-wrap gap-2">
              {s.allergies.map((a) => (
                <li key={a} className="pill border border-[var(--color-ocre-500)]/50 bg-[var(--color-ocre-100)] !text-base text-[var(--color-ocre-700)]">
                  <AlertTriangle size={16} aria-hidden /> {a}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">{t('Aucune allergie connue')}</p>
          )}
        </div>
        <div>
          <p className="label">{t('Traitements en cours')}</p>
          <p className="mt-1 whitespace-pre-line">{s.treatments || t('Aucun traitement déclaré')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="label">{t('Maladies et antécédents')}</p>
          {s.conditions.length ? (
            <ul className="mt-1 space-y-1">
              {s.conditions.map((c) => (
                <li key={c.id}>
                  <span className="font-bold">{c.label ?? c.code}</span>
                  {c.since && <span className="text-sm text-[var(--fg-muted)]"> · {t('depuis {date}', { date: fmtDate(c.since, { month: 'short', year: 'numeric' }, locale) })}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1">{t('Aucun antécédent déclaré')}</p>
          )}
          {s.hiddenSensitive && (
            <p className="mt-2 flex items-center gap-2 text-sm text-[var(--fg-muted)]">
              <EyeOff size={16} aria-hidden /> {t('Des informations très sensibles sont masquées (compartiment séparé, non partagé).')}
            </p>
          )}
        </div>
        {s.careTeam.length > 0 && (
          <div>
            <p className="label">{t('Équipe de soins')}</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {s.careTeam.map((m) => (
                <li key={`${m.name}-${m.role}`}>
                  <span className="font-bold">{m.name}</span> · {SPECIALTY_LABEL[m.specialty] ? t(SPECIALTY_LABEL[m.specialty]) : m.specialty}
                  {m.facility ? ` · ${m.facility}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function NotShared({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-center gap-2 text-[var(--fg-muted)]">
      <Lock size={16} aria-hidden /> {text}
    </p>
  );
}

function Refusal({ patientId, t }: { patientId: string; t: T }) {
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/pro" className="text-base font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]">
        {t('← Mes patients')}
      </Link>
      <section role="alert" className="card flex items-start gap-4 border-2 !border-[var(--fg)] p-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--fg)] text-[var(--bg)]">
          <Lock size={28} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t('Accès refusé : le patient n’a pas donné son accord.')}</h1>
          <p className="mt-2 text-[var(--fg-muted)]">
            {t('Votre tentative a été inscrite dans son journal d’accès. Aucune donnée de santé ne s’ouvre sans consentement, relation de soin ou motif d’urgence tracé.')}
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="h-ask" className="card space-y-3 p-5">
          <span className="chip-round text-[var(--color-brand-900)]">
            <QrCode size={22} aria-hidden />
          </span>
          <h2 id="h-ask" className="text-lg font-bold">
            {t('Demander au patient de montrer son QR')}
          </h2>
          <p className="text-[var(--fg-muted)]">
            {t('Le patient ouvre « Partager mon carnet » dans son application, choisit ce qu’il partage et pour combien de temps. Il peut aussi vous dicter son code de partage à 6 chiffres.')}
          </p>
          <Link href="/pro" className="btn btn-primary w-full">
            {t('Scanner son QR')}
          </Link>
        </section>
        <section aria-labelledby="h-bg" className="card space-y-3 border-[var(--color-danger-600)]/30 p-5">
          <span className="chip-round text-[var(--color-danger-600)]">
            <Siren size={22} aria-hidden />
          </span>
          <h2 id="h-bg" className="text-lg font-bold">
            {t('Urgence vitale et patient hors d’état de consentir')}
          </h2>
          <p className="text-[var(--fg-muted)]">{t('Le bris de glace ouvre le dossier 12 h. Il est justifié, tracé et contrôlé.')}</p>
          <BreakGlassForm patientId={patientId} />
        </section>
      </div>
    </div>
  );
}
