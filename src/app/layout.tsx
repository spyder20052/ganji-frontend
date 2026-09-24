import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next } from 'next/font/google';
import { DemoBanner } from '@/components/DemoBanner';
import { SwRegister } from '@/components/SwRegister';
import './globals.css';

// Atkinson Hyperlegible Next (conçue pour les malvoyants, exigence du cahier), en variable : les
// graisses fines des grands chiffres et le demi-gras des libellés dans un seul fichier.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Ganji · la santé de chaque Béninois', template: '%s · Ganji' },
  description: 'Carnet de santé partagé, orientation, sang, médicaments et urgences : Ganji accompagne chaque personne au Bénin, même sans réseau ni smartphone.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Ganji',
  appleWebApp: { capable: true, title: 'Ganji', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#e2ede7',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Préférences appliquées avant le premier rendu (taille du texte, thème, mode simple). */
const PREFS = `try{var p=JSON.parse(localStorage.getItem('ganji-prefs')||'{}');var d=document.documentElement;if(p.scale)d.style.setProperty('--text-scale',p.scale);if(p.theme)d.dataset.theme=p.theme;if(p.voice)d.dataset.voice=p.voice;if(p.simple)d.dataset.simple='1'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={atkinson.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFS }} />
      </head>
      <body className="min-h-dvh">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 btn btn-primary">
          Aller au contenu
        </a>
        <DemoBanner />
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
