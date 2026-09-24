import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Connexion' };

export default function ConnexionPage() {
  return (
    <main id="contenu" className="mx-auto max-w-md space-y-6 px-4 py-8">
      <Logo />
      <div>
        <h1 className="text-3xl font-bold">Ouvrir mon carnet</h1>
        <p className="mt-2 text-[var(--fg-muted)]">Sans mot de passe : un code par SMS suffit. Sur votre téléphone, un code PIN protège ensuite le carnet hors ligne.</p>
      </div>
      <LoginForm />
      <p className="text-base">Membre du jury ? <Link href="/demo" className="font-bold underline">Utiliser un compte de démonstration</Link></p>
    </main>
  );
}
