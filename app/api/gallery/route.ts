import { NextResponse } from 'next/server';
import { getGallery } from '@/lib/content/server';
import { GALLERY_TYPES, galleryMatches, type GalleryType, type PublicGalleryItem } from '@/lib/content/gallery';

/**
 * Ukázky pro formulář: snímky pro kombinaci typ projektu + obor (pořadí zamíchá až
 * prohlížeč). Data jsou v cache obsahu — po úpravě v administraci se obnoví.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const industry = params.get('industry') ?? '';
  if (!/^[a-z0-9-]{1,40}$/.test(industry)) return NextResponse.json({ items: [] }, { status: 400 });
  // typy projektu (web,eshop…) — bez parametru weby
  const asked = (params.get('types') ?? 'web').split(',').filter((t): t is GalleryType => GALLERY_TYPES.includes(t as GalleryType));
  const types = asked.length ? asked : (['web'] as GalleryType[]);
  const items: PublicGalleryItem[] = (await getGallery())
    .filter((item) => types.some((type) => galleryMatches(item, type, industry)))
    .map(({ id, type, url, thumb, width, height, label, video }) => ({ id, type, url, thumb, width, height, label, ...(video ? { video } : {}) }));
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } });
}
