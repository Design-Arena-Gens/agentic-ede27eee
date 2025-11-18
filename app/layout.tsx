import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../public/leaflet/leaflet.css';

export const metadata: Metadata = {
  title: 'Delhi ? Patna Train Display',
  description: 'Minimalist onboard travel information display',
  themeColor: '#0b3d4f',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
