import Script from 'next/script';

/**
 * Plausible je cookieless — spouští se jen když je vyplněná
 * NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Bez ní web neposílá nic a nepotřebuje
 * cookie lištu.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  return (
    <Script
      defer
      data-domain={domain}
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}
