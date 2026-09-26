import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Hourglass, XCircle } from 'lucide-react';
import { GanjiSymbol } from '@/components/GanjiSymbol';
import { ListenButton } from '@/components/ListenButton';
import { Logotype } from '@/components/Logotype';
import { Qr } from '@/components/Qr';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import { fcfa, fmtDate, fmtTime } from '@/lib/format';
import { ErrorNote } from '../../../../_components/ui';
import { load } from '../../../../_lib/load';
import type { PaymentView } from '../../_lib/rights';
import { PrintButton } from './PrintButton';

export async function generateMetadata({ params }: { params: Promise<{ receipt: string }> }): Promise<Metadata> {
  const t = await getT();
  return { title: t('Reçu {receipt}', { receipt: (await params).receipt }) };
}

/** Impression : seul le reçu sort sur la feuille (ni en-tête, ni barre d'onglets, ni boutons). */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #recu, #recu * { visibility: visible !important; }
  #recu { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; }
  body { background: #fff !important; }
}`;

export default async function RecuPage({ params }: { params: Promise<{ receipt: string }> }) {
  const { receipt } = await params;
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const res = await load<PaymentView>(`/me/payments/${encodeURIComponent(receipt)}`);
  const back = (
    <Link href="/app/droits" className="btn btn-ghost">
      <ArrowLeft size={20} aria-hidden /> {t('Mes droits')}
    </Link>
  );
  if (!res.data) {
    return (
      <I18nScope area="droits">
        <div className="space-y-4 pt-2">
          <ErrorNote what={t('Reçu')} error={res.error} />
          {back}
        </div>
      </I18nScope>
    );
  }
  const p = res.data;
  const ok = p.status === 'REUSSI';
  const StatusIcon = ok ? BadgeCheck : p.status === 'EN_COURS' ? Hourglass : XCircle;
  const statusLabel = ok ? t('Payé') : p.status === 'EN_COURS' ? t('En cours') : t('Échoué');
  const when = `${fmtDate(p.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}, ${fmtTime(p.createdAt, locale)}`;
  const listen = t('Reçu {receipt} : {amount} payés le {date} avec {provider}.', { receipt: p.receipt, amount: fcfa(p.amountFcfa, locale), date: when, provider: p.providerLabel });

  return (
    <I18nScope area="droits">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-md space-y-4 pt-2">
        <article id="recu" aria-labelledby="h-recu" className="overflow-hidden rounded-[var(--radius-card)] bg-white text-[#0a1a14] shadow-[var(--shadow-soft)]">
          <header className="flex items-center justify-between gap-3 bg-[#0b3d2c] px-5 py-4 text-white">
            <span className="flex items-center gap-2">
              <GanjiSymbol size={26} color="#5FD08F" />
              <Logotype className="text-[1.3rem] text-white" />
            </span>
            <span className="pill bg-[#5fd08f] text-[#0a1a14]">
              <StatusIcon size={16} aria-hidden /> {statusLabel}
            </span>
          </header>
          <div className="space-y-4 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 id="h-recu" className="text-base font-medium text-[#4b5a52]">{t('Reçu de paiement')}</h1>
                <p className="font-sans text-xl font-semibold tracking-wide">{p.receipt}</p>
              </div>
              <span className="print:hidden">
                <ListenButton text={listen} compact />
              </span>
            </div>
            <p className="display num text-[3rem] font-light leading-none">{fcfa(p.amountFcfa, locale)}</p>
            <p className="text-lg">{p.kind === 'COMMANDE' ? t('Commande de médicaments') : p.label}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-dashed border-[#c9d6cd] pt-4 text-base">
              <dt className="text-[#4b5a52]">{t('Date')}</dt>
              <dd>{when}</dd>
              {p.patient && (
                <>
                  <dt className="text-[#4b5a52]">{t('Patient')}</dt>
                  <dd>{p.patient}</dd>
                </>
              )}
              <dt className="text-[#4b5a52]">{t('Payé avec')}</dt>
              <dd>
                {p.providerLabel}
                {p.phone && <span className="num block font-sans">{p.phone}</span>}
              </dd>
              {p.ref && (
                <>
                  <dt className="text-[#4b5a52]">{t('Référence')}</dt>
                  <dd className="font-sans">{p.ref}</dd>
                </>
              )}
            </dl>
            <div className="flex flex-col items-center gap-2 border-t border-dashed border-[#c9d6cd] pt-4">
              <Qr value={p.receipt} size={168} label={t('QR du reçu {receipt}', { receipt: p.receipt })} />
              <p className="text-sm text-[#4b5a52]">{t('À montrer à la caisse')}</p>
            </div>
            {p.sandbox && <p className="text-center text-sm text-[#4b5a52]">{t('Paiement bac à sable : aucun débit réel.')}</p>}
          </div>
        </article>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          {back}
        </div>
      </div>
    </I18nScope>
  );
}
