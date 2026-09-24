'use client';
import EspaceError from './_components/EspaceError';

/** Erreur dans le layout de l'espace (ex. API injoignable au chargement de la session). */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="mx-auto max-w-5xl px-4 py-6">
      <EspaceError {...props} />
    </main>
  );
}
