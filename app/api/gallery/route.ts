import { NextResponse } from 'next/server';
import { getGallery } from '@/lib/content/server';
import type { PublicGalleryItem } from '@/lib/content/gallery';

/**
 * Ukázky pro formulář: všechny snímky jednoho oboru (pořadí zamíchá až
 * prohlížeč). Data jsou v cache obsahu — po úpravě v administraci se obnoví.
 */
export async function GET(request: Request) {
  const industry = new URL(request.url).searchParams.get('industry') ?? '';
  if (!/^[a-z0-9-]{1,40}$/.test(industry)) return NextResponse.json({ items: [] }, { status: 400 });
  const items: PublicGalleryItem[] = (await getGallery())
    .filter((item) => item.industries.includes(industry))
    .map(({ id, url, thumb, width, height, label }) => ({ id, url, thumb, width, height, label }));
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } });
}
