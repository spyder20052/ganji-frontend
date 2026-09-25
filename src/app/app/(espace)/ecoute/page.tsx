import type { Metadata } from 'next';
import { EyeOff, Clock, ShieldCheck } from 'lucide-react';
import { I18nScope } from '@/i18n/I18nScope';
import { getT } from '@/i18n/server';
import { PageHead, PreviewBadge, PreviewNotice } from '../../_components/ui';
import { ListenChat } from './ListenChat';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('Écoute anonyme') };
}

export default async function EcoutePage() {
  const t = await getT();
  return (
    <I18nScope area="patient3">
      <PageHead
        icon="listen"
        title={t('Écoute anonyme')}
        intro={t('Quand ça va mal dans la tête ou dans le cœur : écrire à quelqu’un de formé, sans donner son nom.')}
        listen={t("Ici, vous pouvez écrire ce qui vous pèse, sans donner votre nom. Une écoutante formée vous répond sous vingt-quatre heures. Si vous êtes en danger, un bouton vous met tout de suite en contact avec quelqu'un.")}
        audioKey="app.ecoute"
      >
        <PreviewBadge />
      </PageHead>

      <PreviewNotice>
        {t('Maquette cliquable (module M12). Les messages restent dans cette page : rien n’est envoyé ni enregistré. Essayez d’écrire « je veux en finir » pour voir l’aide de crise.')}
      </PreviewNotice>

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { Icon: EyeOff, t: 'Sans nom', d: 'Aucune identité, aucun lien avec votre carnet.' },
          { Icon: Clock, t: 'Réponse sous 24 h', d: 'Par une écoutante formée (psychologue, pair aidant).' },
          { Icon: ShieldCheck, t: 'Crise : tout de suite', d: 'Certains mots ouvrent l’aide immédiate.' },
        ].map(({ Icon, t: title, d }) => (
          <li key={title} className="card flex gap-3 p-4">
            <Icon size={24} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />
            <span>
              <span className="block font-bold">{t(title)}</span>
              <span className="block text-base text-[var(--fg-muted)]">{t(d)}</span>
            </span>
          </li>
        ))}
      </ul>

      <ListenChat />
    </I18nScope>
  );
}
