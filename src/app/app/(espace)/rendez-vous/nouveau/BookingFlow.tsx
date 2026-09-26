'use client';
import { CalendarCheck, CalendarDays, Check, ChevronRight, Hospital, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CommuneSelect } from '@/components/CommuneSelect';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { fmtKm } from '@/lib/places';
import { StepShell } from '../../../_components/StepShell';
import { PARTS, SERVICES, serviceOf, type Part, type ServiceCode } from '../shared';

export interface Person {
  id: string;
  label: string;
  commune: string | null;
}

interface FacilityOption {
  id: string;
  name: string;
  shortName: string | null;
  type: string;
  commune: string;
  distanceKm: number | null;
  sameCommune: boolean;
}

type StepKey = 'who' | 'service' | 'commune' | 'facility' | 'day' | 'confirm';

/** « 2026-10-03 » (jour au Bénin) pour les 14 prochains jours ouvrés, dimanche exclu. */
function nextDays(count = 14): string[] {
  const out: string[] = [];
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' });
  for (let i = 1; out.length < count && i < 30; i++) {
    const d = new Date(Date.now() + i * 86_400_000);
    const ymd = fmt.format(d);
    if (new Date(`${ymd}T12:00:00+01:00`).getUTCDay() !== 0) out.push(ymd);
  }
  return out;
}

