import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import localFont from 'next/font/local';
import { DemoBanner } from '@/components/DemoBanner';
import { SwRegister } from '@/components/SwRegister';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import './globals.css';

// Atkinson Hyperlegible (conçue pour les malvoyants, exigence du cahier) : texte courant des espaces
// patients. Pas de préchargement : l'accueil, en Poppins, ne la télécharge pas (budget de 200 Ko).
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-atkinson', display: 'swap', preload: false });
// Bricolage Grotesque SemiBold : titres de toute l'application (le logotype, en Poppins Medium, est un
// tracé). Une seule graisse, déclarée pour 500 à 700 : pas de gras simulé, 15 Ko (scripts/polices/polices.py).
const bricolage = localFont({ src: '../fonts/bricolage-titres.woff2', weight: '500 700', variable: '--font-bricolage', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: t('Ganji · la santé de chaque Béninois'), template: '%s · Ganji' },
    description: t('Carnet de santé partagé, orientation, sang, médicaments et urgences : Ganji accompagne chaque personne au Bénin, même sans réseau ni smartphone.'),
    manifest: '/manifest.webmanifest',
    applicationName: 'Ganji',
    appleWebApp: { capable: true, title: 'Ganji', statusBarStyle: 'default' },
    icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
  };
}

export const viewport: Viewport = {
  themeColor: '#f5f4ee',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Préférences appliquées avant le premier rendu (taille du texte, thème, mode simple). */
const PREFS = `try{var p=JSON.parse(localStorage.getItem('ganji-prefs')||'{}');var d=document.documentElement;if(p.scale)d.style.setProperty('--text-scale',p.scale);if(p.theme)d.dataset.theme=p.theme;if(p.voice)d.dataset.voice=p.voice;if(p.simple)d.dataset.simple='1'}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <html lang={await getLocale()} className={`${atkinson.variable} ${bricolage.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS }} />
      </head>
      <body className="min-h-dvh">
        <a href="#contenu" className="font-display sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">
          {t('Aller au contenu')}
        </a>
        <I18nScope area="common">
          <DemoBanner />
          {children}
          <SwRegister />
        </I18nScope>
      </body>
    </html>
  );
}
