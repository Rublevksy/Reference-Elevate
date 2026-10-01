import { Globe } from 'lucide-react';
import { BRAND_PATHS, type BrandId } from '@/lib/brand-icons';

/** Ikona platformy (Simple Icons); neznámá platforma = glóbus. */
export function SocialIcon({ brand, className = 'h-4 w-4' }: { brand: BrandId | null; className?: string }) {
  if (!brand) return <Globe className={className} aria-hidden />;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={BRAND_PATHS[brand]} />
    </svg>
  );
}
