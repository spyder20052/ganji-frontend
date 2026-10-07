'use client';
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import { SCOPE_LABEL } from '../../_lib/labels';

const SCOPES = [
  { key: 'summary', hint: 'Groupe sanguin, allergies, traitement' },
  { key: 'reminders', hint: 'Recevoir mes rappels de rendez-vous' },
  { key: 'timeline', hint: 'Mes consultations et soins' },
  { key: 'blood', hint: 'Être prévenu quand un donneur est trouvé' },
  { key: 'appointments', hint: 'Prendre et suivre mes rendez-vous' },
  { key: 'orders', hint: 'Commander mes médicaments et suivre les livraisons' },
] as const;

/** Suggestions pour « Qui est-ce pour vous ? » (proposées dans la langue de l'écran). */
const RELATIONS = ['mère', 'père', 'époux', 'épouse', 'fils', 'fille', 'frère', 'sœur', 'ami', 'voisin'];

export function AddDelegation() {
  const t = useT();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [scopes, setScopes] = useState<string[]>(['summary', 'reminders']);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const toggle = (k: string) => setScopes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      await api('/me/delegations', { method: 'POST', json: { phone: phone.replace(/\s/g, ''), relation: relation.trim(), scopes } });
      setMsg({ ok: true, text: t('Aidant ajouté. Il reçoit un SMS (sans aucune donnée médicale).') });
      setPhone('');
      setRelation('');
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-3xl bg-[var(--bg)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-lg font-bold">{t('Ajouter un aidant')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold">{t('Son numéro de téléphone')}</span>
          <input className="input num text-lg" inputMode="tel" autoComplete="off" placeholder="01 90 00 00 02" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold">{t('Qui est-ce pour vous ?')}</span>
          <input className="input" list="relations" placeholder={t('mère, fils, voisine…')} value={relation} maxLength={30} onChange={(e) => setRelation(e.target.value)} required minLength={2} />
          <datalist id="relations">
            {RELATIONS.map((r) => <option key={r} value={t(r)} />)}
          </datalist>
        </label>
      </div>
      <fieldset>
        <legend className="mb-2 font-bold">{t('Ce qu’il peut faire')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCOPES.map((s) => (
            <label key={s.key} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
              <input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--color-brand-900)]" checked={scopes.includes(s.key)} onChange={() => toggle(s.key)} />
              <span>
                <span className="block font-bold">{t(SCOPE_LABEL[s.key])}</span>
                <span className="block text-sm text-[var(--fg-muted)]">{t(s.hint)}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{t('Un aidant ne voit jamais vos données très sensibles.')}</p>
      </fieldset>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-2xl p-3 font-bold ${msg.ok ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]' : 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]'}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy || scopes.length === 0 || phone.replace(/\D/g, '').length < 8 || relation.trim().length < 2}>
        <UserPlus size={20} aria-hidden /> {busy ? t('Ajout…') : t('Ajouter cet aidant')}
      </button>
    </form>
  );
}

export function DiscreetToggle({ initial }: { initial: boolean }) {
  const t = useT();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function flip(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ discreetMode: boolean }>('/me/discreet', { method: 'POST', json: { on: next } });
      setOn(r.discreetMode);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('Pas de réseau. Réessayez.'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-lg font-bold">{t('Mode discret')}</span>
          <span className="block text-base text-[var(--fg-muted)]">{t('SMS et notifications neutres (« Vous avez un message Ganji »), sans nom de maladie ni de service.')}</span>
        </span>
        <input type="checkbox" role="switch" className="h-7 w-7 shrink-0 accent-[var(--color-brand-900)]" checked={on} disabled={busy} onChange={(e) => void flip(e.target.checked)} />
      </label>
      <p role="status" className="text-base font-bold">{on ? t('Activé') : t('Désactivé')}</p>
      {error && <p role="alert" className="rounded-2xl bg-[var(--color-ocre-100)] p-3 font-bold text-[var(--color-ocre-700)]">{error}</p>}
    </div>
  );
}
