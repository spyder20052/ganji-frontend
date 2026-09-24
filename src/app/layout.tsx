import type { Metadata, Viewport } from 'next';
import { Atkinson_Hyperlegible } from 'next/font/google';
import { DemoBanner } from '@/components/DemoBanner';
import { SwRegister } from '@/components/SwRegister';
import './globals.css';

const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-atkinson', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Alafia · la santé de chaque Béninois', template: '%s · Alafia' },
  description: 'Carnet de santé partagé, orientation, sang, médicaments et urgences : Alafia accompagne chaque personne au Bénin, même sans réseau ni smartphone.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Alafia',
  appleWebApp: { capable: true, title: 'Alafia', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
};

export const viewport: Viewport = {
  themeColor: '#0b4f3c',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Préférences appliquées avant le premier rendu (taille du texte, thème, mode simple). */
const PREFS = `try{var p=JSON.parse(localStorage.getItem('alafia-prefs')||'{}');var d=document.documentElement;if(p.scale)d.style.setProperty('--text-scale',p.scale);if(p.theme)d.dataset.theme=p.theme;if(p.voice)d.dataset.voice=p.voice;if(p.simple)d.dataset.simple='1'}catch(e){}`;

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
