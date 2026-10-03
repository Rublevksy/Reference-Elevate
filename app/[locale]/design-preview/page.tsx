import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { DesignPreview } from '@/components/preview/DesignPreview';

/**
 * Náhled tří vizuálních směrů formuláře (krok Vzhled) — pracovní stránka
 * k výběru stylu, mimo vyhledávače a bez odkazu z webu.
 */
export const metadata: Metadata = {
  title: 'Návrhy formuláře — náhled',
  robots: { index: false, follow: false },
};

export default async function DesignPreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DesignPreview />;
}
