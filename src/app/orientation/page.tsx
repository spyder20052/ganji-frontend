import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { Triage } from './Triage';

export const metadata: Metadata = {
  title: "J'ai un symptôme",
  description: 'Où aller : maison, pharmacie, centre de santé ou urgence ? Orientation anonyme par pictogrammes, sans compte.',
};

export default function OrientationPage() {
  return (
    <>
      <TopBar />
      <main id="contenu" className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <Triage />
      </main>
    </>
  );
}
