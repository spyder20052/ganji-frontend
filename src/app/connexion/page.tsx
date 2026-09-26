import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { LoginForm } from './LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Connexion') };
}

/** Page où revenir après la connexion : un chemin interne seulement (pas de redirection ouverte). */
function safeSuite(v: string | string[] | undefined): string | undefined {
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : undefined;
}

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getT();
  const suite = safeSuite((await searchParams).suite);
  return (
    <I18nScope area="public">
      <main id="contenu" className="mx-auto max-w-md space-y-6 px-4 py-8">
        <Logo />
        <div>
          <h1 className="text-3xl font-bold">{t('Ouvrir mon carnet')}</h1>
          <p className="mt-2 text-[var(--fg-muted)]">{t('Sans mot de passe : un code par SMS suffit. Sur votre téléphone, un code PIN protège ensuite le carnet hors ligne.')}</p>
        </div>
        <I18nScope area="compte">
          <LoginForm suite={suite} />
        </I18nScope>
        <p className="text-base">{t('Membre du jury ?')} <Link href={suite ? `/demo?suite=${encodeURIComponent(suite)}` : '/demo'} className="font-bold underline">{t('Utiliser un compte de démonstration')}</Link></p>
      </main>
    </I18nScope>
  );
}
