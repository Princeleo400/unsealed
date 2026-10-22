import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'UNSEALED — Can you solve it?', template: '%s · UNSEALED' },
  description:
    'A fair-play detective game. Read the real case file, tie the red string, rebuild the night and name the killer — alone or with friends.',
  openGraph: {
    title: 'UNSEALED — Can you solve it?',
    description: 'Every file. Every lie. Your verdict. Case #001 is free.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#14110F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
