import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible_Next, Poppins } from 'next/font/google';
import { DemoBanner } from '@/components/DemoBanner';
import { SwRegister } from '@/components/SwRegister';
import './globals.css';

// Atkinson Hyperlegible Next (conçue pour les malvoyants, exigence du cahier) : texte courant et
// demi-gras des libellés.
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-atkinson', display: 'swap' });
// Poppins (charte Ganji) : titres et logotype.
// Deux graisses seulement : la première page doit rester sous 200 Ko en 2G.
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-poppins', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Ganji · la santé de chaque Béninois', template: '%s · Ganji' },
  description: 'Carnet de santé partagé, orientation, sang, médicaments et urgences : Ganji accompagne chaque personne au Bénin, même sans réseau ni smartphone.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Ganji',
  appleWebApp: { capable: true, title: 'Ganji', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#f5f4ee',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Préférences appliquées avant le premier rendu (taille du texte, thème, mode simple). */
const PREFS = `try{var p=JSON.parse(localStorage.getItem('ganji-prefs')||'{}');var d=document.documentElement;if(p.scale)d.style.setProperty('--text-scale',p.scale);if(p.theme)d.dataset.theme=p.theme;if(p.voice)d.dataset.voice=p.voice;if(p.simple)d.dataset.simple='1'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${atkinson.variable} ${poppins.variable}`} suppressHydrationWarning>
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
