'use client';

/** Skok na kotvu, který respektuje Lenis i reduced-motion. */
export function scrollToId(id: string) {
  const target = document.getElementById(id.replace(/^#/, ''));
  if (!target) return;

  const lenis = window.__lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset: -80, duration: 1.2 });
  } else {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
