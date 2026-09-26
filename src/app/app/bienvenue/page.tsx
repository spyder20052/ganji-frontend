import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { ROLE_HOME } from '@/lib/types';
import { getMe, load } from '../_lib/load';
import type { Profile } from '../_lib/profile';
import { Welcome } from './Welcome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Bienvenue') };
}

/** Chemin interne seulement (pas de redirection ouverte). */
function safeSuite(v: string | undefined) {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/app';
}

/**
 * Accueil après la première connexion : cinq questions courtes, chacune peut être passée.
 * Hors de l'espace à onglets : une seule chose à faire à l'écran.
 */
export default async function BienvenuePage({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const [{ suite }, me] = await Promise.all([searchParams, getMe()]);
  if (me.role !== 'PATIENT' && me.role !== 'CAREGIVER') redirect(ROLE_HOME[me.role]);
  const res = await load<Profile>('/me/profile');
  if (!res.data) redirect('/app/profil');
  return (
    <I18nScope area="patient">
      <I18nScope area="compte">
        <header className="mx-auto flex max-w-xl items-center px-4 pt-4">
          <Logo href="/app" />
        </header>
        <main id="contenu" className="px-4 pt-4 pb-10">
          <Welcome profile={res.data} suite={safeSuite(suite)} />
        </main>
      </I18nScope>
    </I18nScope>
  );
}
