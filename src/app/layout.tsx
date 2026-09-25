import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import localFont from 'next/font/local';
import { DemoBanner } from '@/components/DemoBanner';
import { SwRegister } from '@/components/SwRegister';
import { I18nScope } from '@/i18n/I18nScope';
import { getLocale, getT } from '@/i18n/server';
import { HTML_LANG } from '@/i18n/translate';
import './globals.css';

// Atkinson Hyperlegible (conçue pour les malvoyants, exigence du cahier) : texte courant des espaces
// patients. Pas de préchargement : l'accueil, en Poppins, ne la télécharge pas (budget de 200 Ko).
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-atkinson', display: 'swap', preload: false });
// Bricolage Grotesque SemiBold : titres de toute l'application (le logotype, en Poppins Medium, est un
// tracé). Une seule graisse, déclarée pour 500 à 700 : pas de gras simulé, 15 Ko (scripts/polices/polices.py).
const bricolage = localFont({ src: '../fonts/bricolage-titres.woff2', weight: '500 700', variable: '--font-bricolage', display: 'swap' });
// Lettres des langues nationales (ɔ, ɛ, ɖ, ẹ, ọ, ṣ, tons…) absentes des polices ci-dessus : mini Noto Sans (5 Ko par
// graisse), téléchargée seulement si la page en affiche (unicode-range). Rien de plus en français ni en anglais.
const afrique = localFont({
  src: [
    { path: '../fonts/noto-afrique-400.woff2', weight: '400' },
    { path: '../fonts/noto-afrique-700.woff2', weight: '700' },
  ],
  variable: '--font-afrique',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+0129,U+0143,U+0144,U+014A,U+014B,U+014D,U+0169,U+0186,U+0189,U+0190,U+019D,U+01CE,U+01D0,U+01D2,U+01D4,U+01F9,U+0254,U+0256,U+025B,U+0272,U+0300,U+0301,U+0303,U+0304,U+0323,U+1E62,U+1E63,U+1EB8,U+1EB9,U+1EBD,U+1ECC,U+1ECD' }],
});

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
    <html lang={HTML_LANG[await getLocale()]} className={`${atkinson.variable} ${bricolage.variable} ${afrique.variable}`} suppressHydrationWarning>
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
