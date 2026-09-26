import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ChevronRight, Search, Store, Truck } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { Qr } from '@/components/Qr';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { ACTIVE as ORDER_ACTIVE, STATUS_LABEL as ORDER_STATUS, type Order } from '../commandes/_lib/orders';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mes médicaments') };
}

interface RxItem { medicationId: string; dci: string; form: string; strength: string; dosage: string; duration: string; quantity: number }
interface Rx {
  id: string;
  status: 'ACTIVE' | 'DISPENSED' | 'EXPIRED' | 'CANCELLED';
  statusLabel: string;
  items: RxItem[];
  prescriber: string;
  issuedAt: string;
  expiresAt: string;
  dispensedAt: string | null;
  dispensedByName: string | null;
  qrPayload?: string;
}

const STATUS_STYLE: Record<Rx['status'], string> = {
  ACTIVE: 'bg-[var(--color-brand-100)] text-[var(--color-brand-900)]',
  DISPENSED: 'bg-[var(--bg)] text-[var(--fg-muted)] ring-1 ring-[var(--border)]',
  EXPIRED: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
  CANCELLED: 'bg-[var(--color-ocre-100)] text-[var(--color-ocre-700)]',
};

function spoken(rx: Rx, t: T, locale: Locale) {
  const head = t('Ordonnance du {date}.', { date: fmtDate(rx.issuedAt, { day: 'numeric', month: 'long' }, locale) });
  return `${head} ${rx.items.map((i) => t('{dci} {strength} : {dosage}, pendant {duration}.', { dci: i.dci, strength: i.strength, dosage: i.dosage, duration: i.duration })).join(' ')}`;
}

