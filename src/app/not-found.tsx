import type { Metadata } from 'next';
import './(ganji)/globals.css';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Page introuvable') };
}

/** Adresse inconnue ou dossier qui n'existe pas : une issue claire plutôt qu'un écran vide. */
export default async function NotFound() {
  const t = await getT();
  return (
    <main id="contenu" className="mx-auto max-w-md space-y-6 px-4 py-10">
      <Logo />
      <div className="card space-y-4 p-6">
        <h1 className="text-2xl font-bold">{t('Page introuvable')}</h1>
        <p className="text-[var(--fg-muted)]">{t('Cette adresse ne mène nulle part : le lien est peut-être ancien, ou le dossier n’existe plus.')}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">{t('Retour à l’accueil')}</Link>
          <Link href="/urgence" className="btn btn-danger">{t('Urgence')}</Link>
        </div>
      </div>
    </main>
  );
}
