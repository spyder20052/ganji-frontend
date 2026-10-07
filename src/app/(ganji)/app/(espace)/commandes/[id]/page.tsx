import type { Metadata } from 'next';
import Link from 'next/link';
import { Banknote, Bike, Clock, MapPin, Navigation, Phone, RotateCcw, ShieldCheck, Smartphone, Store } from 'lucide-react';
import { Pictogram } from '@/components/Pictogram';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fcfa, fmtDateTime, fmtPhone, fmtTime } from '@/lib/format';
import { directionsUrl } from '@/lib/places';
import { AutoRefresh } from '../../../_components/AutoRefresh';
import { ErrorNote, Notice, PageHead } from '../../../_components/ui';
import { load } from '../../../_lib/load';
import { CancelOrder } from '../_components/CancelOrder';
import { HandoverTicket, OrderSteps, StatusPill } from '../_components/OrderParts';
import { ACTIVE, orderStatusLabel, reorderHref, STATUS_ICON, type Order } from '../_lib/orders';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Ma commande') };
}

/** Phrase d'état, courte : ce qui se passe et ce que la personne doit faire. */
function headline(o: Order, t: T): { title: string; line: string } {
  switch (o.status) {
    case 'RECUE':
      return { title: t('Envoyée à la pharmacie'), line: t('Elle va répondre. Vous recevrez un SMS.') };
    case 'ACCEPTEE':
      return { title: t('En préparation'), line: t('La pharmacie prépare votre commande.') };
    case 'PRETE':
      return o.mode === 'RETRAIT'
        ? { title: t('Prête : venez la chercher'), line: t('Chez {pharmacy}. Donnez le code au comptoir.', { pharmacy: o.pharmacy.name }) }
        : { title: t('Prête'), line: t('Le livreur part bientôt.') };
    case 'EN_LIVRAISON':
      return { title: t('En route'), line: o.courierName ? t('{name} arrive avec votre commande.', { name: o.courierName }) : t('Le livreur arrive.') };
    case 'LIVREE':
      return { title: t('Livrée'), line: t('Commande remise. Merci !') };
    case 'RETIREE':
      return { title: t('Retirée'), line: t('Commande remise. Merci !') };
    case 'REFUSEE':
      return { title: t('Refusée par la pharmacie'), line: o.refusalReason ?? '' };
    case 'ANNULEE':
      return { title: t('Annulée'), line: o.paymentStatus === 'REMBOURSE' ? t('Vous êtes remboursé.') : '' };
    case 'ECHEC':
      return { title: t('Non remise'), line: [o.refusalReason, o.paymentStatus === 'REMBOURSE' ? t('Vous êtes remboursé.') : null].filter(Boolean).join(' · ') };
  }
}

function spoken(o: Order, t: T, locale: Locale) {
  const h = headline(o, t);
  const parts = [t('Commande {ref}.', { ref: o.ref }), `${h.title}.`, h.line];
  if (o.handoverCode) parts.push(t('Votre code de remise est {code}.', { code: o.handoverCode.split('').join(' ') }));
  if (o.status === 'EN_LIVRAISON' && o.courierPhone) parts.push(t('Téléphone du livreur : {phone}.', { phone: fmtPhone(o.courierPhone) }));
  if (o.paymentStatus === 'A_PAYER' && ACTIVE.includes(o.status)) parts.push(t('À payer à la remise : {amount}.', { amount: fcfa(o.totalFcfa, locale) }));
  return parts.filter(Boolean).join(' ');
}

