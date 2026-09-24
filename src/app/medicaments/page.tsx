import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { ListenButton } from '@/components/ListenButton';
import { TopBar } from '@/components/TopBar';
import { MedicationFinder } from './MedicationFinder';

export const metadata: Metadata = {
  title: 'Trouver un médicament',
  description: 'Quelle pharmacie a mon médicament, à quel prix, et laquelle est de garde ?',
};

export default function MedicamentsPage() {
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">Sans compte</p>
            <h1 className="mt-1 text-3xl font-bold">Trouver un médicament</h1>
            <p className="mt-1 text-[var(--fg-muted)]">Quelle pharmacie l’a, à quel prix, laquelle est de garde.</p>
          </div>
          <ListenButton
            text="Trouver un médicament. Écrivez le nom du médicament, par exemple paracétamol. Alafia vous montre les pharmacies qui l'ont, le prix indicatif, et les pharmacies de garde. Achetez toujours en pharmacie agréée."
            audioKey="meds.intro"
          />
        </div>

        <MedicationFinder />

        <aside className="card flex items-start gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-brand-100)] text-[var(--color-brand-900)]"><ShieldCheck size={26} aria-hidden /></span>
          <div>
            <h2 className="font-bold">Achetez en pharmacie agréée ; méfiez-vous des médicaments de rue.</h2>
            <p className="mt-1 text-base text-[var(--fg-muted)]">
              Les médicaments vendus au marché ou au bord de la route peuvent être faux, périmés ou abîmés par la chaleur. Ils peuvent rendre plus malade.
              Les prix affichés sont indicatifs ; les stocks sont déclarés par les pharmacies.
            </p>
          </div>
        </aside>
      </main>
    </>
  );
}
