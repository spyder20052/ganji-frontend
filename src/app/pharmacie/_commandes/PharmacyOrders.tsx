import { Banknote, Bike, MapPin, MessageSquareText, Phone, ShieldAlert, ShieldCheck, Smartphone, Store, Truck } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fcfa, fmtDate, fmtPhone, relative } from '@/lib/format';
import { tryServerApi } from '@/lib/server-api';
import { AutoRefresh } from '../../app/_components/AutoRefresh';
import { OrderActions } from './OrderActions';
import { STATUS_LABEL, type PharmacyOrder, type PharmacyOrders as Data } from './types';

const ACTIVE = ['ACCEPTEE', 'PRETE', 'EN_LIVRAISON'];
const TONE: Record<string, string> = {
  RECUE: 'bg-[var(--color-leaf)] text-[var(--color-ink)]',
  ACCEPTEE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  PRETE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  EN_LIVRAISON: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  REFUSEE: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  ECHEC: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
};

/**
 * Commandes reçues par l'officine : les nouvelles d'abord (à accepter ou refuser), puis celles en
 * préparation ou en route, puis les terminées. Actualisation automatique toutes les 10 s.
 */
export async function PharmacyOrders() {
  const t = await getT();
  const locale = await getLocale();
  const data = await tryServerApi<Data>('/pharmacy/orders');
  const orders = data?.orders ?? [];
  const fresh = orders.filter((o) => o.status === 'RECUE');
  const inProgress = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => o.status !== 'RECUE' && !ACTIVE.includes(o.status));

  return (
    <section id="commandes" aria-labelledby="h-commandes" className="scroll-mt-24 space-y-4">
      <AutoRefresh seconds={10} />
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="h-commandes" className="text-2xl font-bold">{t('Commandes')}</h2>
        {fresh.length > 0 && (
          <span className="pill bg-[var(--color-leaf)] text-base text-[var(--color-ink)]" role="status">
            {fresh.length > 1 ? t('{n} nouvelles', { n: fresh.length }) : t('{n} nouvelle', { n: fresh.length })}
          </span>
        )}
        {inProgress.length > 0 && <span className="pill bg-[var(--card)] text-base">{t('{n} en cours', { n: inProgress.length })}</span>}
      </div>

      {!data && <p className="card p-5 text-[var(--fg-muted)]">{t('Commandes indisponibles pour le moment.')}</p>}
      {data && orders.length === 0 && <p className="card p-5 text-[var(--fg-muted)]">{t('Aucune commande pour le moment. Elles arrivent ici, avec une notification.')}</p>}

      <I18nScope area="livraison">
        {fresh.length > 0 && (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {fresh.map((o) => <OrderCard key={o.id} o={o} t={t} locale={locale} />)}
          </div>
        )}
        {inProgress.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-[var(--fg-muted)]">{t('En préparation ou en route')}</h3>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {inProgress.map((o) => <OrderCard key={o.id} o={o} t={t} locale={locale} />)}
            </div>
          </div>
        )}
        {done.length > 0 && (
          <details className="card p-5">
            <summary className="flex min-h-12 cursor-pointer items-center font-bold">{t('Terminées ({n}, 14 derniers jours)', { n: done.length })}</summary>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {done.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-base">
                  <span className="num font-bold">{o.ref}</span>
                  <span>{o.patient}</span>
                  <span className="text-[var(--fg-muted)]">{fmtDate(o.updatedAt, { day: 'numeric', month: 'short' }, locale)}</span>
                  <span className="num ml-auto">{fcfa(o.totalFcfa, locale)}</span>
                  <span className={`pill ${TONE[o.status] ?? 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]'}`}>{t(STATUS_LABEL[o.status])}</span>
                  {o.refusalReason && <span className="basis-full text-[var(--fg-muted)]">« {o.refusalReason} »</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </I18nScope>
    </section>
  );
}

function OrderCard({ o, t, locale }: { o: PharmacyOrder; t: T; locale: Locale }) {
  const isNew = o.status === 'RECUE';
  const paid = o.paymentStatus === 'PAYE';
  return (
    <article aria-labelledby={`cmd-${o.id}`} className={`card space-y-4 p-5 ${isNew ? 'ring-2 ring-[var(--color-leaf)]' : ''}`}>
      <header className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
          {o.mode === 'LIVRAISON' ? <Truck size={24} aria-hidden /> : <Store size={24} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`cmd-${o.id}`} className="text-lg font-bold">
            {o.patient} <span className="num text-base font-normal text-[var(--fg-muted)]">· {o.ref}</span>
          </h3>
          <p className="text-base text-[var(--fg-muted)]">
            {o.mode === 'LIVRAISON' ? t('Livraison') : t('Retrait au comptoir')} · {relative(o.createdAt, locale)}
          </p>
        </div>
        <span className={`pill shrink-0 ${TONE[o.status] ?? ''}`}>{t(STATUS_LABEL[o.status])}</span>
      </header>

      <p className="flex flex-wrap gap-1.5">
        {o.prescription ? (
          o.prescription.verified ? (
            <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><ShieldCheck size={16} aria-hidden /> {t('Ordonnance vérifiée · {who}', { who: o.prescription.prescriber })}</span>
          ) : (
            <span className="pill bg-[var(--color-danger-50)] text-[var(--color-danger-800)]"><ShieldAlert size={16} aria-hidden /> {t('Ordonnance non authentique')}</span>
          )
        ) : (
          <span className="pill bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">{t('Sans ordonnance')}</span>
        )}
        {paid ? (
          <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
            {o.payment === 'MOBILE_MONEY' ? <Smartphone size={16} aria-hidden /> : <Banknote size={16} aria-hidden />} {t('Payé')}{o.provider ? ` · ${t(o.provider)}` : ''}
          </span>
        ) : o.paymentStatus === 'REMBOURSE' ? (
          <span className="pill bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]">{t('Remboursé')}</span>
        ) : (
          <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]"><Banknote size={16} aria-hidden /> {t('À encaisser : {amount}', { amount: fcfa(o.totalFcfa, locale) })}</span>
        )}
      </p>

      <ul className="divide-y divide-[var(--border)] rounded-2xl bg-[var(--bg)] px-4 text-base">
        {o.items.map((i) => (
          <li key={i.medicationId} className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="num font-bold">{i.quantity} ×</span> <span className="font-bold">{i.dci}</span> {i.strength} <span className="text-[var(--fg-muted)]">· {t(i.form)}</span>
            </span>
            <span className="num shrink-0">{fcfa(i.unitPriceFcfa * i.quantity, locale)}</span>
          </li>
        ))}
        {o.deliveryFeeFcfa > 0 && (
          <li className="flex justify-between gap-3 py-2 text-[var(--fg-muted)]"><span>{t('Livraison')}</span><span className="num">{fcfa(o.deliveryFeeFcfa, locale)}</span></li>
        )}
        <li className="flex items-baseline justify-between gap-3 py-2"><span className="font-bold">{t('Total')}</span><span className="num text-xl font-bold">{fcfa(o.totalFcfa, locale)}</span></li>
      </ul>

      <div className="space-y-1.5 text-base">
        {o.mode === 'LIVRAISON' && o.address && (
          <p className="flex items-start gap-2"><MapPin size={18} aria-hidden className="mt-1 shrink-0 text-[var(--fg-muted)]" /> <span>{o.address}{o.commune ? `, ${o.commune}` : ''}</span></p>
        )}
        <p className="flex items-start gap-2">
          <Phone size={18} aria-hidden className="mt-1 shrink-0 text-[var(--fg-muted)]" />
          <a className="num underline underline-offset-2" href={`tel:${o.phone}`}>{fmtPhone(o.phone)}</a>
        </p>
        {o.instructions && (
          <p className="flex items-start gap-2"><MessageSquareText size={18} aria-hidden className="mt-1 shrink-0 text-[var(--fg-muted)]" /> <span className="italic">« {o.instructions} »</span></p>
        )}
        {o.courierName && (
          <p className="flex items-start gap-2">
            <Bike size={18} aria-hidden className="mt-1 shrink-0 text-[var(--fg-muted)]" />
            <span>{o.courierName}{o.courierPhone ? <> · <a className="num underline underline-offset-2" href={`tel:${o.courierPhone}`}>{fmtPhone(o.courierPhone)}</a></> : null}</span>
          </p>
        )}
      </div>

      <OrderActions
        id={o.id}
        status={o.status}
        mode={o.mode}
        next={o.next}
        attemptsLeft={o.codeAttemptsLeft}
        newCodesLeft={o.awaitingCode ? o.newCodesLeft : 0}
        cash={!paid ? o.totalFcfa : null}
      />
    </article>
  );
}
