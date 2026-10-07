import { Banknote, Bike, MapPin, MessageSquareText, Phone, ShieldAlert, ShieldCheck, Smartphone, Store } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fcfa, fmtDate, fmtPhone, relative } from '@/lib/format';
import { AutoRefresh } from '../../app/_components/AutoRefresh';
import { orderStatusLabel } from '../../app/(espace)/commandes/_lib/status';
import { OrderActions } from './OrderActions';
import type { PharmacyOrder, PharmacyOrders as Data } from './types';

const ACTIVE = ['ACCEPTEE', 'PRETE', 'EN_LIVRAISON'];
const TONE: Record<string, string> = {
  RECUE: 'bg-[var(--color-leaf)] text-[var(--color-ink)]',
  ACCEPTEE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  PRETE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  EN_LIVRAISON: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  REFUSEE: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  ECHEC: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
};
const MUTED = 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]';

/**
 * Commandes reçues par l'officine : les nouvelles d'abord (à accepter ou refuser), puis celles en
 * préparation ou en route, puis les terminées. Actualisation automatique toutes les 10 s.
 */
export async function PharmacyOrders({ data }: { data: Data | null }) {
  const t = await getT();
  const locale = await getLocale();
  const orders = data?.orders ?? [];
  const fresh = orders.filter((o) => o.status === 'RECUE');
  const inProgress = orders.filter((o) => ACTIVE.includes(o.status));
  const done = orders.filter((o) => o.status !== 'RECUE' && !ACTIVE.includes(o.status));

  return (
    <section id="commandes" aria-label={t('Commandes')} className="scroll-mt-24 space-y-4">
      <AutoRefresh seconds={10} />
      {(fresh.length > 0 || inProgress.length > 0) && (
        <p className="flex flex-wrap items-center gap-2" role="status">
          {fresh.length > 0 && (
            <span className="pill bg-[var(--color-leaf)] text-base text-[var(--color-ink)]">
              {fresh.length > 1 ? t('{n} nouvelles', { n: fresh.length }) : t('{n} nouvelle', { n: fresh.length })}
            </span>
          )}
          {inProgress.length > 0 && <span className="pill bg-[var(--card)] text-base">{t('{n} en cours', { n: inProgress.length })}</span>}
        </p>
      )}

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
            <h2 className="text-lg font-bold text-[var(--fg-muted)]">{t('En préparation ou en route')}</h2>
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
                  <span className="num ml-auto whitespace-nowrap">{fcfa(o.totalFcfa, locale)}</span>
                  <span className={`pill ${TONE[o.status] ?? MUTED}`}>{t(orderStatusLabel(o.status, o.mode))}</span>
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

/** Carte d'une commande : l'essentiel en tête (référence, mode, total, statut), le détail dans un bloc compact. */
function OrderCard({ o, t, locale }: { o: PharmacyOrder; t: T; locale: Locale }) {
  const isNew = o.status === 'RECUE';
  const paid = o.paymentStatus === 'PAYE';
  const Mode = o.mode === 'LIVRAISON' ? Bike : Store;
  return (
    <article aria-labelledby={`cmd-${o.id}`} className={`card space-y-3 p-4 sm:p-5 ${isNew ? 'ring-2 ring-[var(--color-leaf)]' : ''}`}>
      <header className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
          <Mode size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`cmd-${o.id}`} className="flex flex-wrap items-baseline gap-x-2 text-lg font-bold">
            <span className="num">{o.ref}</span>
            <span className="text-base font-semibold">{o.patient}</span>
          </h3>
          <p className="text-sm text-[var(--fg-muted)]">
            {o.mode === 'LIVRAISON' ? t('Livraison') : t('Retrait')} · {relative(o.createdAt, locale)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num whitespace-nowrap text-xl font-bold">{fcfa(o.totalFcfa, locale)}</p>
          <span className={`pill mt-1 ${TONE[o.status] ?? MUTED}`}>{t(orderStatusLabel(o.status, o.mode))}</span>
        </div>
      </header>

      <p className="flex flex-wrap gap-1.5">
        {o.prescription ? (
          o.prescription.verified ? (
            <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><ShieldCheck size={16} aria-hidden /> {t('Ordonnance vérifiée')}</span>
          ) : (
            <span className="pill bg-[var(--color-danger-50)] text-[var(--color-danger-800)]"><ShieldAlert size={16} aria-hidden /> {t('Ordonnance non authentique')}</span>
          )
        ) : (
          <span className={`pill ${MUTED}`}>{t('Sans ordonnance')}</span>
        )}
        {paid ? (
          <span className="pill bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
            {o.payment === 'MOBILE_MONEY' ? <Smartphone size={16} aria-hidden /> : <Banknote size={16} aria-hidden />} {t('Payé')}{o.provider ? ` · ${t(o.provider)}` : ''}
          </span>
        ) : o.paymentStatus === 'REMBOURSE' ? (
          <span className={`pill ${MUTED}`}>{t('Remboursé')}</span>
        ) : (
          <span className="pill bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]"><Banknote size={16} aria-hidden /> {t('À encaisser')}</span>
        )}
      </p>

      {/* Détail compact : médicaments à gauche, où et qui à droite (l'un sous l'autre au téléphone). */}
      <div className="grid gap-3 rounded-2xl bg-[var(--bg)] p-3 text-[0.95rem] leading-snug sm:grid-cols-2">
        <ul className="space-y-1" aria-label={t('Médicaments')}>
          {o.items.map((i) => (
            <li key={i.medicationId}>
              <span className="num font-bold">{i.quantity} ×</span> <span className="font-semibold">{i.dci}</span> {i.strength}
            </li>
          ))}
          {o.deliveryFeeFcfa > 0 && <li className="text-[var(--fg-muted)]">{t('dont livraison {fee}', { fee: fcfa(o.deliveryFeeFcfa, locale) })}</li>}
          {o.prescription && <li className="text-[var(--fg-muted)]">{o.prescription.prescriber}</li>}
        </ul>
        <div className="space-y-1">
          {o.mode === 'LIVRAISON' && o.address && (
            <p className="flex items-start gap-2"><MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" /> <span>{o.address}{o.commune ? `, ${o.commune}` : ''}</span></p>
          )}
          <p className="flex items-start gap-2">
            <Phone size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
            <a className="num underline underline-offset-2" href={`tel:${o.phone}`}>{fmtPhone(o.phone)}</a>
          </p>
          {o.instructions && (
            <p className="flex items-start gap-2"><MessageSquareText size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" /> <span className="italic">« {o.instructions} »</span></p>
          )}
          {o.courierName && (
            <p className="flex items-start gap-2">
              <Bike size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
              <span>{o.courierName}{o.courierPhone ? <> · <a className="num underline underline-offset-2" href={`tel:${o.courierPhone}`}>{fmtPhone(o.courierPhone)}</a></> : null}</span>
            </p>
          )}
        </div>
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
