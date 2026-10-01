import { notFound } from 'next/navigation';

/**
 * Neexistující adresa uvnitř jazykové verze (/cs/cokoli) → vlastní stránka 404
 * webu (app/[locale]/not-found.tsx) i s lištou a patičkou, ne holá výchozí 404.
 */
export default function CatchAll() {
  notFound();
}