export default async function MedicamentsPage() {
  const t = await getT();
  const locale = await getLocale();
  const me = await getMe();
  const [res, ordersRes] = me.patientId ? await Promise.all([load<Rx[]>('/prescriptions/mine'), load<Order[]>('/me/orders')]) : [null, null];
  const list = res?.data ?? [];
  // Commande en cours par ordonnance (livraison ou retrait) : on propose de la suivre au lieu d'en passer une autre.
  const orderOf = (rxId: string) => ordersRes?.data?.find((o) => o.prescriptionId === rxId && ORDER_ACTIVE.includes(o.status));
  const active = list.filter((r) => r.status === 'ACTIVE');
  const others = list.filter((r) => r.status !== 'ACTIVE');

  const count = active.length > 1 ? t('Vous avez {n} ordonnances à retirer.', { n: active.length }) : t('Vous avez {n} ordonnance à retirer.', { n: active.length });

  return (
    <I18nScope area="patient2">
      <PageHead
        icon="pill"
        title={t('Mes médicaments')}
        intro={t('Vos ordonnances signées. À la pharmacie, montrez le code : le pharmacien vérifie qu’elle est authentique. Une ordonnance ne sert qu’une fois.')}
        listen={active.length ? `${count} ${active.map((rx) => spoken(rx, t, locale)).join(' ')}` : t('Vous n’avez pas d’ordonnance à retirer en ce moment.')}
        audioKey="app.medicaments"
      >
        <Link href="/medicaments" className="btn btn-soft">
          <Search size={20} aria-hidden /> {t('Qui a mon médicament ?')}
        </Link>
        {me.patientId && (
          <Link href="/app/commandes" className="btn btn-ghost">
            <Truck size={20} aria-hidden /> {t('Mes commandes')}
          </Link>
        )}
      </PageHead>

      {!me.patientId && <Empty>{t('Les ordonnances sont rattachées au carnet du patient.')}</Empty>}
      {res?.error && <ErrorNote error={res.error} />}
      {res?.data && list.length === 0 && <Empty>{t('Aucune ordonnance pour le moment.')}</Empty>}

      {active.length > 0 && (
        <section aria-labelledby="h-actives" className="space-y-4">
          <h2 id="h-actives" className="text-xl font-bold">{t('À retirer en pharmacie')}</h2>
          {active.map((rx) => (
            <article key={rx.id} className="card grid gap-5 p-5 md:grid-cols-[1fr_auto]">
              <RxBody rx={rx} t={t} locale={locale} />
              {rx.qrPayload && (
                <div className="flex flex-col items-center gap-2 rounded-3xl bg-[var(--color-brand-50)] p-4 text-center text-[var(--color-brand-950)]">
                  <Qr value={rx.qrPayload} size={220} label={t('QR de l’ordonnance du {date}, à montrer au pharmacien', { date: fmtDate(rx.issuedAt, undefined, locale) })} />
                  <p className="font-bold">{t('Montrez ce code au pharmacien')}</p>
                  <p className="text-sm">{t('Valable jusqu’au {date}', { date: fmtDate(rx.expiresAt, { day: 'numeric', month: 'long' }, locale) })}</p>
                </div>
              )}
              <RxOrder rxId={rx.id} order={orderOf(rx.id)} t={t} />
            </article>
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="h-anciennes" className="simple-hide space-y-4">
          <h2 id="h-anciennes" className="text-xl font-bold">{t('Ordonnances passées')}</h2>
          {others.map((rx) => (
            <article key={rx.id} className="card space-y-3 p-5">
              <RxBody rx={rx} t={t} locale={locale} />
              {rx.status === 'DISPENSED' && rx.dispensedAt && (
                <p className="flex items-center gap-2 rounded-2xl bg-[var(--bg)] p-3 text-base">
                  <CheckCircle2 size={20} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />
                  {rx.dispensedByName
                    ? t('Délivrée le {date} par {name}.', { date: fmtDateTime(rx.dispensedAt, locale), name: rx.dispensedByName })
                    : t('Délivrée le {date}.', { date: fmtDateTime(rx.dispensedAt, locale) })}
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </I18nScope>
  );
}

function RxBody({ rx, t, locale }: { rx: Rx; t: T; locale: Locale }) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${STATUS_STYLE[rx.status]}`}>{t(rx.statusLabel)}</span>
        <span className="text-base text-[var(--fg-muted)]">
          {rx.prescriber} · {fmtDate(rx.issuedAt, undefined, locale)}
        </span>
      </div>
      <ul className="space-y-2">
        {rx.items.map((i, n) => (
          <li key={`${i.medicationId}-${n}`} className="flex gap-3 rounded-2xl bg-[var(--bg)] p-3">
            <span className="chip-round shrink-0 text-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]"><Pictogram name="pill" size={20} /></span>
            <span className="min-w-0">
              <span className="block text-lg font-bold">
                {i.dci} {i.strength} <span className="text-base font-normal text-[var(--fg-muted)]">· {i.form} · <span className="num">× {i.quantity}</span></span>
              </span>
              <span className="block">{t('{dosage}, pendant {duration}', { dosage: i.dosage, duration: i.duration })}</span>
            </span>
          </li>
        ))}
      </ul>
      <ListenButton text={spoken(rx, t, locale)} label={t('Écouter l’ordonnance')} />
    </div>
  );
}

/** Se faire livrer l'ordonnance, ou la réserver pour la retirer ; si une commande est en cours, la suivre. */
function RxOrder({ rxId, order, t }: { rxId: string; order: Order | undefined; t: T }) {
  if (order) {
    return (
      <Link href={`/app/commandes/${order.id}`} className="flex min-h-14 items-center gap-3 rounded-3xl bg-[var(--color-leaf)] px-5 py-3 font-bold text-[var(--color-ink)] md:col-span-2">
        {order.mode === 'LIVRAISON' ? <Truck size={22} aria-hidden /> : <Store size={22} aria-hidden />}
        <span className="flex-1">{t('Commande en cours : {status}', { status: t(ORDER_STATUS[order.status]) })}</span>
        <span className="flex items-center gap-1">{t('Suivre')} <ChevronRight size={20} aria-hidden /></span>
      </Link>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:col-span-2">
      <Link href={`/app/commandes/nouvelle?rx=${rxId}&mode=LIVRAISON`} className="btn btn-primary !min-h-14 text-lg">
        <Truck size={22} aria-hidden /> {t('Me faire livrer')}
      </Link>
      <Link href={`/app/commandes/nouvelle?rx=${rxId}&mode=RETRAIT`} className="btn btn-soft !min-h-14 text-lg">
        <Store size={22} aria-hidden /> {t('Retirer en pharmacie')}
      </Link>
    </div>
  );
}
