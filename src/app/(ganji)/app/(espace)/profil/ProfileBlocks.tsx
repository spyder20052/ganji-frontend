'use client';
import { CheckCircle2, Droplet, EyeOff, HeartPulse, Languages, MapPin, Pencil, Phone, Pill, ShieldCheck, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { CommuneSelect } from '@/components/CommuneSelect';
import { useLocale, useT } from '@/i18n/client';
import { LOCALE_NAMES, type Locale } from '@/i18n/translate';
import { ApiError } from '@/lib/api';
import { fmtDate, fmtPhone } from '@/lib/format';
import { BloodGroupPicker, ContactFields, LanguagePicker, SexPicker, TagEditor, VoicePicker } from '../../_components/ProfileFields';
import { ALLERGY_SUGGESTIONS, CONDITION_SUGGESTIONS, readVoice, saveLocale, saveProfile, saveVoice, VOICES, type Profile, type ProfilePatch } from '../../_lib/profile';

type BlockKey = 'identite' | 'adresse' | 'sang' | 'allergies' | 'maladies' | 'traitements' | 'contact' | 'langue';

function ageOf(birth: string) {
  const b = new Date(birth);
  const d = new Date();
  let a = d.getFullYear() - b.getFullYear();
  if (d < new Date(d.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

/** Profil : chaque bloc se lit d'un coup d'œil et se corrige sur place (un seul bloc ouvert à la fois). */
export function ProfileBlocks({ profile: initial }: { profile: Profile }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [open, setOpen] = useState<BlockKey | null>(null);
  const [saved, setSaved] = useState<BlockKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState('');
  const p = profile.patient;

  useEffect(() => setProfile(initial), [initial]);
  useEffect(() => setVoice(readVoice()), []);
  // Arrivée depuis « Compléter » (carnet, accueil) : le bloc visé s'ouvre directement.
  useEffect(() => {
    const open = () => {
      const k = window.location.hash.slice(1) as BlockKey;
      if (['identite', 'adresse', 'sang', 'allergies', 'maladies', 'traitements', 'contact', 'langue'].includes(k)) {
        if (k === 'sang' && initial.patient?.bloodGroupSource === 'VERIFIE') return;
        setOpen(k);
        setError(null);
      }
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [initial.patient?.bloodGroupSource]);

  async function save(key: BlockKey, patch: ProfilePatch, after?: () => void) {
    setBusy(true);
    setError(null);
    try {
      setProfile(await saveProfile(patch));
      setOpen(null);
      setSaved(key);
      after?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Rien n’a été enregistré. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  const shell = (key: BlockKey) => ({
    id: key,
    open: open === key,
    saved: saved === key && open !== key,
    busy,
    error: open === key ? error : null,
    onEdit: () => {
      setOpen(key);
      setSaved(null);
      setError(null);
    },
    onCancel: () => {
      setOpen(null);
      setError(null);
    },
  });

  const todo = <span className="font-semibold text-[var(--color-ocre-700)]">{t('À compléter')}</span>;
  const voiceName = VOICES.find((v) => v.value === voice);

  return (
    <div className="space-y-3">
      {/* Identité */}
      <Block
        {...shell('identite')}
        icon={UserRound}
        title={t('Qui je suis')}
        view={
          p ? (
            <>
              <p className="text-xl font-semibold">
                {p.firstName} {p.lastName}
              </p>
              <p className="text-base text-[var(--fg-muted)]">
                {t('{age} ans', { age: ageOf(p.birthDate) })} · {p.sex === 'F' ? t('Femme') : t('Homme')} · {fmtDate(p.birthDate, undefined, locale)}
              </p>
            </>
          ) : (
            <p className="text-xl font-semibold">{profile.account.displayName}</p>
          )
        }
        form={<IdentityForm profile={profile} busy={busy} onSave={(patch) => save('identite', patch)} />}
      />

      {p && (
        <>
          <Block
            {...shell('adresse')}
            icon={MapPin}
            title={t('Où j’habite')}
            view={
              <>
                <p className="text-xl font-semibold">{p.commune ?? todo}</p>
                {(p.quartier || p.repere) && <p className="text-base text-[var(--fg-muted)]">{[p.quartier, p.repere].filter(Boolean).join(' · ')}</p>}
              </>
            }
            form={<AddressForm p={p} busy={busy} onSave={(patch) => save('adresse', patch)} />}
          />

          <Block
            {...shell('sang')}
            icon={Droplet}
            blood
            title={t('Groupe sanguin')}
            locked={p.bloodGroupSource === 'VERIFIE'}
            view={
              <div className="flex flex-wrap items-center gap-3">
                <p className={`display text-[2.6rem] ${p.bloodGroup ? 'text-[var(--color-danger-800)]' : 'text-[var(--fg-muted)]'}`}>{p.bloodGroup ?? '?'}</p>
                {p.bloodGroupSource === 'VERIFIE' ? (
                  <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]">
                    <ShieldCheck size={16} aria-hidden /> {t('Vérifié par un soignant')}
                  </span>
                ) : p.bloodGroup ? (
                  <span className="text-base text-[var(--fg-muted)]">{t('Déclaré par vous')}</span>
                ) : (
                  todo
                )}
              </div>
            }
            form={<BloodForm value={p.bloodGroup} busy={busy} onSave={(g) => save('sang', { bloodGroup: g })} />}
          />

          <Block
            {...shell('allergies')}
            icon={TriangleAlert}
            title={t('Allergies')}
            view={
              p.allergies.length ? (
                <ul className="flex flex-wrap gap-2">
                  {p.allergies.map((a) => (
                    <li key={a} className="pill bg-[var(--color-ocre-100)] !text-base text-[var(--color-ocre-700)]">
                      {a}
                    </li>
                  ))}
                </ul>
              ) : p.profileDoneAt ? (
                <p className="text-lg">{t('Aucune allergie connue')}</p>
              ) : (
                todo
              )
            }
            form={<ListForm initial={p.allergies} busy={busy} label={t('Allergies')} suggestions={ALLERGY_SUGGESTIONS} placeholder={t('Ex. : pénicilline')} onSave={(allergies) => save('allergies', { allergies })} />}
          />

          <Block
            {...shell('maladies')}
            icon={HeartPulse}
            title={t('Maladies suivies')}
            view={
              p.conditions.length ? (
                <ul className="space-y-1">
                  {p.conditions.map((c) => (
                    <li key={c.id} className="text-lg leading-snug">
                      {c.sensitive && <EyeOff size={16} aria-hidden className="mr-1.5 inline align-[-2px] text-[var(--fg-muted)]" />}
                      <span className="font-semibold">{c.label}</span>
                      {!c.declared && <span className="block text-sm text-[var(--fg-muted)]">{t('par votre soignant')}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-lg">{t('Aucune')}</p>
              )
            }
            form={
              <ConditionsForm
                conditions={p.conditions}
                busy={busy}
                onSave={(patch) => save('maladies', patch)}
              />
            }
          />

          <Block
            {...shell('traitements')}
            icon={Pill}
            title={t('Traitement en cours')}
            view={<p className="text-lg whitespace-pre-line">{p.treatments || t('Aucun')}</p>}
            form={<TreatmentForm initial={p.treatments} busy={busy} onSave={(treatments) => save('traitements', { treatments })} />}
          />

          <Block
            {...shell('contact')}
            icon={Phone}
            title={t('Personne à prévenir')}
            view={
              p.emergencyPhone ? (
                <>
                  <p className="text-xl font-semibold">{p.emergencyName}</p>
                  <p className="num text-base text-[var(--fg-muted)]">{fmtPhone(p.emergencyPhone)}</p>
                </>
              ) : (
                todo
              )
            }
            form={<ContactForm name={p.emergencyName} phone={p.emergencyPhone} busy={busy} onSave={(patch) => save('contact', patch)} />}
          />
        </>
      )}

      <Block
        {...shell('langue')}
        icon={Languages}
        title={t('Langue et voix')}
        view={
          <p className="text-xl font-semibold">
            {LOCALE_NAMES[locale]}
            <span className="block text-base font-normal text-[var(--fg-muted)]">
              {t('Voix')} : {voiceName?.value ? voiceName.label : t('Comme l’interface')}
            </span>
          </p>
        }
        form={
          <LanguageForm
            lang={locale}
            voice={voice}
            busy={busy}
            onSave={async (l, v) => {
              saveVoice(v);
              setVoice(v);
              if (l !== locale) {
                setBusy(true);
                await saveLocale(l);
                window.location.reload();
                return;
              }
              setOpen(null);
              setSaved('langue');
            }}
          />
        }
      />
    </div>
  );
}

function Block({
  id,
  icon: Icon,
  title,
  view,
  form,
  open,
  saved,
  error,
  onEdit,
  onCancel,
  locked = false,
  blood = false,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  view: ReactNode;
  form: ReactNode;
  open: boolean;
  saved: boolean;
  busy: boolean;
  error: string | null;
  onEdit: () => void;
  onCancel: () => void;
  locked?: boolean;
  blood?: boolean;
}) {
  const t = useT();
  const hid = `${id}-titre`;
  return (
    <section id={id} aria-labelledby={hid} className="card scroll-mt-24 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${blood ? 'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]' : 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)] dark:bg-[#16302a] dark:text-[var(--fg)]'}`}>
          <Icon size={22} aria-hidden />
        </span>
        <h2 id={hid} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-base font-medium text-[var(--fg-muted)]">
          {title}
          {saved && (
            <span role="status" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-leaf)]">
              <CheckCircle2 size={16} aria-hidden /> {t('Enregistré')}
            </span>
          )}
        </h2>
        {!open && !locked && (
          <button type="button" onClick={onEdit} className="btn btn-soft !min-h-11 shrink-0 !px-4 text-base">
            <Pencil size={18} aria-hidden /> {t('Modifier')}
            <span className="sr-only"> : {title}</span>
          </button>
        )}
      </div>
      {!open && <div className="mt-2 pl-14">{view}</div>}
      {locked && !open && <p className="mt-2 pl-14 text-base text-[var(--fg-muted)]">{t('Seul un soignant peut le changer.')}</p>}
      {open && (
        <div className="mt-4 space-y-4">
          {form}
          {error && (
            <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-semibold text-[var(--color-ocre-700)]">
              {error}
            </p>
          )}
          <button type="button" className="btn btn-ghost w-full" onClick={onCancel}>
            {t('Annuler')}
          </button>
        </div>
      )}
    </section>
  );
}

function SaveButton({ busy, disabled }: { busy: boolean; disabled?: boolean }) {
  const t = useT();
  return (
    <button type="submit" className="btn btn-primary w-full !min-h-14 text-lg" disabled={busy || disabled}>
      {busy ? t('Enregistrement…') : t('Enregistrer')}
    </button>
  );
}

function IdentityForm({ profile, busy, onSave }: { profile: Profile; busy: boolean; onSave: (p: ProfilePatch) => void }) {
  const t = useT();
  const uid = useId();
  const p = profile.patient;
  const [first, ...rest] = profile.account.displayName.split(' ');
  const [firstName, setFirstName] = useState(p?.firstName ?? first ?? '');
  const [lastName, setLastName] = useState(p?.lastName ?? rest.join(' '));
  const [birthDate, setBirthDate] = useState(p ? p.birthDate.slice(0, 10) : '');
  const [sex, setSex] = useState<'F' | 'M'>(p?.sex ?? 'F');
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(p ? { firstName: firstName.trim(), lastName: lastName.trim(), birthDate, sex } : { firstName: firstName.trim(), lastName: lastName.trim() });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block" htmlFor={`${uid}-p`}>
          <span className="label mb-1.5 block">{t('Prénom')}</span>
          <input id={`${uid}-p`} className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required maxLength={60} autoComplete="given-name" />
        </label>
        <label className="block" htmlFor={`${uid}-n`}>
          <span className="label mb-1.5 block">{t('Nom')}</span>
          <input id={`${uid}-n`} className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required maxLength={60} autoComplete="family-name" />
        </label>
      </div>
      {p && (
        <>
          <label className="block" htmlFor={`${uid}-d`}>
            <span className="label mb-1.5 block">{t('Date de naissance')}</span>
            <input id={`${uid}-d`} type="date" className="input" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} required />
          </label>
          <SexPicker value={sex} onChange={setSex} />
        </>
      )}
      <SaveButton busy={busy} disabled={!firstName.trim() || !lastName.trim()} />
    </form>
  );
}

function AddressForm({ p, busy, onSave }: { p: NonNullable<Profile['patient']>; busy: boolean; onSave: (patch: ProfilePatch) => void }) {
  const t = useT();
  const uid = useId();
  const [commune, setCommune] = useState(p.commune ?? '');
  const [quartier, setQuartier] = useState(p.quartier);
  const [repere, setRepere] = useState(p.repere);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ commune: commune || null, quartier: quartier.trim(), repere: repere.trim() });
      }}
    >
      <CommuneSelect id={`${uid}-c`} value={commune} onChange={(name) => setCommune(name)} label={t('Commune')} />
      <label className="block" htmlFor={`${uid}-q`}>
        <span className="label mb-1.5 block">{t('Quartier')}</span>
        <input id={`${uid}-q`} className="input" value={quartier} maxLength={80} onChange={(e) => setQuartier(e.target.value)} placeholder={t('Ex. : Zogbadjè')} />
      </label>
      <label className="block" htmlFor={`${uid}-r`}>
        <span className="label mb-1.5 block">{t('Repère')}</span>
        <input id={`${uid}-r`} className="input" value={repere} maxLength={80} onChange={(e) => setRepere(e.target.value)} placeholder={t('Ex. : près de la mosquée')} />
      </label>
      <SaveButton busy={busy} />
    </form>
  );
}

function BloodForm({ value, busy, onSave }: { value: string | null; busy: boolean; onSave: (g: string | null) => void }) {
  const [g, setG] = useState<string | null>(value);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(g);
      }}
    >
      <BloodGroupPicker value={g} onChange={setG} />
      <SaveButton busy={busy} />
    </form>
  );
}

