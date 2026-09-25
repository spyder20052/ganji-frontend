'use client';
import { Droplet, Minus, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useT } from '@/i18n/client';
import { api, ApiError } from '@/lib/api';
import type { BloodRequestView } from '@/lib/types';
import { BLOOD_GROUPS, BLOOD_PRODUCTS, BLOOD_URGENCY } from '../../_lib/labels';
import type { BloodCreateMemo, StockCheck } from '../../_lib/types';
import { ErrorNote } from '../../_lib/ui';

type Created = BloodRequestView & { stockCheck: StockCheck; autoAlerted: number };

export function BloodRequestForm({ patientId, firstName, bloodGroup }: { patientId: string; firstName: string; bloodGroup: string | null }) {
  const router = useRouter();
  const t = useT();
  const [product, setProduct] = useState<string>('PLAQUETTES');
  const [quantity, setQuantity] = useState(2);
  const [urgency, setUrgency] = useState<string>('URGENTE');
  const [group, setGroup] = useState<string>(bloodGroup ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uid = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!group) return setError(t('Précisez le groupe sanguin du patient.'));
    setBusy(true);
    setError(null);
    try {
      const neededBy = new Date(Date.now() + BLOOD_URGENCY[urgency].hours * 3600_000).toISOString();
      const r = await api<Created>('/blood/requests', { method: 'POST', json: { patientId, product, quantity, urgency, bloodGroup: group, neededBy } });
      try {
        const memo: BloodCreateMemo = { stockCheck: r.stockCheck, autoAlerted: r.autoAlerted };
        sessionStorage.setItem(`blood-${r.id}`, JSON.stringify(memo));
      } catch {
        /* stockage indisponible (navigation privée) : l'écran de suivi s'en passe */
      }
      router.push(`/pro/sang/${r.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? t(err.message) : t('Envoi impossible. Réessayez.'));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="label mb-2">{t('Produit sanguin')}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {BLOOD_PRODUCTS.map((p) => (
            <label
              key={p.value}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--color-ocre-500)] ${product === p.value ? 'border-[var(--color-danger-600)] bg-[var(--color-danger-50)]' : 'border-[var(--border)]'}`}
            >
              <input type="radio" name={`${uid}-product`} value={p.value} checked={product === p.value} onChange={() => setProduct(p.value)} className="mt-1.5 h-4 w-4 accent-[var(--color-danger-600)]" />
              <span>
                <span className="block font-bold">{t(p.label)}</span>
                <span className="block text-sm text-[var(--fg-muted)]">{t(p.hint)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <span id={`${uid}-q`} className="label mb-2 block">
            {t('Quantité (poches)')}
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby={`${uid}-q`}>
            <button type="button" className="chip-round" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label={t('Une poche de moins')} disabled={quantity <= 1}>
              <Minus size={18} aria-hidden />
            </button>
            <output className="num w-10 text-center text-2xl font-bold" aria-live="polite">
              {quantity}
            </output>
            <button type="button" className="chip-round" onClick={() => setQuantity((q) => Math.min(10, q + 1))} aria-label={t('Une poche de plus')} disabled={quantity >= 10}>
              <Plus size={18} aria-hidden />
            </button>
          </div>
        </div>
        <div>
          <label htmlFor={`${uid}-g`} className="label mb-2 block">
            {t('Groupe du receveur')}
          </label>
          <select id={`${uid}-g`} className="input max-w-48" value={group} onChange={(e) => setGroup(e.target.value)} required>
            <option value="">{t('À préciser')}</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          {bloodGroup && <p className="mt-1 text-sm text-[var(--fg-muted)]">{t('Prérempli depuis la fiche vitale de {name}.', { name: firstName })}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="label mb-2">{t('Urgence')}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {Object.entries(BLOOD_URGENCY).map(([k, u]) => (
            <label
              key={k}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--color-ocre-500)] ${urgency === k ? 'border-[var(--fg)] bg-[var(--bg)]' : 'border-[var(--border)]'}`}
            >
              <input type="radio" name={`${uid}-u`} value={k} checked={urgency === k} onChange={() => setUrgency(k)} className="mt-1.5 h-4 w-4" />
              <span>
                <span className="block font-bold">{t(u.label)}</span>
                <span className="block text-sm text-[var(--fg-muted)]">{t(u.hint)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-[var(--fg-muted)]">
        {t('Ganji vérifie d’abord les stocks compatibles à moins de 60 km. S’ils ne suffisent pas, les donneurs compatibles les plus proches sont alertés par application, SMS ou appel vocal.')}
      </p>
      <ErrorNote>{error}</ErrorNote>
      <button type="submit" className="btn btn-danger" disabled={busy}>
        <Droplet size={20} aria-hidden />{' '}
        {busy
          ? t('Envoi…')
          : t(quantity > 1 ? 'Demander {n} poches de {product}' : 'Demander {n} poche de {product}', {
              n: quantity,
              product: t(BLOOD_PRODUCTS.find((p) => p.value === product)?.label.toLowerCase() ?? ''),
            })}
      </button>
    </form>
  );
}
