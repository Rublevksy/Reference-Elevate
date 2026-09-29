import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { site } from '@/content/site';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabaseConfigured } from '@/lib/supabase/env';
import { FALLBACK_PROJECTS, projectFromRow, type Project, type ProjectRow } from './projects';

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

export const getBlock = unstable_cache(
  async (key: 'pricing_cs' | 'settings'): Promise<Record<string, unknown> | null> => {
    if (!supabaseConfigured) return null;
    try {
      const { data, error } = await publicClient().from('content_blocks').select('data').eq('key', key).maybeSingle();
      if (error || !data) return null;
      return data.data as Record<string, unknown>;
    } catch {
      return null;
    }
  },
  ['block'],
  { tags: [CONTENT_TAG], revalidate: 3600 },
);

export type SiteSettings = { contactEmail: string };

export async function getSettings(): Promise<SiteSettings> {
  const block = await getBlock('settings');
  const email = typeof block?.contact_email === 'string' && block.contact_email.includes('@') ? block.contact_email : site.email;
  return { contactEmail: email };
}
