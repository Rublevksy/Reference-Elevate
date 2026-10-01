import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { site } from '@/content/site';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { FALLBACK_PROJECTS, projectFromRow, type Project, type ProjectRow } from './projects';
import { resolveSocials, type SocialInput, type SocialLink } from '@/lib/social';

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

export type BlockKey = 'pricing_cs' | 'settings' | 'messages_cs' | 'site_status';

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
export async function getSiteStatus(): Promise<{ maintenance: boolean }> {
  const b = await getBlock('site_status');
  return { maintenance: b?.maintenance === true };
}
