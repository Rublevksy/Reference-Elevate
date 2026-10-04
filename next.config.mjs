import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** Doména úložiště obrázků (Supabase Storage) — z veřejné adresy projektu. */
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return '';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // NEXT_DIST_DIR umožní ověřovací build vedle běžícího `next dev` (jinak sdílí .next)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  // v adresáři výš leží jiný lockfile — ať Next hledá kořen tady
  outputFileTracingRoot: import.meta.dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
    // náhledy ukázek v e-mailu jdou přes optimalizátor (JPEG pro klienty bez WebP) — snímky leží v úložišti Supabase
    remotePatterns: supabaseHost ? [{ protocol: 'https', hostname: supabaseHost, pathname: '/storage/v1/object/public/**' }] : [],
  },
  // three.js ships untranspiled ESM addons used by drei
  transpilePackages: ['three'],
};

export default withNextIntl(nextConfig);
