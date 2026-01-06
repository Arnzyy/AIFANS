import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AgeGate } from '@/components/shared/AgeGate';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LYRA - AI Model Subscription Platform',
  description: 'Subscribe to your favorite AI influencers and models',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'LYRA - AI Model Subscription Platform',
    description: 'Subscribe to your favorite AI influencers and models',
    url: 'https://www.joinlyra.com',
    siteName: 'LYRA',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'LYRA Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'LYRA - AI Model Subscription Platform',
    description: 'Subscribe to your favorite AI influencers and models',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <AgeGate>
          {children}
        </AgeGate>
        <Toaster />
      </body>
    </html>
  );
}
