import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trading Terminal',
  description: 'Real-time order book, charting, and strategy terminal',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0c0e15',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Extensions (ColorZilla, Grammarly, password managers) stamp attributes on
    // <html>/<body> before React hydrates; both need the warning suppressed.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
