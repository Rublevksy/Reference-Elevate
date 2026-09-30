'use client';

import type { ComponentProps, MouseEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { coverPage, navigateTo } from '@/lib/scrollTo';

/**
 * Odkaz na sekci úvodní stránky, který funguje odkudkoli: na úvodní stránce
 * rychle přejede na sekci (lib/scrollTo), na jiné stránce (ochrana údajů,
 * 404) zakryje stránku clonou a přejde na úvodní stránku s #kotvou.
 */
export function SectionLink({
  to,
  onNavigate,
  onClick,
  ...rest
}: Omit<ComponentProps<typeof Link>, 'href'> & { to: string; onNavigate?: () => void }) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    onNavigate?.();
    if (navigateTo(to)) event.preventDefault();
    else coverPage();
  };
  return <Link href={`/#${to}`} onClick={handle} {...rest} />;
}
