import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata = { title: 'Hors ligne' };

export default function Offline() {
  return (
    <main id="contenu" className="mx-auto max-w-md space-y-5 px-4 py-10">
      <Logo />
      <h1 className="text-3xl font-bold">Pas de réseau pour le moment</h1>
      <p>Vos saisies sont gardées sur le téléphone et partiront au retour du réseau. Ce qui reste disponible :</p>
      <div className="grid gap-3">
        <Link href="/app/carte-urgence" className="btn btn-danger">Ma carte d’urgence</Link>
        <Link href="/app/hors-ligne" className="btn btn-primary">Mon carnet (copie protégée par PIN)</Link>
        <Link href="/orientation" className="btn btn-ghost">J’ai un symptôme</Link>
      </div>
      <p className="text-base text-[var(--fg-muted)]">Urgence : sapeurs-pompiers 118. Sans téléphone qui fonctionne, montrez votre carte QR imprimée.</p>
    </main>
  );
}
