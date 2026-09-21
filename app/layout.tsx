import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaDrop - Simple, Privacy-First Media to MP3 Converter',
  description:
    'Paste media URLs or drop files to convert directly to MP3 in your browser. Powered by client-side Web Audio encoding and official YouTube oEmbed metadata.',
  keywords: ['mp3 converter', 'audio converter', 'media drop', 'youtube metadata', 'client-side audio'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0c',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0c] text-neutral-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
