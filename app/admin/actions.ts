'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { CONTENT_TAG } from '@/lib/content/server';
import { EDITABLE_PATHS, getPath } from '@/lib/content/editable';
import csMessages from '@/messages/cs.json';
import type { ProjectRow } from '@/lib/content/projects';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/supabase/requireAdmin';
import { supabaseServer } from '@/lib/supabase/server';
import { resolveSocial, type SocialInput } from '@/lib/social';
import { INQUIRY_PREFIX, readInquiries, type Inquiry, type InquiryStatus } from '@/lib/content/inquiries';
export type { Inquiry, InquiryStatus } from '@/lib/content/inquiries';

type Result = { ok: true } | { ok: false; error: string };

/** Po každé změně: zneplatnit cache obsahu → web se při dalším požadavku přegeneruje. */
function publish() {
  revalidateTag(CONTENT_TAG);
  revalidatePath('/', 'layout');
}

const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'projekt';

export type ProjectInput = Omit<ProjectRow, 'id' | 'slug' | 'sort'> & { id?: string };

export async function saveProject(input: ProjectInput): Promise<Result & { id?: string }> {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const name = input.name.trim();
    if (!name) return { ok: false, error: 'Chybí název projektu.' };
    if (!input.desktop_image || !input.mobile_image) return { ok: false, error: 'Nahrajte desktopový i mobilní screenshot.' };
    if (input.url && !/^https?:\/\//.test(input.url)) return { ok: false, error: 'Odkaz musí začínat http:// nebo https://' };
    const row = {
      name,
      kind: input.kind.trim(),
      url: input.url.trim(),
      accent: /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : '#1f5bff',
      tags: input.tags.map((t) => t.trim()).filter(Boolean).slice(0, 6),
      desktop_image: input.desktop_image,
      desktop_width: Math.round(input.desktop_width),
      desktop_height: Math.round(input.desktop_height),
      mobile_image: input.mobile_image,
      mobile_width: Math.round(input.mobile_width),
      mobile_height: Math.round(input.mobile_height),
      published: input.published,
    };
    if (input.id) {
      const { error } = await db.from('projects').update(row).eq('id', input.id);
      if (error) throw error;
      publish();
      return { ok: true, id: input.id };
    }
    // nový projekt: jedinečný slug a pořadí na konec
    const base = slugify(name);
    const { data: existing } = await db.from('projects').select('slug, sort');
    const slugs = new Set((existing ?? []).map((r) => r.slug));
    let slug = base;
    for (let i = 2; slugs.has(slug); i++) slug = `${base}-${i}`;
    const sort = Math.max(0, ...(existing ?? []).map((r) => r.sort)) + 10;
    const { data, error } = await db.from('projects').insert({ ...row, slug, sort }).select('id').single();
    if (error) throw error;
    publish();
    return { ok: true, id: data.id };
  } catch (e) {
    return fail(e);
  }
}

/** Soubory v úložišti (ne výchozí /cases/… z repozitáře). */
function storagePath(url: string) {
  const marker = '/storage/v1/object/public/media/';
  const i = url.indexOf(marker);
  return i >= 0 ? url.slice(i + marker.length) : null;
}