function ListForm({ initial, label, suggestions, placeholder, busy, onSave }: { initial: string[]; label: string; suggestions: string[]; placeholder: string; busy: boolean; onSave: (v: string[]) => void }) {
  const [values, setValues] = useState(initial);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      <TagEditor label={label} values={values} onChange={setValues} suggestions={suggestions} placeholder={placeholder} />
      <SaveButton busy={busy} />
    </form>
  );
}

function ConditionsForm({ conditions, busy, onSave }: { conditions: NonNullable<Profile['patient']>['conditions']; busy: boolean; onSave: (patch: ProfilePatch) => void }) {
  const t = useT();
  const declared = conditions.filter((c) => c.declared);
  const [values, setValues] = useState(declared.map((c) => c.label));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const conditionsRemove = declared.filter((c) => !values.includes(c.label)).map((c) => c.id);
        const conditionsAdd = values.filter((v) => !declared.some((c) => c.label === v));
        onSave({ conditionsAdd, conditionsRemove });
      }}
    >
      <TagEditor
        label={t('Maladies suivies')}
        values={values}
        onChange={setValues}
        suggestions={CONDITION_SUGGESTIONS}
        placeholder={t('Ex. : hypertension')}
        locked={conditions.filter((c) => !c.declared).map((c) => c.label)}
      />
      {conditions.some((c) => !c.declared) && <p className="text-base text-[var(--fg-muted)]">{t('Celles posées par votre soignant restent dans le carnet.')}</p>}
      <SaveButton busy={busy} />
    </form>
  );
}

