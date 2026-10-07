'use client';
import { I18nProvider, useLocale } from '@/i18n/client';
import { patientError } from '@/i18n/en/patient';
import EspaceError from '@/app/(ganji)/app/_components/EspaceError';

const NONE = {};

/**
 * Écran d'erreur commun aux espaces (soignant, pharmacie, banque de sang, ministère, relais) : le service ne
 * répond pas, ou une page a planté. Même texte que l'espace patient, dans la langue de l'interface.
 */
export default function ErrorFallback(props: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  return (
    <I18nProvider locale={locale} messages={locale === 'en' ? patientError : NONE}>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6">
        <EspaceError {...props} />
      </main>
    </I18nProvider>
  );
}
