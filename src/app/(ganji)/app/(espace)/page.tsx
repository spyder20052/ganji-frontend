import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, EyeOff } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { getLocale, getT } from '@/i18n/server';
import type { T } from '@/i18n/translate';
import { fmtDate } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { ErrorNote } from '../_components/ui';
import { cardFromSummary } from '../_lib/emergency-card';
import { hourOnly } from '../_lib/labels';
import { getMe, load } from '../_lib/load';
import { missingVitals, NextAppointmentCard, ProfileBanner } from './NextAppointmentCard';
import { nextAppointment, serviceOf, type MyAppointment } from './rendez-vous/shared';
import { SaveEmergencyCard } from './SaveEmergencyCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mon espace') };
}

interface HealthAlert {
  id: string;
  kind: string;
  severity: 'INFO' | 'ATTENTION' | 'URGENCE' | string;
  title: string;
  message: string;
  audioKey: string | null;
  source: string;
  createdAt: string;
  communes: string[];
  national: boolean;
}

interface Tile { href: string; icon: string; title: string; tone: 'paper' | 'leaf' | 'blood' | 'danger'; only?: 'standard' | 'simple' }

/**
 * Les 4 tuiles de l'accueil. En mode simple (personne âgée), le cahier fixe les 4 actions :
 * mon carnet, mes médicaments, appeler, urgence ; « Sang » cède sa place à « Appeler ».
 */
function tiles(contact: Summary['emergencyContact'] | undefined): Tile[] {
  return [
    { href: '/app/carnet', icon: 'carnet', title: 'Carnet', tone: 'paper' },
    { href: '/app/medicaments', icon: 'pill', title: 'Médicaments', tone: 'leaf' },
    { href: '/app/sang', icon: 'blood', title: 'Sang', tone: 'blood', only: 'standard' },
    { href: `tel:${contact?.phone ?? '118'}`, icon: 'phone', title: 'Appeler', tone: 'leaf', only: 'simple' },
    { href: '/app/sos', icon: 'emergency', title: 'Urgence', tone: 'danger' },
  ];
}