export default async function CommandePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
  const res = await load<Order>(`/me/orders/${id}`);
  if (!res.data) {
    return (
      <>
        <PageHead icon="delivery" title={t('Ma commande')} />
        <ErrorNote error={res.error} />
        <Link href="/app/commandes" className="btn btn-soft">{t('Mes commandes')}</Link>
      </>
    );
  }
  const o = res.data;
  const active = ACTIVE.includes(o.status);
  const h = headline(o, t);
  const Icon = STATUS_ICON[o.status];
  const stopped = o.status === 'REFUSEE' || o.status === 'ANNULEE' || o.status === 'ECHEC';

  return (
    <I18nScope area="livraison">
      {active && <AutoRefresh seconds={6} />}
      <PageHead icon="delivery" title={t('Ma commande')} listen={spoken(o, t, locale)} audioKey="app.commande">
        <span className="num text-base text-[var(--fg-muted)]">{o.ref}</span>
        <StatusPill status={o.status} mode={o.mode} />
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          {/* État : grand pictogramme, une phrase, l'action utile. */}
          <section aria-labelledby="h-etat" className="card space-y-5 p-5 sm:p-6" aria-live="polite">
            <div className="flex items-center gap-4">
              <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${stopped ? 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]' : 'bg-[var(--color-leaf)] text-[var(--color-ink)]'}`}>
                <Icon size={32} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="h-etat" className="text-2xl font-bold">{h.title}</h2>
                {h.line && <p className="text-lg">{h.line}</p>}
              </div>
            </div>

            {!stopped && <OrderSteps order={o} />}

            {o.status === 'EN_LIVRAISON' && o.courierPhone && (
              <a href={`tel:${o.courierPhone}`} className="btn btn-primary w-full !min-h-16 !justify-start !gap-3 py-2 text-left">
                <Phone size={24} aria-hidden className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-lg">{t('Appeler {name}', { name: o.courierName ?? t('le livreur') })}</span>
                  <span className="num block text-base font-normal opacity-90">{fmtPhone(o.courierPhone)}</span>
                </span>
              </a>
            )}
            {o.status === 'PRETE' && o.mode === 'RETRAIT' && o.pharmacy.lat != null && o.pharmacy.lng != null && (
              <a href={directionsUrl({ lat: o.pharmacy.lat, lng: o.pharmacy.lng })} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full !min-h-14 text-lg">
                <Navigation size={22} aria-hidden /> {t('Itinéraire vers la pharmacie')}
              </a>
            )}
            {(o.status === 'REFUSEE' || o.status === 'ECHEC') && (
              <Link href={reorderHref(o)} className="btn btn-primary w-full !min-h-14 text-lg">
                <RotateCcw size={22} aria-hidden /> {t('Commander à nouveau')}
              </Link>
            )}
            {o.canCancel && <CancelOrder id={o.id} paid={o.paymentStatus === 'PAYE'} />}
          </section>

          {o.handoverCode && <HandoverTicket code={o.handoverCode} mode={o.mode} />}
        </div>

        <div className="space-y-5">
          {/* Le reçu : ce qui est commandé, combien, comment c'est payé. */}
          <section aria-labelledby="h-recu" className="card space-y-4 p-5 sm:p-6">
            <h2 id="h-recu" className="flex items-center gap-3 text-xl font-semibold">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><Pictogram name="pill" size={20} /></span>
              {o.itemCount > 1 ? t('{n} médicaments', { n: o.itemCount }) : t('{n} médicament', { n: o.itemCount })}
            </h2>
            {o.prescriptionId && (
              <p className="flex items-center gap-2 text-base text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]">
                <ShieldCheck size={18} aria-hidden /> {t('Ordonnance signée')}
              </p>
            )}
            {o.itemsHidden ? (
              <p className="rounded-2xl bg-[var(--bg)] p-3 text-base text-[var(--fg-muted)]">{t('Le détail n’est pas partagé avec vous.')}</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {o.items.map((i) => (
                  <li key={i.medicationId} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="font-bold">{i.dci}</span> {i.strength}
                      <span className="block text-base text-[var(--fg-muted)]">{i.form} · <span className="num">× {i.quantity}</span></span>
                    </span>
                    <span className="num shrink-0">{fcfa(i.unitPriceFcfa * i.quantity, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
            <dl className="space-y-1.5 border-t border-[var(--border)] pt-3 text-base">
              {!o.itemsHidden && (
                <div className="flex justify-between gap-3"><dt className="text-[var(--fg-muted)]">{t('Médicaments')}</dt><dd className="num">{fcfa(o.subtotalFcfa, locale)}</dd></div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--fg-muted)]">{o.mode === 'LIVRAISON' ? t('Livraison') : t('Retrait')}</dt>
                <dd className="num">{o.deliveryFeeFcfa ? fcfa(o.deliveryFeeFcfa, locale) : t('Gratuit')}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <dt className="text-lg font-bold">{t('Total')}</dt>
                <dd className="display text-3xl">{fcfa(o.totalFcfa, locale)}</dd>
              </div>
            </dl>
            <PaymentLine o={o} t={t} locale={locale} />
          </section>

          <section aria-labelledby="h-ou" className="card space-y-3 p-5 sm:p-6 text-base">
            <h2 id="h-ou" className="sr-only">{t('Où et quand')}</h2>
            <p className="flex items-start gap-3">
              <Store size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
              <span>
                <span className="font-bold">{o.pharmacy.name}</span>
                {o.pharmacy.commune && <span className="text-[var(--fg-muted)]"> · {o.pharmacy.commune}</span>}
              </span>
            </p>
            {o.mode === 'LIVRAISON' && o.address && (
              <p className="flex items-start gap-3">
                <MapPin size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
                <span>{o.address}{o.commune ? `, ${o.commune}` : ''}</span>
              </p>
            )}
            <p className="flex items-start gap-3">
              <Phone size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
              <span className="num">{fmtPhone(o.phone)}</span>
            </p>
            {o.courierName && (
              <p className="flex items-start gap-3">
                <Bike size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--fg-muted)]" />
                <span>{o.courierName}{o.courierPhone ? <> · <a className="num underline" href={`tel:${o.courierPhone}`}>{fmtPhone(o.courierPhone)}</a></> : null}</span>
              </p>
            )}
            <details className="simple-hide">
              <summary className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
                <Clock size={20} aria-hidden className="shrink-0 text-[var(--fg-muted)]" /> {t('Historique')}
              </summary>
              <ol className="mt-1 space-y-1 pl-8">
                {o.events.map((e, n) => (
                  <li key={`${e.status}-${n}`} className="flex justify-between gap-3">
                    <span>{t(orderStatusLabel(e.status, o.mode))}</span>
                    <span className="num text-[var(--fg-muted)]">{n === 0 ? fmtDateTime(e.at, locale) : fmtTime(e.at, locale)}</span>
                  </li>
                ))}
              </ol>
            </details>
          </section>

          {o.status === 'RECUE' && o.payment === 'MOBILE_MONEY' && (
            <Notice tone="info">{t('Si la pharmacie refuse ou ne répond pas en 24 h, vous êtes remboursé.')}</Notice>
          )}
        </div>
      </div>

      <p>
        <Link href="/app/commandes" className="btn btn-ghost">{t('Mes commandes')}</Link>
      </p>
    </I18nScope>
  );
}

function PaymentLine({ o, t, locale }: { o: Order; t: T; locale: Locale }) {
  if (o.paymentStatus === 'PAYE') {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-[var(--color-brand-100)] p-3 text-base text-[var(--color-brand-900)]">
        {o.payment === 'MOBILE_MONEY' ? <Smartphone size={20} aria-hidden className="shrink-0" /> : <Banknote size={20} aria-hidden className="shrink-0" />}
        <span>
          <span className="font-bold">{t('Payé')}</span> · {o.provider ? t(o.provider) : ''}
          {o.receipt && <span className="num whitespace-nowrap"> · {t('reçu {n}', { n: o.receipt })}</span>}
        </span>
      </p>
    );
  }
  if (o.paymentStatus === 'REMBOURSE') {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-[var(--bg)] p-3 text-base">
        <Smartphone size={20} aria-hidden className="shrink-0" /> <span className="font-bold">{t('Remboursé')}</span> · {o.provider}
      </p>
    );
  }
  if (o.status === 'REFUSEE' || o.status === 'ANNULEE' || o.status === 'ECHEC') return null;
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-[var(--color-ocre-100)] p-3 text-base text-[var(--color-ocre-700)]">
      <Banknote size={20} aria-hidden className="shrink-0" />
      <span>{t('En espèces à la remise : {amount}', { amount: fcfa(o.totalFcfa, locale) })}</span>
    </p>
  );
}
