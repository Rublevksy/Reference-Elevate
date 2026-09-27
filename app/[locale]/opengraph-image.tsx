import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { locales } from '@/i18n/routing';

export const alt = 'ELEVATE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          backgroundColor: '#04060b',
          backgroundImage:
            'radial-gradient(circle at 78% 4%, rgba(31,91,255,0.5), rgba(4,6,11,0) 62%)',
          color: '#F2F5FF',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 12, color: '#8A93A8' }}>
          E L E V A T E
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 62, fontWeight: 800, lineHeight: 1.08, marginTop: 36, maxWidth: 950 }}>
          {t('title')}&nbsp;<span style={{ color: '#3D7BFF' }}>{t('titleAccent')}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#8A93A8', marginTop: 30 }}>{t('eyebrow')}</div>
      </div>
    ),
    size,
  );
}