const TILE_TONE: Record<Tile['tone'], { card: string; chip: string }> = {
  paper: { card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  leaf: { card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  blood: { card: 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]', chip: 'bg-[var(--color-danger-600)] text-white' },
  danger: { card: 'bg-[var(--color-danger-600)] text-white', chip: 'bg-white text-[var(--color-danger-600)]' },
};

/** « Bonjour Koffi » ou « Bonsoir Koffi », selon l'heure du Bénin. */
function greeting(firstName: string, t: T) {
  const part = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Porto-Novo', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).find((x) => x.type === 'hour');
  const h = Number(part?.value ?? 12);
  return h >= 18 || h < 4 ? t('Bonsoir {prenom}', { prenom: firstName }) : t('Bonjour {prenom}', { prenom: firstName });
}

export default async function AppHome() {
  const [me, t, locale] = await Promise.all([getMe(), getT(), getLocale()]);
  const [summaryRes, helped] = await Promise.all([
    me.patientId ? load<Summary>('/me/summary') : Promise.resolve(null),
    Promise.all(me.delegations.map(async (d) => ({ d, res: await load<Summary>(`/patients/${d.patient.id}/summary`) }))),
  ]);
  const s = summaryRes?.data ?? null;
  const alertsRes = s?.commune ? await load<HealthAlert[]>(`/alerts?commune=${encodeURIComponent(s.commune)}`) : null;
  const alert = (alertsRes?.data ?? [])[0] ?? null;

  const firstName = s?.firstName ?? me.displayName.split(' ')[0];
  // Prochain rendez-vous : un vrai rendez-vous (confirmé, sinon demandé), jamais un rappel de médicament.
  const canBook = Boolean(me.patientId) || me.delegations.some((d) => d.scopes.includes('appointments') || d.scopes.includes('all'));
  const apptRes = canBook ? await load<MyAppointment[]>('/me/appointments') : null;
  // Carte du haut : ses propres rendez-vous (ceux des personnes aidées sont dans leur carte, plus bas).
  const next = nextAppointment((apptRes?.data ?? []).filter((a) => a.own || !me.patientId));
  const nextFor = (patientId: string) => nextAppointment((apptRes?.data ?? []).filter((a) => a.patient.id === patientId));
  const nextDate = next ? (next.status === 'CONFIRME' && next.scheduledAt ? next.scheduledAt : next.preferredAt) : null;
  const nextVars = next && nextDate
    ? { title: s?.discreetMode ? t('Rendez-vous de santé') : t(serviceOf(next.specialty).label), date: fmtDate(nextDate, { weekday: 'long', day: 'numeric', month: 'long' }, locale), time: hourOnly(nextDate, locale), place: next.facility.name }
    : null;
  const missing = missingVitals(s);
  const showProfileBanner = Boolean(me.patientId) && ((me as { profileDone?: boolean }).profileDone === false || missing.length > 0);
  const listen = [
    `${greeting(firstName, t)}.`,
    next && nextVars
      ? next.status === 'CONFIRME'
        ? s?.discreetMode
          ? t('Prochain rendez-vous : {title}, le {date} à {time}.', nextVars)
          : t('Prochain rendez-vous : {title}, le {date} à {time}, à {place}.', nextVars)
        : t('Demande de rendez-vous en attente de réponse : {title}, à {place}.', nextVars)
      : t('Aucun rendez-vous prévu pour le moment.'),
    showProfileBanner ? t('Complétez votre profil : il remplit votre carte d’urgence.') : '',
    t('Touchez une grande case : carnet, médicaments, sang, ou urgence. Plus bas, tous vos services.'),
  ].join(' ');

  // Mes services : un pictogramme et un mot chacun ; grossesse et enfants seulement quand ils existent.
  // Le profil est dans l'en-tête (avatar) et les aidants dans le cercle : pas de doublon ici.
  const services = [
    ...(s?.pregnancy ? [{ href: '/app/grossesse', icon: 'pregnant', title: 'Grossesse' }] : []),
    ...(s && s.children.length > 0 ? [{ href: '/app/enfants', icon: 'baby', title: s.children.length > 1 ? 'Enfants' : 'Enfant' }] : []),
    ...(canBook ? [{ href: '/app/rendez-vous', icon: 'calendar', title: 'Rendez-vous' }] : []),
    { href: '/app/commandes', icon: 'delivery', title: 'Commandes' },
    { href: '/app/assistant', icon: 'chat', title: 'Assistant' },
    { href: '/app/symptomes', icon: 'fever', title: 'Symptôme' },
    { href: '/app/partage', icon: 'qr', title: 'Partager' },
    { href: '/app/cercle', icon: 'people', title: 'Cercle' },
    { href: '/app/droits', icon: 'shield', title: 'Droits' },
    { href: '/app/ecoute', icon: 'listen', title: 'Écoute' },
  ];

  return (
    <>
      {/* En-tête Forêt à la trame Ganji (maquette de la charte), puis la carte du rendez-vous qui le chevauche. */}
      <header className="motif-foret -mx-4 -mt-2 space-y-3 rounded-b-[2rem] px-4 pt-6 pb-20 text-white sm:mx-0 sm:mt-0 sm:rounded-[var(--radius-card)] sm:px-6">
        <p className="text-base text-white/80 first-letter:uppercase">{fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }, locale)}</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-[2.4rem] leading-[1.05] font-medium tracking-tight">
            {greeting(firstName, t)}
          </h1>
          <ListenButton text={listen} audioKey="app.home" compact />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s && <SaveEmergencyCard card={cardFromSummary(s)} />}
          {s?.discreetMode && (
            <span className="pill bg-white/15 text-white">
              <EyeOff size={16} aria-hidden /> {t('Mode discret')}
            </span>
          )}
        </div>
        {summaryRes?.error && <ErrorNote what={t('Votre carnet')} error={summaryRes.error} />}
      </header>

      {canBook && <NextAppointmentCard next={next} discreet={Boolean(s?.discreetMode)} t={t} locale={locale} />}
      {apptRes?.error && <ErrorNote what={t('Mes rendez-vous')} error={apptRes.error} />}
      {showProfileBanner && <ProfileBanner missing={missing} t={t} />}

      <nav aria-label={t('Actions principales')}>
        {/* Deux colonnes sur téléphone, une seule quand le texte est agrandi (largeur minimale en rem). */}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-3 lg:grid-cols-4">
          {tiles(s?.emergencyContact).map((tile) => {
            const tone = TILE_TONE[tile.tone];
            return (
              <li key={tile.href} className={tile.only === 'standard' ? 'simple-hide' : tile.only === 'simple' ? 'simple-only' : undefined}>
                <Link
                  href={tile.href}
                  className={`flex aspect-[1.35/1] h-full min-h-[7.5rem] flex-col justify-between rounded-[var(--radius-card)] p-4 transition-transform active:scale-[0.98] ${tone.card}`}
                >
                  <span className="flex items-start justify-between">
                    <span className={`grid h-12 w-12 place-items-center rounded-full ${tone.chip}`}>
                      <Pictogram name={tile.icon} size={26} />
                    </span>
                    <ArrowUpRight size={22} aria-hidden className="opacity-60" />
                  </span>
                  <span className="text-[1.35rem] leading-tight font-semibold simple-big">{t(tile.title)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {helped.map(({ d, res }) => {
        const p = res.data;
        // Un rendez-vous (confirmé ou demandé), sinon un rappel de soin : jamais une prise de médicament.
        const appt = nextFor(d.patient.id);
        const r = appt
          ? { dueAt: appt.status === 'CONFIRME' && appt.scheduledAt ? appt.scheduledAt : appt.preferredAt }
          : p?.nextReminders.find((x) => x.kind !== 'MEDICATION');
        return (
          <section key={d.patient.id} aria-label={t('{prenom}, que vous aidez', { prenom: d.patient.firstName })} className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-leaf)] text-lg font-semibold text-[var(--color-ink)]" aria-hidden>
                {d.patient.firstName.charAt(0)}
              </span>
              <p className="min-w-0 flex-1 text-xl font-semibold simple-big">
                {d.patient.firstName} <span className="font-normal text-[var(--fg-muted)]">· {d.relation}</span>
              </p>
            </div>
            {res.error && <ErrorNote error={res.error} />}
            {p && (
              <dl className="grid grid-cols-[auto_1fr] gap-3">
                <div className="rounded-3xl bg-[var(--color-danger-50)] px-4 py-3 text-[var(--color-danger-800)]">
                  <dt className="text-sm">{t('Groupe')}</dt>
                  <dd className="display text-[2.2rem]">{p.bloodGroup ?? '?'}</dd>
                </div>
                <div className="rounded-3xl bg-[var(--bg)] px-4 py-3">
                  <dt className="text-sm text-[var(--fg-muted)]">{t('Prochain rendez-vous')}</dt>
                  <dd className="font-semibold">{r ? `${fmtDate(r.dueAt, { weekday: 'short', day: 'numeric', month: 'short' }, locale)} · ${hourOnly(r.dueAt, locale)}` : t('Aucun')}</dd>
                </div>
              </dl>
            )}
            <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-primary w-full">
              {t('Carnet de {prenom}', { prenom: d.patient.firstName })}
            </Link>
          </section>
        );
      })}

      {alert && (
        <Link
          href={`/alertes${s?.commune ? `?commune=${encodeURIComponent(s.commune)}` : ''}`}
          className={`simple-hide flex items-center gap-3 rounded-[var(--radius-card)] p-4 ${alert.severity === 'URGENCE' ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--card)]">
            <Pictogram name="warning" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm">{s?.commune ? t('Alerte santé · {commune}', { commune: s.commune }) : t('Alerte santé')}</span>
            <span className="block font-semibold">{alert.title}</span>
          </span>
          <ChevronRight size={20} aria-hidden className="shrink-0" />
        </Link>
      )}
      {alertsRes?.error && <div className="simple-hide"><ErrorNote what={t('Alertes santé')} error={alertsRes.error} /></div>}

      <nav aria-labelledby="h-services" className="simple-hide card p-4">
        <h2 id="h-services" className="mb-3 text-xl font-semibold">{t('Mes services')}</h2>
        {/* Quatre par ligne sur téléphone, six sur ordinateur ; un seul mot sous chaque pictogramme. */}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,4.75rem),1fr))] gap-x-2 gap-y-4 sm:grid-cols-6">
          {services.map((x) => (
            <li key={x.href}>
              <Link href={x.href} className="group flex flex-col items-center gap-2 rounded-3xl py-1 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)] transition-transform group-hover:-translate-y-0.5 group-active:scale-95 dark:bg-[var(--bg)] dark:text-[var(--color-leaf)]">
                  <Pictogram name={x.icon} size={24} />
                </span>
                <span className="text-base leading-tight font-medium">{t(x.title)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
