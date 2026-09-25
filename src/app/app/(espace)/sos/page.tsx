import type { Metadata } from 'next';
import { ChevronRight, Phone, QrCode } from 'lucide-react';
import Link from 'next/link';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { Empty, PageHead } from '../../_components/ui';
import { getMe } from '../../_lib/load';
import { SosButton } from './SosButton';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Urgence') };
}

export default async function SosPage() {
  const t = await getT();
  const me = await getMe();
  return (
    <I18nScope area="patient2">
      <PageHead
        icon="sos"
        danger
        title={t('Urgence')}
        listen={t('Touchez le gros bouton rouge, puis confirmez : vos proches et le relais reçoivent un message avec votre position. Pour une urgence grave, appelez le 118. Pour les secours, montrez votre carte d’urgence.')}
        audioKey="app.sos"
      />
      <section aria-label={t('Bouton SOS')} className="card p-6 sm:p-10">
        {me.patientId ? <SosButton /> : <Empty>{t('L’alerte SOS est rattachée au carnet du patient. En urgence, appelez le 118.')}</Empty>}
      </section>
      <nav aria-label={t('Autres gestes d’urgence')} className="grid gap-3">
        <a href="tel:118" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-[var(--card)] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-danger-50)] text-[var(--color-danger-600)]">
            <Phone size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-[var(--fg-muted)]">{t('Sapeurs-pompiers')}</span>
            <span className="display block text-[2rem]">118</span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </a>
        <Link href="/app/carte-urgence" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-[var(--card)] p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-900)]">
            <QrCode size={22} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold">{t('Ma carte d’urgence')}</span>
            <span className="block text-sm text-[var(--fg-muted)]">{t('À montrer aux secours, même sans réseau')}</span>
          </span>
          <ChevronRight size={20} aria-hidden />
        </Link>
      </nav>
    </I18nScope>
  );
}