function TreatmentForm({ initial, busy, onSave }: { initial: string; busy: boolean; onSave: (v: string) => void }) {
  const t = useT();
  const uid = useId();
  const [text, setText] = useState(initial);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(text.trim());
      }}
    >
      <label className="block" htmlFor={uid}>
        <span className="label mb-1.5 block">{t('Médicaments pris chaque jour')}</span>
        <textarea id={uid} className="input min-h-28 py-3" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t('Ex. : Amlodipine 5 mg, 1 le matin')} />
      </label>
      <SaveButton busy={busy} />
    </form>
  );
}

function ContactForm({ name: n0, phone: p0, busy, onSave }: { name: string; phone: string; busy: boolean; onSave: (patch: ProfilePatch) => void }) {
  const [name, setName] = useState(n0);
  const [phone, setPhone] = useState(p0);
  const digits = phone.replace(/\D/g, '');
  const ok = (digits.length === 0 && !name.trim()) || (digits.length >= 8 && name.trim().length > 0);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ emergencyName: name.trim(), emergencyPhone: phone.replace(/[\s.-]/g, '') });
      }}
    >
      <ContactFields name={name} phone={phone} setName={setName} setPhone={setPhone} />
      <SaveButton busy={busy} disabled={!ok} />
    </form>
  );
}

function LanguageForm({ lang, voice, busy, onSave }: { lang: Locale; voice: string; busy: boolean; onSave: (l: Locale, v: string) => void }) {
  const uid = useId();
  const [l, setL] = useState(lang);
  const [v, setV] = useState(voice);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(l, v);
      }}
    >
      <LanguagePicker value={l} onChange={setL} />
      <VoicePicker id={`${uid}-v`} value={v} onChange={setV} />
      <SaveButton busy={busy} />
    </form>
  );
}
