import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Search } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { Pictogram } from '@/components/Pictogram';
import { Qr } from '@/components/Qr';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import type { Locale, T } from '@/i18n/translate';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { Empty, ErrorNote, PageHead } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';

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
  const res = me.patientId ? await load<Rx[]>('/prescriptions/mine') : null;
  const list = res?.data ?? [];
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
