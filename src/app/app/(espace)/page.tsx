import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, EyeOff, MapPin } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { fmtDate, relative } from '@/lib/format';
import type { Summary } from '@/lib/types';
import { ErrorNote, Notice, PreviewBadge } from '../_components/ui';
import { cardFromSummary } from '../_lib/emergency-card';
import { hourOnly, REMINDER_ICON, SCOPE_LABEL } from '../_lib/labels';
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

interface Tile { href: string; icon: string; title: string; text: string; danger?: boolean; only?: 'standard' | 'simple' }

/**
 * Les 4 tuiles de l'accueil. En mode simple (personne âgée), le cahier fixe les 4 actions :
 * mon carnet, mes médicaments, appeler, urgence ; « Sang » cède sa place à « Appeler ».
 */
function tiles(contact: Summary['emergencyContact'] | undefined): Tile[] {
  return [
    { href: '/app/carnet', icon: 'carnet', title: 'Mon carnet', text: 'Fiche vitale, soins, analyses' },
    { href: '/app/medicaments', icon: 'pill', title: 'Mes médicaments', text: 'Ordonnances à montrer' },
    { href: '/app/sang', icon: 'blood', title: 'Sang', text: 'Demandes et dons', only: 'standard' },
    contact?.phone
      ? { href: `tel:${contact.phone}`, icon: 'phone', title: 'Appeler', text: contact.name, only: 'simple' }
      : { href: 'tel:118', icon: 'phone', title: 'Appeler', text: 'Sapeurs-pompiers 118', only: 'simple' },
    { href: '/app/carte-urgence', icon: 'emergency', title: 'Urgence', text: 'Ma carte QR, même sans réseau', danger: true },
  ];
}

