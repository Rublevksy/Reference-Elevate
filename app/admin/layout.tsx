import type { Metadata } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import '../globals.css';

const display = Unbounded({ subsets: ['latin', 'latin-ext'], variable: '--font-display', weight: ['600', '700'], display: 'swap' });
const sans = Manrope({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Administrace — ELEVATE',
  robots: { index: false, follow: false },
};

/** Samostatný kořen pro administraci (mimo jazykové verze webu). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-[var(--bg)] text-ink antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