export async function deleteProject(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const { data: all } = await db.from('projects').select('id, published');
    if ((all ?? []).filter((r) => r.published && r.id !== id).length === 0) {
      return { ok: false, error: 'Na webu musí zůstat aspoň jeden zveřejněný projekt.' };
    }
    const { data: row } = await db.from('projects').select('desktop_image, mobile_image').eq('id', id).single();
    const { error } = await db.from('projects').delete().eq('id', id);
    if (error) throw error;
    const files = [row?.desktop_image, row?.mobile_image].map((u) => (u ? storagePath(u) : null)).filter(Boolean) as string[];
    if (files.length) await db.storage.from('media').remove(files);
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reorderProjects(ids: string[]): Promise<Result> {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    for (const [i, id] of ids.entries()) {
      const { error } = await db.from('projects').update({ sort: (i + 1) * 10 }).eq('id', id);
      if (error) throw error;
    }
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setPublished(id: string, published: boolean): Promise<Result> {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    if (!published) {
      const { data: all } = await db.from('projects').select('id, published');
      if ((all ?? []).filter((r) => r.published && r.id !== id).length === 0) {
        return { ok: false, error: 'Na webu musí zůstat aspoň jeden zveřejněný projekt.' };
      }
    }
    const { error } = await db.from('projects').update({ published }).eq('id', id);
    if (error) throw error;
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Podepsaná adresa pro nahrání jednoho obrázku přímo z prohlížeče do úložiště
 * (velké screenshoty by neprošly limitem těla serverové akce).
 */
export async function createUpload(kind: 'desktop' | 'mobile'): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const db = supabaseAdmin();
    const path = `projects/${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}-${kind}.jpg`;
    const { data, error } = await db.storage.from('media').createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error('Úložiště neodpovídá.');
    const publicUrl = db.storage.from('media').getPublicUrl(path).data.publicUrl;
    return { ok: true, path, token: data.token, publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function savePricing(data: Record<string, unknown>): Promise<Result> {
  try {
    await requireAdmin();
    const plans = data.plans as Record<string, { features?: unknown }> | undefined;
    if (!plans || typeof plans !== 'object') return { ok: false, error: 'Chybí karty ceníku.' };
    for (const [id, plan] of Object.entries(plans)) {
      if (!Array.isArray(plan.features)) return { ok: false, error: `Karta ${id}: seznam „V ceně" je poškozený.` };
    }
    const { error } = await supabaseAdmin().from('content_blocks').upsert({ key: 'pricing_cs', data });
    if (error) throw error;
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export type SettingsInput = {
  contactEmail: string;
  city: string;
  legalName: string;
  ico: string;
  /** sítě a messengery v pořadí, jak se ukážou na webu */
  social: SocialInput[];
};

export async function saveSettings(input: SettingsInput): Promise<Result> {
  try {
    await requireAdmin();
    const email = input.contactEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Neplatný e-mail.' };
    const ico = input.ico.replace(/\s+/g, '');
    if (ico && !/^\d{8}$/.test(ico)) return { ok: false, error: 'IČO má 8 číslic.' };
    const social: SocialInput[] = [];
    for (const item of input.social.slice(0, 16)) {
      if (!item.label.trim() && !item.value.trim()) continue;
      const r = resolveSocial(item);
      if (!r.ok) return { ok: false, error: r.error };
      social.push({ label: item.label.trim().slice(0, 40), value: item.value.trim().slice(0, 300) });
    }
    const data = { contact_email: email, city: input.city.trim(), legal_name: input.legalName.trim(), ico, social_links: social };
    const { error } = await supabaseAdmin().from('content_blocks').upsert({ key: 'settings', data });
    if (error) throw error;
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Změněné texty webu (čeština). Ukládají se jen povolená pole a jen ta, která
 * se liší od výchozího textu — co zůstane výchozí, bere se dál ze souboru.
 */
export async function saveTexts(changes: Record<string, string>): Promise<Result> {
  try {
    await requireAdmin();
    const data: Record<string, string> = {};
    for (const [path, value] of Object.entries(changes)) {
      if (!EDITABLE_PATHS.has(path) || typeof value !== 'string') continue;
      // bez ořezu: části nadpisů mají záměrné mezery na krajích
      if (!value.trim()) continue;
      if (value.length > 1200) return { ok: false, error: `Text „${path}" je příliš dlouhý.` };
      if (value !== getPath(csMessages, path)) data[path] = value;
    }
    const { error } = await supabaseAdmin().from('content_blocks').upsert({ key: 'messages_cs', data });
    if (error) throw error;
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setPassword(password: string): Promise<Result> {
  try {
    await requireAdmin();
    if (password.length < 10) return { ok: false, error: 'Heslo musí mít aspoň 10 znaků.' };
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/* ------------------------------------------------------------------ */
/*  Režim údržby                                                       */
/* ------------------------------------------------------------------ */

export async function setMaintenance(on: boolean): Promise<Result> {
  try {
    const admin = await requireAdmin();
    const data = { maintenance: on, changed_at: new Date().toISOString(), by: admin.email };
    const { error } = await supabaseAdmin().from('content_blocks').upsert({ key: 'site_status', data });
    if (error) throw error;
    publish();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/*  Poptávky z formuláře                                               */
/* ------------------------------------------------------------------ */

/** Poslední poptávky (nejnovější první) — jen pro přihlášeného správce. */
export async function listInquiries(): Promise<{ ok: true; items: Inquiry[] } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    return { ok: true, items: await readInquiries() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function setInquiryStatus(id: string, status: InquiryStatus, note?: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!id.startsWith(INQUIRY_PREFIX) || !['new', 'progress', 'done'].includes(status)) return { ok: false, error: 'Neplatná poptávka.' };
    const db = supabaseAdmin();
    const { data, error } = await db.from('content_blocks').select('data').eq('key', id).maybeSingle();
    if (error) throw error;
    if (!data) return { ok: false, error: 'Poptávka už neexistuje.' };
    const next = { ...(data.data as Record<string, unknown>), status, ...(note !== undefined ? { note: note.slice(0, 2000) } : {}) };
    const { error: upErr } = await db.from('content_blocks').update({ data: next }).eq('key', id);
    if (upErr) throw upErr;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteInquiry(id: string): Promise<Result> {
  try {
    await requireAdmin();
    if (!id.startsWith(INQUIRY_PREFIX)) return { ok: false, error: 'Neplatná poptávka.' };
    const { error } = await supabaseAdmin().from('content_blocks').delete().eq('key', id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
