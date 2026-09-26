'use client';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { BLOOD_GROUPS } from '../../_lib/labels';
import { ErrorNote, OkNote } from '../../_lib/ui';

/**
 * Groupe sanguin et allergies vérifiés par le soignant (source « vérifié ») : la personne ne peut plus
 * remplacer ce groupe par une simple déclaration depuis son téléphone.
 */
export function VitalsVerify({ patientId, bloodGroup, source, allergies }: { patientId: string; bloodGroup: string | null; source: string | null | undefined; allergies: string[] }) {
  const t = useT();
  const router = useRouter();
  const uid = useId();
  const [group, setGroup] = useState(bloodGroup ?? '');
  const [list, setList] = useState(allergies.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const nextAllergies = list.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
      await api(`/patients/${patientId}/vitals`, {
        method: 'PATCH',
        json: { ...(group ? { bloodGroup: group } : {}), allergies: nextAllergies },
      });
      setOk(t('Enregistré. Le patient voit « vérifié par un soignant ».'));
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? t(e.message) : t('Enregistrement impossible. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="card group p-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3">
        <ShieldCheck size={22} aria-hidden className="shrink-0 text-[var(--color-brand-700)] dark:text-[var(--color-leaf)]" />
        <span className="flex-1 text-lg font-bold">{t('Vérifier le groupe sanguin et les allergies')}</span>
        <span className="pill bg-[var(--bg)] text-[var(--fg-muted)]">
          {source === 'VERIFIE' ? t('Groupe vérifié') : bloodGroup ? t('Groupe déclaré par le patient') : t('Groupe inconnu')}
        </span>
      </summary>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset>
          <legend className="label mb-2">{t('Groupe sanguin (carte de groupe ou résultat de laboratoire)')}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {BLOOD_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className={`num min-h-12 rounded-xl text-lg font-bold ${group === g ? 'bg-[var(--color-danger-600)] text-white' : 'bg-[var(--color-danger-50)] text-[var(--color-danger-800)]'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor={`${uid}-a`} className="block">
          <span className="label mb-1 block">{t('Allergies (séparées par des virgules)')}</span>
          <input id={`${uid}-a`} className="input" value={list} onChange={(e) => setList(e.target.value)} placeholder={t('Ex. : pénicilline, arachide')} />
        </label>
        <ErrorNote>{error}</ErrorNote>
        <OkNote>{ok}</OkNote>
        <button type="submit" className="btn btn-primary" disabled={busy || !group}>
          {busy ? t('Enregistrement…') : t('Enregistrer comme vérifié')}
        </button>
      </form>
    </details>
  );
}
