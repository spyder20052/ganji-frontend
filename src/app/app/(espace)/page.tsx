import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, EyeOff } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate, relative } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { ErrorNote } from '../_components/ui';
import { cardFromSummary } from '../_lib/emergency-card';
import { hourOnly } from '../_lib/labels';
import { getMe, load } from '../_lib/load';
import { SaveEmergencyCard } from './SaveEmergencyCard';

export const metadata: Metadata = { title: 'Mon espace' };

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
  paper: { card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  leaf: { card: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]', chip: 'bg-[var(--color-brand-500)] text-white' },
  blood: { card: 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]', chip: 'bg-[var(--color-danger-600)] text-white' },
  danger: { card: 'bg-[var(--color-danger-600)] text-white', chip: 'bg-white text-[var(--color-danger-600)]' },
};

/** Aperçus (maquettes cliquables) : un mot chacun, regroupés dans une seule carte. */
const PREVIEWS = [
  { href: '/app/ecoute', icon: 'listen', title: 'Écoute' },
  { href: '/app/droits', icon: 'shield', title: 'Droits' },
  { href: '/app/assistant', icon: 'chat', title: 'Assistant' },
  { href: '/app/cercle', icon: 'people', title: 'Cercle' },
];

function greeting() {
  const part = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Porto-Novo', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).find((x) => x.type === 'hour');
  const h = Number(part?.value ?? 12);
  return h >= 18 || h < 4 ? 'Bonsoir' : 'Bonjour';
}

