import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { TopBar } from '@/components/TopBar';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { MedicationFinder } from './MedicationFinder';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Trouver un médicament'),
    description: t('Quelle pharmacie a mon médicament, à quel prix, et laquelle est de garde ?'),
  };
}

export default async function MedicamentsPage() {
  const t = await getT();
  return (
    <I18nScope area="public">
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">{t('Sans compte')}</p>
            <h1 className="mt-1 text-3xl font-bold">{t('Trouver un médicament')}</h1>
            <p className="mt-1 text-[var(--fg-muted)]">{t('Quelle pharmacie l’a, à quel prix, laquelle est de garde.')}</p>
          </div>
          <ListenButton
            text={t("Trouver un médicament. Écrivez le nom du médicament, par exemple paracétamol. Ganji vous montre les pharmacies qui l'ont, le prix indicatif, et les pharmacies de garde. Achetez toujours en pharmacie agréée.")}
            audioKey="meds.intro"
          />
        </div>

        <I18nScope area="livraison">
          <MedicationFinder />
        </I18nScope>

        <aside className="card flex items-start gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><ShieldCheck size={26} aria-hidden /></span>
          <div>
            <h2 className="font-bold">{t('Achetez en pharmacie agréée ; méfiez-vous des médicaments de rue.')}</h2>
            <p className="mt-1 text-base text-[var(--fg-muted)]">
              {t('Les médicaments vendus au marché ou au bord de la route peuvent être faux, périmés ou abîmés par la chaleur. Ils peuvent rendre plus malade. Les prix affichés sont indicatifs ; les stocks sont déclarés par les pharmacies.')}
            </p>
          </div>
        </aside>
      </main>
    </I18nScope>
  );
}
