import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Receipt } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import { fcfa, fmtDate } from '@/lib/format';
import { Empty, ErrorNote, PageHead, Section } from '../../_components/ui';
import { getMe, load } from '../../_lib/load';
import { CostEstimator } from './CostEstimator';
import { CoverageCard } from './CoverageCard';
import type { CoverageView, PaymentView, Tariff } from './_lib/rights';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Mes droits') };
}

export default async function DroitsPage() {
  const [me, t, locale] = await Promise.all([getMe(), getT(), getLocale()]);
  const listen = t(
    'Ici : votre couverture santé, le prix de vos soins et ce qui reste à payer. Touchez les soins prévus et ajoutez vos médicaments. Vous pouvez payer le reste avec votre téléphone, et garder le reçu.',
  );

  if (!me.patientId) {
    return (
      <I18nScope area="droits">
        <PageHead icon="shield" title={t('Mes droits')} listen={listen} audioKey="app.droits" />
        <Empty>{t('Les droits se consultent depuis le compte de la personne soignée.')}</Empty>
      </I18nScope>
    );
  }

  const [coverage, tariffs, payments] = await Promise.all([load<CoverageView>('/me/coverage'), load<Tariff[]>('/rights/tariffs'), load<PaymentView[]>('/me/payments')]);

  return (
    <I18nScope area="droits">
      <PageHead icon="shield" title={t('Mes droits')} intro={t('Couverture santé, prix des soins et paiement.')} listen={listen} audioKey="app.droits" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-5">
          {coverage.data ? <CoverageCard initial={coverage.data} /> : <ErrorNote what={t('Ma couverture santé')} error={coverage.error!} />}

          <Section id="h-cout" title={t('Combien vais-je payer ?')} icon="care">
            {tariffs.data && coverage.data ? (
              <CostEstimator tariffs={tariffs.data} coverage={coverage.data} phone={me.phone} />
            ) : (
              <ErrorNote error={tariffs.error ?? coverage.error ?? 'Une erreur est survenue. Réessayez.'} />
            )}
            <p className="mt-4 text-sm text-[var(--fg-muted)]">{t('Tarifs indicatifs des hôpitaux publics. Le prix exact est donné à la caisse.')}</p>
          </Section>
        </div>

        <Section id="h-paiements" title={t('Mes paiements')} icon="check">
          {payments.error ? (
            <ErrorNote error={payments.error} />
          ) : payments.data!.length === 0 ? (
            <Empty>{t('Aucun paiement pour le moment.')}</Empty>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {payments.data!.map((p) => (
                <li key={p.id}>
                  <Link href={`/app/droits/recu/${p.receipt}`} className="flex min-h-16 items-center gap-3 py-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
                      <Receipt size={20} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="num block text-lg font-semibold">{fcfa(p.amountFcfa, locale)}</span>
                      <span className="block truncate text-base text-[var(--fg-muted)]">
                        {fmtDate(p.createdAt, { day: 'numeric', month: 'short' }, locale)} · {p.kind === 'COMMANDE' ? t('Commande') : p.label}
                      </span>
                    </span>
                    <ChevronRight size={20} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </I18nScope>
  );
}
