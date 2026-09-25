import type { Metadata } from 'next';
import { RelayHome } from './RelayHome';

export const metadata: Metadata = { title: 'Signaler en 3 gestes' };

export default function RelaisPage() {
  return (
    <main id="contenu" className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6 *:max-w-3xl">
      <RelayHome />
    </main>
  );
}
