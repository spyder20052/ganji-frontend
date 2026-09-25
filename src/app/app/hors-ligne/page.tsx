import { ArrowLeft, WifiOff } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { OfflinePin } from '../(espace)/aidants/OfflinePin';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t('Mon carnet hors ligne'),
    description: t('Copie du carnet chiffrée sur le téléphone, ouverte par code PIN, même sans réseau.'),
  };
}

/**
 * Carnet hors ligne : hors du layout connecté et sans appel serveur, pour que le service worker
 * puisse garder cette page. Son HTML ne contient aucune donnée : la copie est chiffrée dans le
 * téléphone et ne s'ouvre qu'avec le PIN.
 */
export default async function CarnetHorsLignePage() {
  const t = await getT();
  return (
    <I18nScope area="patient">
      <main id="contenu" className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <Link href="/app" className="btn btn-ghost !min-h-12">
          <ArrowLeft size={20} aria-hidden /> {t('Retour')}
        </Link>
        <header className="space-y-2">
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <WifiOff size={28} aria-hidden /> {t('Mon carnet hors ligne')}
          </h1>
          <p className="text-[var(--fg-muted)]">
            {t('La copie gardée sur ce téléphone est chiffrée. Tapez votre code PIN pour la lire, même en mode avion.')}
          </p>
        </header>
        <section className="card p-5">
          <OfflinePin unlockOnly />
        </section>
        <Link href="/app/carte-urgence" className="btn btn-danger w-full">
          {t('Ma carte d’urgence')}
        </Link>
      </main>
    </I18nScope>
  );
}