const PREVIEWS = [
  { href: '/app/ecoute', icon: 'listen', title: 'Écoute anonyme', text: 'Parler à quelqu’un, sans donner son nom' },
  { href: '/app/droits', icon: 'shield', title: 'Mes droits et frais', text: 'ARCH, coût estimé, paiement mobile' },
  { href: '/app/assistant', icon: 'chat', title: 'Assistant', text: 'Mon ordonnance expliquée simplement' },
  { href: '/app/cercle', icon: 'people', title: 'Cercle de soin', text: 'Plusieurs aidants, visites du relais' },
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
  const alerts = (alertsRes?.data ?? []).slice(0, 3);

  const firstName = s?.firstName ?? me.displayName.split(' ')[0];
  const next = s?.nextReminders[0] ?? null;
  const nextTitle = next ? (s?.discreetMode ? 'Rendez-vous de santé' : next.title) : null;
  const listen = [
    `${greeting()} ${firstName}.`,
    next ? `Prochain rendez-vous : ${nextTitle}, le ${fmtDate(next.dueAt, { weekday: 'long', day: 'numeric', month: 'long' })} à ${hourOnly(next.dueAt)}${next.place ? `, à ${next.place}` : ''}.` : 'Aucun rendez-vous prévu pour le moment.',
    'Touchez une grande case : mon carnet, mes médicaments, sang, ou urgence.',
  ].join(' ');

  return (
    <>
      <header className="space-y-3">
        <p className="label">{fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-3xl font-bold simple-big sm:text-4xl">
          {greeting()} {firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <ListenButton text={listen} audioKey="app.home" />
          {s?.discreetMode && (
            <span className="pill bg-[var(--card)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">
              <EyeOff size={16} aria-hidden /> Mode discret activé
            </span>
          )}
        </div>
        {s && <SaveEmergencyCard card={cardFromSummary(s)} />}
        {summaryRes?.error && <ErrorNote what="Votre carnet" error={summaryRes.error} />}
      </header>

      <nav aria-label="Actions principales">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {tiles(s?.emergencyContact).map((t) => (
            <li key={t.href} className={t.only === 'standard' ? 'simple-hide' : t.only === 'simple' ? 'simple-only' : undefined}>
              <Link
                href={t.href}
                className={`card flex h-full min-h-40 flex-col justify-between gap-4 p-5 transition-shadow hover:shadow-md ${t.danger ? '!border-transparent !bg-[var(--color-danger-600)] text-white' : ''}`}
              >
                <span className={`grid h-14 w-14 place-items-center rounded-full ${t.danger ? 'bg-white text-[var(--color-danger-600)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
                  <Pictogram name={t.icon} size={30} />
                </span>
                <span>
                  <span className="block text-xl font-bold simple-big">{t.title}</span>
                  <span className={`simple-hide block text-base ${t.danger ? 'text-white/90' : 'text-[var(--fg-muted)]'}`}>{t.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {me.patientId && (
        <section aria-labelledby="h-rdv" className="card overflow-hidden">
          <div className="flex flex-wrap items-stretch">
            {next ? (
              <>
                <div className="flex min-w-32 flex-col items-center justify-center gap-0.5 bg-[var(--color-brand-900)] px-6 py-5 text-white">
                  <span className="label !text-[var(--color-brand-200)]">{fmtDate(next.dueAt, { month: 'short' })}</span>
                  <span className="num text-5xl font-bold leading-none">{fmtDate(next.dueAt, { day: 'numeric' })}</span>
                  <span className="num text-lg font-bold">{hourOnly(next.dueAt)}</span>
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-4 p-5">
                  <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
                    <Pictogram name={REMINDER_ICON[next.kind] ?? 'calendar'} size={22} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="h-rdv" className="label">Prochain rendez-vous · {relative(next.dueAt)}</h2>
                    <p className="text-xl font-bold">{nextTitle}</p>
                    {next.place && !s?.discreetMode && (
                      <p className="flex items-center gap-1 text-base text-[var(--fg-muted)]">
                        <MapPin size={16} aria-hidden /> {next.place}
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4 p-5">
                <span className="chip-round text-[var(--fg-muted)]"><Pictogram name="calendar" size={22} /></span>
                <div>
                  <h2 id="h-rdv" className="label">Prochain rendez-vous</h2>
                  <p className="text-lg">Aucun rendez-vous prévu. Vos rappels arrivent aussi par SMS.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {helped.length > 0 && (
        <section aria-labelledby="h-aide" className="space-y-3">
          <h2 id="h-aide" className="text-xl font-bold">Vous aidez</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {helped.map(({ d, res }) => {
              const p = res.data;
              const r = p?.nextReminders[0];
              return (
                <li key={d.patient.id} className="card space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-lg font-bold text-[var(--color-brand-900)]" aria-hidden>
                      {d.patient.firstName.charAt(0)}
                    </span>
                    <div>
                      <p className="text-xl font-bold simple-big">
                        {d.patient.firstName} <span className="font-normal text-[var(--fg-muted)]">({d.relation})</span>
                      </p>
                      <p className="text-sm text-[var(--fg-muted)]">Vous pouvez voir : {d.scopes.map((x) => (SCOPE_LABEL[x] ?? x).toLowerCase()).join(', ')}</p>
                    </div>
                  </div>
                  {res.error && <ErrorNote error={res.error} />}
                  {p && (
                    <dl className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[var(--color-danger-50)] p-3 text-[var(--color-danger-800)]">
                        <dt className="text-sm font-bold">Groupe sanguin</dt>
                        <dd className="num text-3xl font-bold">{p.bloodGroup ?? '?'}</dd>
                      </div>
                      <div className="rounded-2xl bg-[var(--bg)] p-3">
                        <dt className="text-sm font-bold text-[var(--fg-muted)]">Allergies</dt>
                        <dd className="font-bold">{p.allergies.length ? p.allergies.join(', ') : 'Aucune connue'}</dd>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-[var(--bg)] p-3">
                        <dt className="text-sm font-bold text-[var(--fg-muted)]">Prochain rendez-vous</dt>
                        <dd className="font-bold">{r ? `${r.title} · ${fmtDate(r.dueAt, { weekday: 'short', day: 'numeric', month: 'short' })} à ${hourOnly(r.dueAt)}` : 'Aucun pour le moment'}</dd>
                      </div>
                    </dl>
                  )}
                  <Link href={`/app/carnet?patient=${d.patient.id}`} className="btn btn-soft w-full">
                    Voir le carnet de {d.patient.firstName} <ArrowRight size={18} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {alerts.length > 0 && (
        <section aria-labelledby="h-alertes" className="simple-hide space-y-3">
          <h2 id="h-alertes" className="text-xl font-bold">Alertes santé {s?.commune ? `à ${s.commune}` : ''}</h2>
          {alerts.map((a) => (
            <Notice key={a.id} tone={a.severity === 'URGENCE' ? 'danger' : a.severity === 'ATTENTION' ? 'warn' : 'info'} title={a.title}>
              <p>{a.message}</p>
              <p className="mt-1 text-sm">
                {a.source} · {fmtDate(a.createdAt, { day: 'numeric', month: 'long' })} · {a.national ? 'tout le pays' : a.communes.join(', ')}
              </p>
            </Notice>
          ))}
        </section>
      )}
      {alertsRes?.error && <div className="simple-hide"><ErrorNote what="Alertes santé" error={alertsRes.error} /></div>}

      <section aria-labelledby="h-pourvous" className="simple-hide space-y-3">
        <h2 id="h-pourvous" className="text-xl font-bold">Pour vous</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s?.pregnancy && <SituationLink href="/app/grossesse" icon="pregnant" title="Ma grossesse" text={`Terme prévu le ${fmtDate(s.pregnancy.edd, { day: 'numeric', month: 'long' })}`} />}
          {s && s.children.length > 0 && (
            <SituationLink href="/app/enfants" icon="baby" title={s.children.length > 1 ? 'Mes enfants' : 'Mon enfant'} text={`Vaccins de ${s.children.map((c) => c.firstName).join(' et ')}`} />
          )}
          <SituationLink href="/app/symptomes" icon="fever" title="Je ne me sens pas bien" text="Noter un symptôme, prévenir l’équipe" />
          <SituationLink href="/app/sos" icon="sos" title="Alerte SOS" text="Prévenir mes proches et le relais" danger />
          <SituationLink href="/app/partage" icon="qr" title="Partager mon carnet" text="QR pour le soignant, journal d’accès" />
          <SituationLink href="/app/aidants" icon="care" title="Aidants et réglages" text="Proches, mode discret, code PIN" />
        </ul>
        <h3 className="flex flex-wrap items-center gap-2 pt-2 text-lg font-bold">Bientôt <PreviewBadge /></h3>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PREVIEWS.map((p) => (
            <SituationLink key={p.href} {...p} />
          ))}
        </ul>
      </section>
    </>
  );
}

function SituationLink({ href, icon, title, text, danger = false }: { href: string; icon: string; title: string; text: string; danger?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={`group flex h-full items-center gap-4 rounded-3xl border p-4 hover:shadow-sm ${danger ? 'border-[var(--color-danger-600)]/30 bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
      >
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${danger ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]'}`}>
          <Pictogram name={icon} size={24} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          <span className={`block text-base ${danger ? '' : 'text-[var(--fg-muted)]'}`}>{text}</span>
        </span>
        <ArrowRight size={20} aria-hidden className="shrink-0 opacity-60 group-hover:opacity-100" />
      </Link>
    </li>
  );
}
