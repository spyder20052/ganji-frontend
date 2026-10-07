import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Hors ligne') };
}

export default async function Offline() {
  const t = await getT();
  return (
    <I18nScope area="public">
      <main id="contenu" className="mx-auto max-w-md space-y-5 px-4 py-10">
        <Logo />
        <h1 className="text-3xl font-bold">{t('Pas de réseau pour le moment')}</h1>
        <p>{t('Vos saisies sont gardées sur le téléphone et partiront au retour du réseau. Ce qui reste disponible :')}</p>
        <div className="grid gap-3">
          <Link href="/app/carte-urgence" className="btn btn-danger">{t('Ma carte d’urgence')}</Link>
          <Link href="/app/hors-ligne" className="btn btn-primary">{t('Mon carnet (copie protégée par PIN)')}</Link>
          <Link href="/orientation" className="btn btn-ghost">{t('J’ai un symptôme')}</Link>
        </div>
        <p className="text-base text-[var(--fg-muted)]">{t('Urgence : sapeurs-pompiers 118. Sans téléphone qui fonctionne, montrez votre carte QR imprimée.')}</p>
      </main>
    </I18nScope>
  );
}
