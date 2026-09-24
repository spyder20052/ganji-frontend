import type { Metadata } from 'next';
import { EyeOff, Clock, ShieldCheck } from 'lucide-react';
import { PageHead, PreviewBadge, PreviewNotice } from '../../_components/ui';
import { ListenChat } from './ListenChat';

export const metadata: Metadata = { title: 'Écoute anonyme' };

export default function EcoutePage() {
  return (
    <>
      <PageHead
        icon="listen"
        title="Écoute anonyme"
        intro="Quand ça va mal dans la tête ou dans le cœur : écrire à quelqu’un de formé, sans donner son nom."
        listen="Ici, vous pouvez écrire ce qui vous pèse, sans donner votre nom. Une écoutante formée vous répond sous vingt-quatre heures. Si vous êtes en danger, un bouton vous met tout de suite en contact avec quelqu'un."
        audioKey="app.ecoute"
      >
        <PreviewBadge />
      </PageHead>

      <PreviewNotice>
        Maquette cliquable (module M12). Les messages restent dans cette page : rien n’est envoyé ni enregistré. Essayez d’écrire « je veux en finir » pour voir l’aide de crise.
      </PreviewNotice>

      <ul className="grid gap-3 sm:grid-cols-3">
        {[
          { Icon: EyeOff, t: 'Sans nom', d: 'Aucune identité, aucun lien avec votre carnet.' },
          { Icon: Clock, t: 'Réponse sous 24 h', d: 'Par une écoutante formée (psychologue, pair aidant).' },
          { Icon: ShieldCheck, t: 'Crise : tout de suite', d: 'Certains mots ouvrent l’aide immédiate.' },
        ].map(({ Icon, t, d }) => (
          <li key={t} className="card flex gap-3 p-4">
            <Icon size={24} aria-hidden className="shrink-0 text-[var(--color-brand-700)]" />
            <span>
              <span className="block font-bold">{t}</span>
              <span className="block text-base text-[var(--fg-muted)]">{d}</span>
            </span>
          </li>
        ))}
      </ul>

      <ListenChat />
    </>
  );
}
