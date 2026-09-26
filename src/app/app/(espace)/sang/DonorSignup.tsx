'use client';
import { ArrowLeft, ArrowRight, Check, MessageSquareText, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { Pictogram } from '@/components/Pictogram';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import type { Department, DonorMe } from './types';

const GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
const STEPS = ['Groupe', 'Commune', 'Téléphone'] as const;

/**
 * Devenir donneur en trois gestes : groupe (prérempli depuis la fiche vitale), commune (on n'est appelé
 * que pour les hôpitaux proches), type de téléphone (application, ou SMS et appel vocal).
 */
export function DonorSignup({ prefill, departments }: { prefill: DonorMe['prefill']; departments: Department[] }) {
  const t = useT();
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [group, setGroup] = useState(prefill.bloodGroup ?? '');
  const [communeId, setCommuneId] = useState(prefill.communeId ?? '');
  const [smart, setSmart] = useState<boolean | null>(null);
  const [weightOk, setWeightOk] = useState<boolean | null>(null);
  const [sex, setSex] = useState(prefill.sex ?? '');
  const [age, setAge] = useState(prefill.age ? String(prefill.age) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="flex-1 text-lg">{t('Un don peut sauver trois vies. On vous appelle seulement quand un hôpital proche a besoin de votre groupe.')}</p>
        <button type="button" className="btn btn-danger !min-h-14 text-lg" onClick={() => setOpen(true)}>
          <Pictogram name="blood" size={22} /> {t('Devenir donneur')}
        </button>
      </div>
    );
  }

  const canNext = step === 0 ? Boolean(group) : step === 1 ? Boolean(communeId) : smart !== null && (prefill.hasProfile || (Boolean(sex) && Boolean(age)));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api('/blood/donor/me', {
        method: 'PUT',
        json: {
          bloodGroup: group,
          communeId,
          hasSmartphone: smart ?? true,
          available: true,
          ...(weightOk !== null ? { weightOk } : {}),
          ...(!prefill.hasProfile ? { sex, age: Number(age) } : {}),
        },
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez dans un instant.'));
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canNext) return;
        if (step < 2) setStep(step + 1);
        else void save();
      }}
    >
      <ol className="grid grid-cols-3 gap-2" aria-label={t('Étapes de l’inscription')}>
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className="space-y-1.5">
            <span aria-hidden className={`block h-1.5 rounded-full ${i <= step ? 'bg-[var(--color-danger-600)]' : 'bg-[var(--border)]'}`} />
            <span className={`block text-sm ${i === step ? 'font-bold' : 'text-[var(--fg-muted)]'}`}>
              {t(label)}
              <span className="sr-only">{i < step ? t(' : fait') : i === step ? t(' : en cours') : t(' : à venir')}</span>
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <fieldset>
          <legend className="mb-3 text-xl font-bold">{t('Votre groupe sanguin')}</legend>
          <div className="grid grid-cols-4 gap-2">
            {GROUPS.map((g) => (
              <label
                key={g}
                className={`grid min-h-16 cursor-pointer place-items-center rounded-2xl border-2 text-2xl font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--color-ocre-500)] ${group === g ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-50)] text-[var(--color-danger-800)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
              >
                <input type="radio" name={`${uid}-g`} value={g} checked={group === g} onChange={() => setGroup(g)} className="sr-only" />
                <span className="num">{g}</span>
              </label>
            ))}
          </div>
          {prefill.bloodGroup && <p className="mt-2 text-base text-[var(--fg-muted)]">{t('Pris dans votre carnet.')}</p>}
        </fieldset>
      )}

      {step === 1 && (
        <div>
          <label htmlFor={`${uid}-c`} className="mb-3 block text-xl font-bold">
            {t('Votre commune')}
          </label>
          <select id={`${uid}-c`} className="input text-lg" value={communeId} onChange={(e) => setCommuneId(e.target.value)} required>
            <option value="">{t('Choisir')}</option>
            {departments.map((d) => (
              <optgroup key={d.code} label={d.name}>
                {d.communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-2 text-base text-[var(--fg-muted)]">{t('Seuls les hôpitaux proches vous appellent.')}</p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-3 text-xl font-bold">{t('Votre téléphone')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: true, Icon: Smartphone, label: 'Smartphone', hint: 'Appel dans l’application' },
                { v: false, Icon: MessageSquareText, label: 'Téléphone simple', hint: 'SMS ou appel vocal' },
              ].map(({ v, Icon, label, hint }) => (
                <label
                  key={label}
                  className={`flex min-h-24 cursor-pointer flex-col items-start gap-1 rounded-2xl border-2 p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--color-ocre-500)] ${smart === v ? 'border-[var(--color-brand-900)] bg-[var(--color-brand-100)] text-[var(--color-ink)]' : 'border-[var(--border)] bg-[var(--card)]'}`}
                >
                  <input type="radio" name={`${uid}-s`} checked={smart === v} onChange={() => setSmart(v)} className="sr-only" />
                  <Icon size={26} aria-hidden />
                  <span className="font-bold">{t(label)}</span>
                  <span className="text-sm opacity-80">{t(hint)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {!prefill.hasProfile && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${uid}-sex`} className="label mb-1 block">
                  {t('Vous êtes')}
                </label>
                <select id={`${uid}-sex`} className="input" value={sex} onChange={(e) => setSex(e.target.value)} required>
                  <option value="">{t('Choisir')}</option>
                  <option value="F">{t('une femme')}</option>
                  <option value="M">{t('un homme')}</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-age`} className="label mb-1 block">
                  {t('Votre âge')}
                </label>
                <input id={`${uid}-age`} className="input num" inputMode="numeric" type="number" min={10} max={110} value={age} onChange={(e) => setAge(e.target.value)} required />
              </div>
            </div>
          )}

          <fieldset>
            <legend className="mb-2 font-bold">
              {t('Vous pesez plus de 50 kg ?')} <span className="font-normal text-[var(--fg-muted)]">{t('(facultatif)')}</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: true, label: 'Oui' },
                { v: false, label: 'Non' },
              ].map(({ v, label }) => (
                <button key={label} type="button" aria-pressed={weightOk === v} onClick={() => setWeightOk(weightOk === v ? null : v)} className={`btn !min-h-12 ${weightOk === v ? 'btn-primary' : 'btn-ghost'}`}>
                  {t(label)}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="btn btn-ghost !min-h-14 !w-14 shrink-0 !p-0" onClick={() => setStep(step - 1)} disabled={busy} aria-label={t('Retour')}>
            <ArrowLeft size={22} aria-hidden />
          </button>
        )}
        {step < 2 ? (
          <button type="submit" className="btn btn-primary !min-h-14 flex-1 text-lg" disabled={!canNext}>
            {t('Suivant')} <ArrowRight size={20} aria-hidden />
          </button>
        ) : (
          <button type="submit" className="btn btn-danger !min-h-14 flex-1 text-lg" disabled={!canNext || busy}>
            <Check size={22} aria-hidden /> {busy ? t('Inscription…') : t('Je deviens donneur')}
          </button>
        )}
      </div>
    </form>
  );
}
