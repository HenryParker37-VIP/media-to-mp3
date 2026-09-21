import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaDrop - Convert Media to MP3',
  description:
    'Paste a media link or upload a file to analyze and convert supported media directly in your browser.',
  keywords: ['convert media to mp3', 'audio converter', 'media drop', 'youtube metadata', 'in-browser audio'],
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
