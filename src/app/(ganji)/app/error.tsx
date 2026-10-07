'use client';
import { I18nProvider, useLocale } from '@/i18n/client';
import { patientError } from '@/i18n/en/patient';
import EspaceError from './_components/EspaceError';

const NONE = {};

/**
 * Erreur dans le layout de l'espace (ex. API injoignable au chargement de la session).
 * Hors du domaine « patient » : on fournit seulement les quelques phrases de cette page.
 */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useLocale();
  return (
    <I18nProvider locale={locale} messages={locale === 'en' ? patientError : NONE}>
      <main id="contenu" className="mx-auto max-w-6xl px-4 py-6">
        <EspaceError {...props} />
      </main>
    </I18nProvider>
  );
}
