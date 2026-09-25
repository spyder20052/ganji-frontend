'use client';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { translate, type Locale, type Messages, type T } from './translate';

const I18nContext = createContext<{ locale: Locale; messages: Messages }>({ locale: 'fr', messages: {} });

/** Fournit la langue et les messages d'un domaine aux composants clients (s'ajoute au domaine parent). */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  const parent = useContext(I18nContext);
  const value = useMemo(() => ({ locale, messages: { ...parent.messages, ...messages } }), [locale, parent.messages, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Traducteur pour les composants clients : const t = useT(); t('Envoyer'). */
export function useT(): T {
  const { messages } = useContext(I18nContext);
  return useCallback((fr, vars) => translate(messages, fr, vars), [messages]);
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
