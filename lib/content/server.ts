import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { site } from '@/content/site';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { FALLBACK_PROJECTS, projectFromRow, type Project, type ProjectRow } from './projects';
import { resolveSocials, type SocialInput, type SocialLink } from '@/lib/social';
import { DEFAULT_INDUSTRY_IDS, OTHER_INDUSTRY, sanitizeGallery, sanitizeIndustries, type GalleryItem, type Industry } from './gallery';
import csMessages from '@/messages/cs.json';
import enMessages from '@/messages/en.json';
import ruMessages from '@/messages/ru.json';
import ukMessages from '@/messages/uk.json';

/** Značka cache — administrace ji po uložení zneplatní (web se přegeneruje). */
export const CONTENT_TAG = 'content';

const publicClient = () =>
  createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/**
 * Veřejná data se čtou přes publishable klíč (RLS: jen publikované) a drží
 * se v cache Next.js; když databáze neodpovídá nebo tabulky ještě nejsou,
 * web jede na výchozích datech — nikdy nespadne.
 */
export const getProjects = unstable_cache(
  async (): Promise<Project[]> => {
    if (!supabaseConfigured) return FALLBACK_PROJECTS;
    try {
      const { data, error } = await publicClient().from('projects').select('*').eq('published', true).order('sort').order('created_at');
      if (error || !data?.length) return FALLBACK_PROJECTS;
      return (data as ProjectRow[]).map(projectFromRow);
    } catch {
      return FALLBACK_PROJECTS;
    }
  },
  ['projects'],
  { tags: [CONTENT_TAG], revalidate: 3600 },
);

export type BlockKey = 'pricing_cs' | 'settings' | 'messages_cs' | 'site_status' | 'industries' | 'gallery';

/**
 * Bloky obsahu čte server přes service role (jen na serveru) — nové bloky
 * tak nepotřebují úpravu RLS politik v databázi.
 */
const serverClient = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export const getBlock = unstable_cache(
  async (key: BlockKey): Promise<Record<string, unknown> | null> => {
    if (!supabaseConfigured) return null;
    try {
      const { data, error } = await serverClient().from('content_blocks').select('data').eq('key', key).maybeSingle();
      if (error || !data) return null;
      return data.data as Record<string, unknown>;
    } catch {
      return null;
    }
  },
  ['block'],
  { tags: [CONTENT_TAG], revalidate: 3600 },
);

export type SiteSettings = {
  contactEmail: string;
  city: string;
  legalName: string;
  ico: string;
  social: SocialLink[];
};
export type { SocialLink };

const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);

/** Kontakt a firemní údaje: z administrace, jinak výchozí z content/site.ts. */
export async function getSettings(): Promise<SiteSettings> {
  const b = (await getBlock('settings')) ?? {};
  const email = str(b.contact_email, site.email);
  return {
    contactEmail: email.includes('@') ? email : site.email,
    city: str(b.city, site.city),
    legalName: str(b.legal_name, site.legalName),
    ico: str(b.ico, site.ico),
    // sítě a messengery z administrace; neplatné / prázdné se vynechají
    social: resolveSocials(readSocialInputs(b)),
  };
}

/** Uložené sítě: nový tvar (pole) i starší objekt {instagram: url, …}. */
export function readSocialInputs(b: Record<string, unknown>): SocialInput[] {
  if (Array.isArray(b.social_links)) {
    return (b.social_links as unknown[])
      .filter((x): x is { label: string; value: string } => Boolean(x) && typeof (x as SocialInput).label === 'string' && typeof (x as SocialInput).value === 'string')
      .map((x) => ({ label: x.label, value: x.value }));
  }
  const legacy = (b.social ?? {}) as Record<string, unknown>;
  const names: Record<string, string> = { instagram: 'Instagram', linkedin: 'LinkedIn', behance: 'Behance' };
  return Object.entries(legacy)
    .filter(([, v]) => typeof v === 'string' && v.trim() && !/^https?:\/\/(www\.)?(instagram\.com|linkedin\.com|behance\.net)\/?$/.test(v.trim()))
    .map(([k, v]) => ({ label: names[k] ?? k, value: String(v) }));
}

/**
 * Režim údržby (administrace → „Technické práce"). Samostatný blok, aby ho
 * uložení kontaktů nikdy nepřepsalo. Když databáze neodpovídá, web běží.
 */
export const getSiteStatus = unstable_cache(
  async (): Promise<{ maintenance: boolean }> => {
    if (!supabaseConfigured) return { maintenance: false };
    try {
      const { data, error } = await serverClient().from('content_blocks').select('data').eq('key', 'site_status').maybeSingle();
      if (error || !data) return { maintenance: false };
      return { maintenance: (data.data as Record<string, unknown>).maintenance === true };
    } catch {
      return { maintenance: false };
    }
  },
  ['site-status'],
  // krátká platnost: i bez zásahu administrace se stav údržby srovná do minuty
  { tags: [CONTENT_TAG], revalidate: 60 },
);

/**
 * Obory (formulář „Obor podnikání" + kategorie galerie). Dokud je správce
 * neupraví, platí výchozích osm z messages — české názvy včetně případných
 * starších úprav z Texty webu. „Jiný obor" je vždy poslední.
 */
export async function getIndustries(): Promise<Industry[]> {
  const stored = sanitizeIndustries(await getBlock('industries'));
  const list = stored.length ? stored : await defaultIndustries();
  const other = list.find((i) => i.id === OTHER_INDUSTRY) ?? (await defaultIndustries()).find((i) => i.id === OTHER_INDUSTRY)!;
  return [...list.filter((i) => i.id !== OTHER_INDUSTRY), other];
}

export async function defaultIndustries(): Promise<Industry[]> {
  const overrides = (await getBlock('messages_cs')) ?? {};
  const all = { cs: csMessages, en: enMessages, ru: ruMessages, uk: ukMessages };
  return DEFAULT_INDUSTRY_IDS.map((id, i) => {
    const names: Industry['names'] = {};
    for (const [l, m] of Object.entries(all)) names[l as keyof typeof all] = (m.contact.niches as string[])[i];
    const override = overrides[`contact.niches.${i}`];
    if (typeof override === 'string' && override.trim()) names.cs = override.trim();
    return { id, names, legacy: i };
  });
}

/** Všechny snímky galerie (jen na serveru — veřejně jde přes /api/gallery bez interních údajů). */
export async function getGallery(): Promise<GalleryItem[]> {
  return sanitizeGallery(await getBlock('gallery'));
}
