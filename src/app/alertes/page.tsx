import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { AlertsBoard } from './AlertsBoard';

export const metadata: Metadata = {
  title: 'Alertes sanitaires',
  description: 'Alertes officielles du ministère de la Santé pour votre commune : épidémies, campagnes de vaccination, ruptures.',
};

export default function AlertesPage() {
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6 *:max-w-3xl">
        <AlertsBoard />
      </main>
    </>
  );
}
