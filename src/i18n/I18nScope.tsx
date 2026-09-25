import { I18nProvider } from './client';
import type { Area } from './en';
import { clientMessages, getLocale } from './server';

/** À placer dans la page ou la mise en page d'un domaine : ses composants clients reçoivent leurs traductions. */
export async function I18nScope({ area, children }: { area: Area; children: React.ReactNode }) {
  return (
    <I18nProvider locale={await getLocale()} messages={await clientMessages(area)}>
      {children}
    </I18nProvider>
  );
}
