'use client';
import { Plus, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { HTML_LANG, LOCALE_NAMES, LOCALES, type Locale } from '@/i18n/translate';
import { BLOOD_GROUPS, VOICES } from '../_lib/profile';

/** Groupe sanguin : huit grosses touches, et « Je ne sais pas » (un soignant le vérifiera). */
export function BloodGroupPicker({ value, onChange }: { value: string | null; onChange: (g: string | null) => void }) {
  const t = useT();
  return (
    <fieldset>
      <legend className="sr-only">{t('Groupe sanguin')}</legend>
      <div className="grid grid-cols-4 gap-2">
        {BLOOD_GROUPS.map((g) => {
          const on = value === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(g)}
              className={`display grid min-h-16 place-items-center rounded-2xl text-[1.6rem] ${on ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]'}`}
            >
              {g}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={`btn mt-2 w-full ${value === null ? 'btn-primary' : 'btn-ghost'}`}
      >
        {t('Je ne sais pas')}
      </button>
    </fieldset>
  );
}

/** Liste courte (allergies, maladies) : étiquettes retirables, saisie libre et suggestions d'un toucher. */
export function TagEditor({
  label,
  values,
  onChange,
  suggestions,
  placeholder,
  locked = [],
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder: string;
  /** Étiquettes affichées mais non retirables (posées par un soignant). */
  locked?: string[];
}) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState('');
  const has = (s: string) => [...values, ...locked].some((v) => v.toLocaleLowerCase() === s.toLocaleLowerCase());
  const add = (raw: string) => {
    const s = raw.replace(/\s+/g, ' ').trim();
    if (s.length < 2 || has(s)) return;
    onChange([...values, s.charAt(0).toLocaleUpperCase() + s.slice(1)]);
    setDraft('');
  };
  const free = suggestions.map((s) => t(s)).filter((s) => !has(s));
  return (
    <div className="space-y-3">
      {(values.length > 0 || locked.length > 0) && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {locked.map((v) => (
            <li key={`l-${v}`} className="pill min-h-11 bg-[var(--color-ocre-100)] !text-base text-[var(--color-ocre-700)]">
              {v}
            </li>
          ))}
          {values.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="pill min-h-11 bg-[var(--color-ocre-100)] !pr-2 !text-base text-[var(--color-ocre-700)]"
                aria-label={t('Retirer {x}', { x: v })}
              >
                {v} <X size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          className="input min-w-0 flex-1"
          value={draft}
          maxLength={60}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
        />
        <button type="button" className="btn btn-soft shrink-0 !px-4" onClick={() => add(draft)} disabled={draft.trim().length < 2} aria-label={t('Ajouter')}>
          <Plus size={22} aria-hidden />
        </button>
      </div>
      {free.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={t('Suggestions')}>
          {free.map((s) => (
            <li key={s}>
              <button type="button" onClick={() => add(s)} className="pill min-h-11 border border-dashed border-[var(--border)] bg-[var(--card)] !text-base text-[var(--fg)]">
                <Plus size={16} aria-hidden /> {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Langue : chaque nom écrit dans sa propre langue, pour la reconnaître sans lire celle affichée. */
export function LanguagePicker({ value, onChange }: { value: Locale; onChange: (l: Locale) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Langue · Language">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={HTML_LANG[l]}
          aria-pressed={value === l}
          onClick={() => onChange(l)}
          className={`btn !min-h-14 text-lg ${value === l ? 'btn-primary' : 'btn-ghost'}`}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

export function VoicePicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const t = useT();
  return (
    <label htmlFor={id} className="block">
      <span className="label mb-1.5 block">{t('Langue de la voix')}</span>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {VOICES.map((v) => (
          <option key={v.value} value={v.value}>
            {v.value ? v.label : t(v.label)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SexPicker({ value, onChange }: { value: 'F' | 'M'; onChange: (s: 'F' | 'M') => void }) {
  const t = useT();
  return (
    <fieldset>
      <legend className="label mb-1.5">{t('Sexe')}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(['F', 'M'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)} className={`btn !min-h-14 text-lg ${value === s ? 'btn-primary' : 'btn-ghost'}`}>
            {s === 'F' ? t('Femme') : t('Homme')}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ContactFields({ name, phone, setName, setPhone }: { name: string; phone: string; setName: (v: string) => void; setPhone: (v: string) => void }) {
  const t = useT();
  const uid = useId();
  return (
    <div className="space-y-3">
      <label className="block" htmlFor={`${uid}-n`}>
        <span className="label mb-1.5 block">{t('Son nom')}</span>
        <input id={`${uid}-n`} className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t('Ex. : Afiavi (mère)')} autoComplete="off" />
      </label>
      <label className="block" htmlFor={`${uid}-t`}>
        <span className="label mb-1.5 block">{t('Son téléphone')}</span>
        <input id={`${uid}-t`} className="input num text-xl tracking-wider" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01 90 00 00 02" autoComplete="off" />
      </label>
    </div>
  );
}
