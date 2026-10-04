import { notFound } from 'next/navigation';

/**
 * Neexistující adresa uvnitř jazykové verze (/cs/cokoli) → vlastní stránka 404
 * webu (app/[locale]/not-found.tsx) i s lištou a patičkou, ne holá výchozí 404.
 */
// zbytek adresy je libovolný (na rozdíl od jazyka, viz layout) — stránka se vykresluje na požádání
export const dynamicParams = true;

export default function CatchAll() {
  notFound();
}
