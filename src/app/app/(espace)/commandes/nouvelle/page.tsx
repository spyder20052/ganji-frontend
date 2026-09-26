import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { Empty, ErrorNote, Notice, PageHead } from '../../../_components/ui';
import { getMe, load } from '../../../_lib/load';
import type { OrderMode, OrderOptions } from '../_lib/orders';
import { OrderFlow } from './OrderFlow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Commander') };
}

type Search = Record<string, string | string[] | undefined>;
const one = (sp: Search, k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Nouvelle commande : depuis une ordonnance (?rx=…&mode=LIVRAISON|RETRAIT) ou depuis la recherche
 * publique (?med=…&pharmacy=…). Un aidant choisit d'abord pour qui il commande (?pour=…).
 */
export default async function NouvelleCommandePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = await getT();
  const me = await getMe();
  const rx = one(sp, 'rx');
  const med = one(sp, 'med');
  const pharmacy = one(sp, 'pharmacy');
  const modeParam = one(sp, 'mode');
  const mode: OrderMode | undefined = modeParam === 'LIVRAISON' || modeParam === 'RETRAIT' ? modeParam : undefined;
  const qty = Math.min(10, Math.max(1, Number(one(sp, 'qty')) || 1));

  const head = <PageHead icon="pill" title={t('Commander')} />;
  if ((!rx || !UUID.test(rx)) && (!med || !UUID.test(med))) {
    return (
      <>
        {head}
        <Empty>{t('Choisissez d’abord une ordonnance ou un médicament.')}</Empty>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/medicaments" className="btn btn-primary">{t('Mes ordonnances')}</Link>
          <Link href="/medicaments" className="btn btn-ghost"><Search size={20} aria-hidden /> {t('Chercher un médicament')}</Link>
        </div>
      </>
    );
  }

  // Pour qui ? Soi-même ou une personne aidée (l'ordonnance, elle, est toujours à soi).
  const people = [
    ...(me.patientId ? [{ id: me.patientId, name: t('Pour moi') }] : []),
    ...me.delegations.map((d) => ({ id: d.patient.id, name: t('Pour {name}', { name: d.patient.firstName }) })),
  ];
  let patientId = one(sp, 'pour');
  if (!patientId && (rx || people.length === 1)) patientId = people[0]?.id;
  if (!patientId) {
    const base = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === 'string'));
    return (
      <>
        {head}
        <section aria-labelledby="h-pour" className="card mx-auto max-w-2xl space-y-4 p-5 sm:p-6">
          <h2 id="h-pour" className="text-2xl font-semibold">{t('Pour qui ?')}</h2>
          {people.length === 0 && <Empty>{t('Aucun carnet rattaché à votre compte.')}</Empty>}
          <ul className="space-y-3">
            {people.map((p) => {
              const q = new URLSearchParams(base);
              q.set('pour', p.id);
              return (
                <li key={p.id}>
                  <Link href={`/app/commandes/nouvelle?${q}`} className="flex min-h-16 items-center gap-3 rounded-3xl bg-[var(--bg)] p-4 text-lg font-bold">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-leaf)] text-[var(--color-ink)]"><Pictogram name="adult" size={22} /></span>
                    <span className="flex-1">{p.name}</span>
                    <ChevronRight size={22} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </>
    );
  }

  const q = new URLSearchParams();
  if (rx) q.set('rx', rx);
  else if (med) {
    q.set('med', med);
    q.set('qty', String(qty));
  }
  if (patientId !== me.patientId) q.set('patientId', patientId);
  const res = await load<OrderOptions>(`/me/orders/options?${q}`);
  if (!res.data) {
    return (
      <>
        {head}
        <ErrorNote error={res.error} />
        <Link href="/app/commandes" className="btn btn-ghost">{t('Mes commandes')}</Link>
      </>
    );
  }
  const o = res.data;

  if (o.activeOrderId) {
    return (
      <>
        {head}
        <Notice tone="info" title={t('Déjà commandée')}>{t('Cette ordonnance a une commande en cours.')}</Notice>
        <Link href={`/app/commandes/${o.activeOrderId}`} className="btn btn-primary">{t('Suivre ma commande')}</Link>
      </>
    );
  }
  if (o.blocked) {
    return (
      <>
        {head}
        <Notice tone="warn" title={t('Ordonnance obligatoire')}>{t(o.blocked)}</Notice>
        <Link href="/app/medicaments" className="btn btn-primary">{t('Mes ordonnances')}</Link>
      </>
    );
  }
  if (o.pharmacies.length === 0) {
    return (
      <>
        {head}
        <Empty>{t('Aucune pharmacie n’a tout en stock pour le moment. Réessayez plus tard ou demandez à votre pharmacien.')}</Empty>
        <Link href="/medicaments" className="btn btn-ghost"><Search size={20} aria-hidden /> {t('Chercher un médicament')}</Link>
      </>
    );
  }

  return (
    <I18nScope area="livraison">
      <OrderFlow options={o} initialMode={mode} initialPharmacyId={pharmacy} />
    </I18nScope>
  );
}
