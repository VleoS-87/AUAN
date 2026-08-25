import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AUAN',
  description: 'Angebotsmappen der Badausstellungen der Unternehmensgruppe Pietsch',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
