import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // v adresáři výš leží jiný lockfile — ať Next hledá kořen tady
  outputFileTracingRoot: import.meta.dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // three.js ships untranspiled ESM addons used by drei
  transpilePackages: ['three'],
};

export default withNextIntl(nextConfig);