export function BookingFlow({
  people,
  initialPerson,
  initialService,
  ownCommune,
  ownId,
}: {
  ownId: string | null;
  people: Person[];
  initialPerson: string | null;
  initialService: ServiceCode | null;
  ownCommune: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const steps = useMemo<StepKey[]>(() => [...(people.length > 1 ? (['who'] as const) : []), 'service', 'commune', 'facility', 'day', 'confirm'], [people.length]);
  const [i, setI] = useState(() => (initialService && people.length <= 1 ? 1 : 0));
  const [person, setPerson] = useState(initialPerson);
  const [service, setService] = useState<ServiceCode | null>(initialService);
  const [commune, setCommune] = useState(ownCommune ?? '');
  const [facilities, setFacilities] = useState<FacilityOption[] | null>(null);
  const [facility, setFacility] = useState<FacilityOption | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [part, setPart] = useState<Part | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const days = useMemo(() => nextDays(), []);
  const step = steps[i];
  const who = people.find((p) => p.id === person);

  const next = () => setI((x) => Math.min(x + 1, steps.length - 1));
  const back = () => (i === 0 ? router.push('/app/rendez-vous') : setI((x) => x - 1));

  // Liste des établissements : rechargée quand le service ou la commune change.
  useEffect(() => {
    if (step !== 'facility' || !service) return;
    let alive = true;
    setFacilities(null);
    setError(null);
    const q = new URLSearchParams({ specialty: service, ...(commune ? { commune } : {}) });
    api<FacilityOption[]>(`/appointments/facilities?${q}`)
      .then((l) => alive && setFacilities(l))
      .catch((e: unknown) => alive && (setFacilities([]), setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez.'))));
    return () => {
      alive = false;
    };
  }, [step, service, commune, t]);

  async function send() {
    if (!service || !facility || !day || !part) return;
    setBusy(true);
    setError(null);
    const hour = PARTS.find((p) => p.key === part)!.hour;
    try {
      await api('/me/appointments', {
        method: 'POST',
        json: {
          facilityId: facility.id,
          specialty: service,
          preferredAt: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00+01:00`).toISOString(),
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          ...(person && person !== ownId ? { patientId: person } : {}),
        },
      });
      setSent(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. La demande n’est pas partie. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  const svc = service ? serviceOf(service) : null;
  const dayLabel = day ? fmtDate(`${day}T12:00:00+01:00`, { weekday: 'long', day: 'numeric', month: 'long' }, locale) : '';
  const partLabel = part ? t(PARTS.find((p) => p.key === part)!.label).toLowerCase() : '';

  if (sent && facility) {
    return (
      <div className="mx-auto max-w-xl space-y-5 pt-4 text-center" role="status">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-ink)]">
          <Check size={40} aria-hidden />
        </span>
        <h1 className="text-[1.9rem] leading-tight font-medium">{t('Demande envoyée')}</h1>
        <p className="text-lg">{t('{lieu} vous répond par SMS et ici.', { lieu: facility.shortName ?? facility.name })}</p>
        <div className="grid gap-2">
          <Link href="/app/rendez-vous" className="btn btn-primary !min-h-14 text-lg">
            <CalendarCheck size={22} aria-hidden /> {t('Mes rendez-vous')}
          </Link>
          <Link href="/app" className="btn btn-ghost">
            {t('Accueil')}
          </Link>
        </div>
      </div>
    );
  }

  const common = { step: i, total: steps.length, onBack: back, backLabel: i === 0 ? t('Retour à mes rendez-vous') : t('Étape précédente') };

  if (step === 'who') {
    return (
      <StepShell {...common} title={t('Pour qui ?')} icon={<Users size={26} aria-hidden />} listen={t('Pour qui est ce rendez-vous ? Touchez le nom.')}>
        <ul className="grid gap-3">
          {people.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={person === p.id}
                onClick={() => {
                  setPerson(p.id);
                  if (p.commune && !commune) setCommune(p.commune);
                  next();
                }}
                className={`flex min-h-16 w-full items-center gap-4 rounded-[var(--radius-card)] p-4 text-left text-xl font-semibold ${person === p.id ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)]'}`}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-lg text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]" aria-hidden>
                  {p.label.charAt(0)}
                </span>
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      </StepShell>
    );
  }

  if (step === 'service') {
    return (
      <StepShell {...common} title={t('Pour quoi ?')} icon={<CalendarDays size={26} aria-hidden />} listen={t('Pour quoi voulez-vous voir un soignant ? Touchez une image : consultation, enfant, femme et grossesse, cœur, sang, peau ou cancer.')}>
        <ul className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => {
            const on = service === s.code;
            return (
              <li key={s.code} className={s.code === 'GENERALE' ? 'col-span-2' : undefined}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setService(s.code);
                    setFacility(null);
                    next();
                  }}
                  className={`flex h-full min-h-28 w-full flex-col items-start justify-between gap-3 rounded-[var(--radius-card)] p-4 text-left transition-transform active:scale-[0.98] motion-reduce:transition-none ${on ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)]'}`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-full ${s.blood ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-brand-900)] text-white dark:bg-[var(--color-brand-700)]'}`}>
                    <s.icon size={24} aria-hidden />
                  </span>
                  <span className="text-xl leading-tight font-semibold">{t(s.label)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </StepShell>
    );
  }

  if (step === 'commune') {
    return (
      <StepShell
        {...common}
        title={t('Quelle commune ?')}
        icon={<MapPin size={26} aria-hidden />}
        listen={t('Près de quelle commune cherchez-vous ? Votre commune est déjà choisie. Touchez Suivant.')}
        footer={
          <button type="button" className="btn btn-primary w-full !min-h-14 text-lg" onClick={next}>
            {t('Suivant')} <ChevronRight size={22} aria-hidden />
          </button>
        }
      >
        <div className="card p-4">
          <CommuneSelect id="rdv-commune" value={commune} onChange={(name) => setCommune(name)} label={t('Commune')} placeholder={t('Toutes les communes')} />
        </div>
        {!ownCommune && who?.id === people[0]?.id && (
          <p className="px-1 text-base text-[var(--fg-muted)]">
            {t('Astuce : enregistrez votre commune dans')}{' '}
            <Link href="/app/profil#adresse" className="font-semibold underline">
              {t('votre profil')}
            </Link>
            .
          </p>
        )}
      </StepShell>
    );
  }

  if (step === 'facility') {
    return (
      <StepShell {...common} title={t('Où ?')} icon={<Hospital size={26} aria-hidden />} listen={t('Choisissez l’établissement. Le plus proche est en haut.')}>
        {facilities === null && <p className="rounded-3xl bg-[var(--card)] p-4 text-lg text-[var(--fg-muted)]">{t('Recherche des établissements…')}</p>}
        {facilities && facilities.length === 0 && !error && (
          <p className="rounded-3xl bg-[var(--card)] p-4 text-lg">{t('Aucun établissement ne reçoit encore ce service sur Ganji. Essayez « Consultation ».')}</p>
        )}
        {facilities && facilities.length > 0 && (
          <ul className="grid gap-3">
            {facilities.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  aria-pressed={facility?.id === f.id}
                  onClick={() => {
                    setFacility(f);
                    next();
                  }}
                  className={`flex min-h-20 w-full items-center gap-4 rounded-[var(--radius-card)] p-4 text-left ${facility?.id === f.id ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)]'}`}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]">
                    <Hospital size={22} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg leading-snug font-semibold">{f.shortName ?? f.name}</span>
                    <span className="block text-base opacity-80">
                      {f.commune}
                      {f.distanceKm != null && (
                        <>
                          {' · '}
                          <span className="num">{fmtKm(f.distanceKm)}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <ChevronRight size={22} aria-hidden className="shrink-0 opacity-60" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <Alert text={error} />}
      </StepShell>
    );
  }

  if (step === 'day') {
    return (
      <StepShell
        {...common}
        title={t('Quel jour ?')}
        icon={<CalendarDays size={26} aria-hidden />}
        listen={t('Choisissez un jour, puis le matin ou l’après-midi. L’établissement confirme l’heure exacte.')}
        footer={
          <button type="button" className="btn btn-primary w-full !min-h-14 text-lg" disabled={!day || !part} onClick={next}>
            {t('Suivant')} <ChevronRight size={22} aria-hidden />
          </button>
        }
      >
        <fieldset className="min-w-0">
          <legend className="sr-only">{t('Jour')}</legend>
          <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0">
            {days.map((d) => {
              const on = day === d;
              const at = `${d}T12:00:00+01:00`;
              return (
                <li key={d} className="snap-start">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={fmtDate(at, { weekday: 'long', day: 'numeric', month: 'long' }, locale)}
                    onClick={() => setDay(d)}
                    className={`flex h-24 w-[4.5rem] flex-col items-center justify-center rounded-2xl sm:w-full ${on ? 'bg-[var(--color-brand-900)] text-white' : 'bg-[var(--card)]'}`}
                  >
                    <span className="text-sm font-semibold uppercase opacity-80">{fmtDate(at, { weekday: 'short' }, locale).replace('.', '')}</span>
                    <span className="display text-[2rem] font-normal">{fmtDate(at, { day: 'numeric' }, locale)}</span>
                    <span className="text-xs opacity-80">{fmtDate(at, { month: 'short' }, locale).replace('.', '')}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="sr-only">{t('Moment de la journée')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {PARTS.map((p) => {
              const on = part === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPart(p.key)}
                  className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] text-lg font-semibold ${on ? 'bg-[var(--color-leaf)] text-[var(--color-ink)]' : 'bg-[var(--card)]'}`}
                >
                  <p.icon size={26} aria-hidden />
                  {t(p.label)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </StepShell>
    );
  }

  // Récapitulatif et envoi.
  return (
    <StepShell
      {...common}
      title={t('Tout est juste ?')}
      icon={<CalendarCheck size={26} aria-hidden />}
      listen={t('Vérifiez puis touchez « Envoyer la demande ». {lieu}, {jour}, {moment}.', { lieu: facility?.shortName ?? facility?.name ?? '', jour: dayLabel, moment: partLabel })}
      footer={
        <button type="button" className="btn btn-primary w-full !min-h-16 text-xl" disabled={busy} onClick={() => void send()}>
          {busy ? t('Envoi…') : t('Envoyer la demande')}
        </button>
      }
    >
      <dl className="card divide-y divide-[var(--border)] px-4">
        {people.length > 1 && who && <Row icon={<Users size={20} aria-hidden />} label={t('Pour')} value={who.label} onEdit={() => setI(steps.indexOf('who'))} />}
        {svc && <Row icon={<svc.icon size={20} aria-hidden />} label={t('Service')} value={t(svc.label)} onEdit={() => setI(steps.indexOf('service'))} />}
        {facility && <Row icon={<Hospital size={20} aria-hidden />} label={t('Lieu')} value={`${facility.shortName ?? facility.name} · ${facility.commune}`} onEdit={() => setI(steps.indexOf('facility'))} />}
        {day && <Row icon={<CalendarDays size={20} aria-hidden />} label={t('Jour souhaité')} value={`${dayLabel}, ${partLabel}`} onEdit={() => setI(steps.indexOf('day'))} />}
      </dl>
      <label className="block">
        <span className="label mb-1.5 block">{t('Motif (facultatif)')}</span>
        <input className="input" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder={t('Ex. : contrôle, fièvre depuis 3 jours')} />
      </label>
      <p className="px-1 text-base text-[var(--fg-muted)]">{t('L’établissement confirme l’heure par SMS. Rappel la veille.')}</p>
      {error && <Alert text={error} />}
    </StepShell>
  );
}

function Row({ icon, label, value, onEdit }: { icon: React.ReactNode; label: string; value: string; onEdit: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-sm text-[var(--fg-muted)]">{label}</dt>
        <dd className="text-lg leading-snug font-semibold first-letter:uppercase">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="min-h-12 shrink-0 rounded-full px-3 text-base font-semibold text-[var(--color-brand-700)] underline dark:text-[var(--color-leaf)]">
        {t('Changer')}
        <span className="sr-only"> : {label}</span>
      </button>
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-semibold text-[var(--color-ocre-700)]">
      {text}
    </p>
  );
}
