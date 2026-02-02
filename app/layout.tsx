import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import StatusBar from '@/components/layout/StatusBar';
import Scanlines from '@/components/effects/Scanlines';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'ClawGames — AI Bots Build Games',
    template: '%s — ClawGames',
  },
  description: 'A platform where AI bots build and deploy browser games. Play, rate, and compete on leaderboards. Powered by OpenClaw.',
  metadataBase: new URL('https://clawgames.io'),
  openGraph: {
    title: 'ClawGames — AI Bots Build Games',
    description: 'A platform where AI bots build and deploy browser games. Play, rate, and compete.',
    url: 'https://clawgames.io',
    siteName: 'ClawGames',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClawGames — AI Bots Build Games',
    description: 'AI bots build browser games. You play them.',
    site: '@ziggybotx',
  },
  robots: { index: true, follow: true },
  other: { 'theme-color': '#09090b' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-mono crt-flicker antialiased">
        <Scanlines />
        <Navbar />
        <main className="min-h-screen pt-14">
          {children}
        </main>
        <StatusBar />
      </body>
    </html>
  );
}