export default async function AppHome() {
  const me = await getMe();
  const [summaryRes, helped] = await Promise.all([
    me.patientId ? load<Summary>('/me/summary') : Promise.resolve(null),
    Promise.all(me.delegations.map(async (d) => ({ d, res: await load<Summary>(`/patients/${d.patient.id}/summary`) }))),
  ]);
  const s = summaryRes?.data ?? null;
  const alertsRes = s?.commune ? await load<HealthAlert[]>(`/alerts?commune=${encodeURIComponent(s.commune)}`) : null;
  const alert = (alertsRes?.data ?? [])[0] ?? null;

  const firstName = s?.firstName ?? me.displayName.split(' ')[0];
  const next = s?.nextReminders[0] ?? null;
  const nextTitle = next ? (s?.discreetMode ? 'Rendez-vous de santé' : next.title) : null;
  const listen = [
    `${greeting()} ${firstName}.`,
    next ? `Prochain rendez-vous : ${nextTitle}, le ${fmtDate(next.dueAt, { weekday: 'long', day: 'numeric', month: 'long' })} à ${hourOnly(next.dueAt)}${next.place ? `, à ${next.place}` : ''}.` : 'Aucun rendez-vous prévu pour le moment.',
    'Touchez une grande case : carnet, médicaments, sang, ou urgence.',
  ].join(' ');

  // Raccourcis : un mot sous chaque icône ; grossesse et enfants seulement quand ils existent.
  const shortcuts = [
    ...(s?.pregnancy ? [{ href: '/app/grossesse', icon: 'pregnant', title: 'Grossesse' }] : []),
    ...(s && s.children.length > 0 ? [{ href: '/app/enfants', icon: 'baby', title: s.children.length > 1 ? 'Enfants' : 'Enfant' }] : []),
    { href: '/app/symptomes', icon: 'fever', title: 'Symptôme' },
    { href: '/app/partage', icon: 'qr', title: 'Partager' },
    { href: '/app/aidants', icon: 'care', title: 'Proches' },
  ].slice(0, 4);

  return (
    <>
      {/* En-tête Forêt à la trame Ganji (maquette de la charte), puis la carte du rendez-vous qui le chevauche. */}
      <header className="motif-foret -mx-4 -mt-2 space-y-3 rounded-b-[2rem] px-4 pt-6 pb-20 text-white sm:mx-0 sm:mt-0 sm:rounded-[var(--radius-card)] sm:px-6">
        <p className="text-base text-white/80 first-letter:uppercase">{fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-[2.4rem] leading-[1.05] font-medium tracking-tight">
            {greeting()} {firstName}
          </h1>
          <ListenButton text={listen} audioKey="app.home" compact />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s && <SaveEmergencyCard card={cardFromSummary(s)} />}
          {s?.discreetMode && (
            <span className="pill bg-white/15 text-white">
              <EyeOff size={16} aria-hidden /> Mode discret
            </span>
          )}
        </div>
        {summaryRes?.error && <ErrorNote what="Votre carnet" error={summaryRes.error} />}
      </header>

      {me.patientId && (
        <section aria-labelledby="h-rdv" className="relative -mt-20 rounded-[var(--radius-card)] bg-[var(--card)] p-4 shadow-[var(--shadow-soft)]">
          {next ? (
            <div className="flex items-center gap-4">
              <p className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-center">
                <span>
                  <span className="block text-sm font-semibold text-[var(--color-brand-900)] uppercase">{fmtDate(next.dueAt, { weekday: 'short' }).replace('.', '')}</span>
                  <span className="display block text-[2rem] font-semibold text-[var(--color-brand-900)]">{fmtDate(next.dueAt, { day: 'numeric' })}</span>
                </span>
              </p>
              <div className="min-w-0 flex-1">
                <h2 id="h-rdv" className="text-sm font-normal text-[var(--fg-muted)]">
                  Prochain rendez-vous · {relative(next.dueAt)}
                </h2>
                <p className="font-display text-lg leading-snug font-semibold text-[var(--color-brand-900)]">{nextTitle}</p>
                <p className="num text-base text-[var(--fg-muted)]">
                  {hourOnly(next.dueAt)}
                  {next.place && !s?.discreetMode ? ` · ${next.place}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h2 id="h-rdv" className="text-sm font-normal text-[var(--fg-muted)]">Prochain rendez-vous</h2>
              <p className="text-lg">Rien de prévu. Vos rappels arrivent aussi par SMS.</p>
            </div>
          )}
        </section>
      )}

      <nav aria-label="Actions principales">
        {/* Deux colonnes sur téléphone, une seule quand le texte est agrandi (largeur minimale en rem). */}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-3 lg:grid-cols-4">
          {tiles(s?.emergencyContact).map((t) => {
            const tone = TILE_TONE[t.tone];
            return (
              <li key={t.href} className={t.only === 'standard' ? 'simple-hide' : t.only === 'simple' ? 'simple-only' : undefined}>
                <Link
                  href={t.href}
                  className={`flex aspect-[1/1.02] h-full flex-col justify-between rounded-[var(--radius-card)] p-4 transition-transform active:scale-[0.98] lg:aspect-[1.35/1] ${tone.card}`}
                >
                  <span className="flex items-start justify-between">
                    <span className={`grid h-14 w-14 place-items-center rounded-full ${tone.chip}`}>
                      <Pictogram name={t.icon} size={28} />
                    </span>
                    <ArrowUpRight size={22} aria-hidden className="opacity-60" />
                  </span>
                  <span className="text-[1.35rem] leading-tight font-semibold simple-big">{t.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {helped.map(({ d, res }) => {
        const p = res.data;
        const r = p?.nextReminders[0];
        return (
          <section key={d.patient.id} aria-label={`${d.patient.firstName}, que vous aidez`} className="card space-y-4 p-5">
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
                  <dt className="text-sm">Groupe</dt>
                  <dd className="display text-[2.2rem]">{p.bloodGroup ?? '?'}</dd>
                </div>
                <div className="rounded-3xl bg-[var(--bg)] px-4 py-3">
                  <dt className="text-sm text-[var(--fg-muted)]">Prochain rendez-vous</dt>
                  <dd className="font-semibold">{r ? `${fmtDate(r.dueAt, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hourOnly(r.dueAt)}` : 'Aucun'}</dd>
                </div>
              </dl>
            )}
            <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-primary w-full">
              Carnet de {d.patient.firstName}
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
            <span className="block text-sm">Alerte santé{s?.commune ? ` · ${s.commune}` : ''}</span>
            <span className="block font-semibold">{alert.title}</span>
          </span>
          <ChevronRight size={20} aria-hidden className="shrink-0" />
        </Link>
      )}
      {alertsRes?.error && <div className="simple-hide"><ErrorNote what="Alertes santé" error={alertsRes.error} /></div>}

      <nav aria-label="Raccourcis" className="simple-hide">
        <ul className="flex flex-wrap justify-around gap-2">
          {shortcuts.map((x) => (
            <li key={x.href}>
              <Link href={x.href} className="flex flex-col items-center gap-2 rounded-3xl py-2 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--card)] text-[var(--color-brand-900)] dark:text-[var(--color-leaf)]">
                  <Pictogram name={x.icon} size={24} />
                </span>
                <span className="text-base leading-tight font-medium">{x.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="h-bientot" className="simple-hide card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="h-bientot" className="text-lg font-semibold">Bientôt</h2>
          <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]">Aperçus</span>
        </div>
        <ul className="grid grid-cols-4 gap-2">
          {PREVIEWS.map((x) => (
            <li key={x.href}>
              <Link href={x.href} className="flex flex-col items-center gap-2 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--bg)] text-[var(--fg-muted)]">
                  <Pictogram name={x.icon} size={22} />
                </span>
                <span className="text-sm font-medium">{x.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
