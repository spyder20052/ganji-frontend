'use client';
import { ChevronRight, Droplet, Languages, MapPin, Phone, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { CommuneSelect } from '@/components/CommuneSelect';
import { useLocale, useT } from '@/i18n/client';
import type { Locale } from '@/i18n/translate';
import { api, ApiError } from '@/lib/api';
import { BloodGroupPicker, ContactFields, LanguagePicker, SexPicker, TagEditor, VoicePicker } from '../_components/ProfileFields';
import { StepShell } from '../_components/StepShell';
import { ALLERGY_SUGGESTIONS, readVoice, saveLocale, saveProfile, saveVoice, type Profile, type ProfilePatch } from '../_lib/profile';

type Step = 'qui' | 'ou' | 'sang' | 'contact' | 'langue';
const STEPS: Step[] = ['qui', 'ou', 'sang', 'contact', 'langue'];

/**
 * Accueil après inscription : qui vous êtes, où vous habitez, votre sang, qui prévenir, votre langue.
 * Chaque étape se passe ; ce qui est rempli remplit aussi la carte d'urgence.
 */
export function Welcome({ profile, suite }: { profile: Profile; suite: string }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const uid = useId();
  const p = profile.patient;
  const steps = p ? STEPS : (['qui', 'langue'] as Step[]);
  const [i, setI] = useState(0);
  const step = steps[i];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [first, ...rest] = profile.account.displayName.split(' ');
  const [firstName, setFirstName] = useState(p?.firstName ?? first ?? '');
  const [lastName, setLastName] = useState(p?.lastName ?? rest.join(' '));
  const [birthDate, setBirthDate] = useState(p ? p.birthDate.slice(0, 10) : '');
  const [sex, setSex] = useState<'F' | 'M'>(p?.sex ?? 'F');
  const [commune, setCommune] = useState(p?.commune ?? '');
  const [quartier, setQuartier] = useState(p?.quartier ?? '');
  const [repere, setRepere] = useState(p?.repere ?? '');
  // undefined : pas encore répondu ; null : « Je ne sais pas ».
  const [blood, setBlood] = useState<string | null | undefined>(p?.bloodGroup ?? undefined);
  const [allergies, setAllergies] = useState<string[]>(p?.allergies ?? []);
  const [contactName, setContactName] = useState(p?.emergencyName ?? '');
  const [contactPhone, setContactPhone] = useState(p?.emergencyPhone ?? '');
  const [lang, setLang] = useState<Locale>(locale);
  const [voice, setVoice] = useState('');
  useEffect(() => setVoice(readVoice()), []);

  const verified = p?.bloodGroupSource === 'VERIFIE';

  /** Ce que l'étape enregistre (rien si la personne n'a rien changé). */
  function patchFor(s: Step): ProfilePatch | null {
    if (s === 'qui') {
      if (!firstName.trim() || !lastName.trim()) return null;
      const same = p && firstName.trim() === p.firstName && lastName.trim() === p.lastName && birthDate === p.birthDate.slice(0, 10) && sex === p.sex;
      if (same) return null;
      return p ? { firstName: firstName.trim(), lastName: lastName.trim(), birthDate, sex } : { firstName: firstName.trim(), lastName: lastName.trim() };
    }
    if (!p) return null;
    if (s === 'ou') {
      if ((commune || null) === p.commune && quartier.trim() === p.quartier && repere.trim() === p.repere) return null;
      return { commune: commune || null, quartier: quartier.trim(), repere: repere.trim() };
    }
    if (s === 'sang') {
      const patch: ProfilePatch = {};
      if (!verified && blood !== undefined && blood !== p.bloodGroup) patch.bloodGroup = blood;
      if (allergies.join('|') !== p.allergies.join('|')) patch.allergies = allergies;
      return Object.keys(patch).length ? patch : null;
    }
    if (s === 'contact') {
      const phone = contactPhone.replace(/[\s.-]/g, '');
      if (!phone && !contactName.trim()) return null;
      if (contactName.trim() === p.emergencyName && phone === p.emergencyPhone) return null;
      return { emergencyName: contactName.trim(), emergencyPhone: phone };
    }
    return null;
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      saveVoice(voice);
      await api('/me/profile/done', { method: 'POST' });
      if (lang !== locale) {
        await saveLocale(lang);
        window.location.assign(suite);
        return;
      }
      router.push(suite);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Réessayez.'));
      setBusy(false);
    }
  }

  async function forward(save: boolean) {
    setError(null);
    const patch = save ? patchFor(step) : null;
    if (patch) {
      setBusy(true);
      try {
        await saveProfile(patch);
      } catch (e) {
        setError(e instanceof ApiError ? t(e.message) : t('Pas de réseau. Rien n’a été enregistré. Réessayez.'));
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    if (i === steps.length - 1) return finish();
    setI(i + 1);
  }

  const contactDigits = contactPhone.replace(/\D/g, '');
  const contactInvalid = contactDigits.length > 0 && (contactDigits.length < 8 || !contactName.trim());
  const last = i === steps.length - 1;

  const footer = (
    <>
      {error && (
        <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-semibold text-[var(--color-ocre-700)]">
          {error}
        </p>
      )}
      <button type="button" className="btn btn-primary w-full !min-h-16 text-xl" disabled={busy || (step === 'contact' && contactInvalid)} onClick={() => void forward(true)}>
        {busy ? t('Enregistrement…') : last ? t('Terminer') : t('Suivant')} {!busy && !last && <ChevronRight size={24} aria-hidden />}
      </button>
      {!last && (
        <button type="button" className="btn btn-ghost w-full" disabled={busy} onClick={() => void forward(false)}>
          {t('Passer')}
        </button>
      )}
    </>
  );
  const common = { step: i, total: steps.length, footer, onBack: i > 0 ? () => setI(i - 1) : undefined, backLabel: t('Étape précédente') };

  if (step === 'qui') {
    return (
      <StepShell
        {...common}
        title={t('Bienvenue {prenom}', { prenom: firstName || first || '' })}
        icon={<UserRound size={26} aria-hidden />}
        listen={t('Bienvenue sur Ganji. Cinq questions courtes pour remplir votre carnet et votre carte d’urgence. Vous pouvez passer chaque question. D’abord : votre nom est-il juste ?')}
      >
        <div className="card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block" htmlFor={`${uid}-p`}>
              <span className="label mb-1.5 block">{t('Prénom')}</span>
              <input id={`${uid}-p`} className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" />
            </label>
            <label className="block" htmlFor={`${uid}-n`}>
              <span className="label mb-1.5 block">{t('Nom')}</span>
              <input id={`${uid}-n`} className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} autoComplete="family-name" />
            </label>
          </div>
          {p && (
            <>
              <label className="block" htmlFor={`${uid}-d`}>
                <span className="label mb-1.5 block">{t('Date de naissance')}</span>
                <input id={`${uid}-d`} type="date" className="input" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} />
              </label>
              <SexPicker value={sex} onChange={setSex} />
            </>
          )}
        </div>
      </StepShell>
    );
  }

  if (step === 'ou') {
    return (
      <StepShell {...common} title={t('Où habitez-vous ?')} icon={<MapPin size={26} aria-hidden />} listen={t('Où habitez-vous ? Votre commune sert à trouver les soins et les pharmacies près de chez vous. Le quartier et un repère aident le relais et le livreur.')}>
        <div className="card space-y-3 p-4">
          <CommuneSelect id={`${uid}-c`} value={commune} onChange={(name) => setCommune(name)} label={t('Commune')} />
          <label className="block" htmlFor={`${uid}-q`}>
            <span className="label mb-1.5 block">{t('Quartier')}</span>
            <input id={`${uid}-q`} className="input" value={quartier} maxLength={80} onChange={(e) => setQuartier(e.target.value)} placeholder={t('Ex. : Zogbadjè')} />
          </label>
          <label className="block" htmlFor={`${uid}-r`}>
            <span className="label mb-1.5 block">{t('Repère')}</span>
            <input id={`${uid}-r`} className="input" value={repere} maxLength={80} onChange={(e) => setRepere(e.target.value)} placeholder={t('Ex. : près de la mosquée')} />
          </label>
        </div>
      </StepShell>
    );
  }

  if (step === 'sang') {
    return (
      <StepShell
        {...common}
        title={t('Votre sang')}
        icon={<Droplet size={26} aria-hidden className="text-[var(--color-danger-600)]" />}
        listen={t('Quel est votre groupe sanguin ? Si vous ne savez pas, touchez « Je ne sais pas » : un soignant le vérifiera. Ensuite, vos allergies : touchez une suggestion ou écrivez-la.')}
      >
        <section aria-labelledby={`${uid}-g`} className="card space-y-3 p-4">
          <h2 id={`${uid}-g`} className="text-lg font-semibold">
            {t('Groupe sanguin')}
          </h2>
          {verified ? (
            <p className="text-lg">
              <span className="display mr-2 text-[2rem] text-[var(--color-danger-800)]">{p?.bloodGroup}</span>
              {t('Vérifié par un soignant')}
            </p>
          ) : (
            <BloodGroupPicker value={blood === undefined ? '' : blood} onChange={setBlood} />
          )}
        </section>
        <section aria-labelledby={`${uid}-a`} className="card space-y-3 p-4">
          <h2 id={`${uid}-a`} className="text-lg font-semibold">
            {t('Allergies')}
          </h2>
          <TagEditor label={t('Allergies')} values={allergies} onChange={setAllergies} suggestions={ALLERGY_SUGGESTIONS} placeholder={t('Ex. : pénicilline')} />
          {allergies.length === 0 && <p className="text-base text-[var(--fg-muted)]">{t('Aucune ? Touchez simplement « Suivant ».')}</p>}
        </section>
      </StepShell>
    );
  }

  if (step === 'contact') {
    return (
      <StepShell {...common} title={t('Qui prévenir ?')} icon={<Phone size={26} aria-hidden />} listen={t('Qui prévenir en cas d’urgence ? Un proche, pas vous. Il reçoit un SMS si vous touchez le bouton SOS, et son numéro figure sur votre carte d’urgence.')}>
        <div className="card space-y-3 p-4">
          <ContactFields name={contactName} phone={contactPhone} setName={setContactName} setPhone={setContactPhone} />
          {contactInvalid && <p className="text-base text-[var(--color-ocre-700)]">{t('Indiquez son nom et un numéro à 10 chiffres.')}</p>}
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell {...common} title={t('Votre langue')} icon={<Languages size={26} aria-hidden />} listen={t('Dans quelle langue voulez-vous lire Ganji et recevoir vos SMS ? Vous pouvez aussi choisir la langue de la voix.')}>
      <div className="card space-y-4 p-4">
        <LanguagePicker value={lang} onChange={setLang} />
        <VoicePicker id={`${uid}-v`} value={voice} onChange={setVoice} />
      </div>
    </StepShell>
  );
}
