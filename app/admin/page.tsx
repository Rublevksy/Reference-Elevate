import { redirect } from 'next/navigation';
import csMessages from '@/messages/cs.json';
import { site } from '@/content/site';
import type { ProjectRow } from '@/lib/content/projects';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { currentAdmin } from '@/lib/supabase/requireAdmin';
import { AdminApp } from './_components/AdminApp';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await currentAdmin();
  if (!admin) redirect('/admin/login');

  const db = supabaseAdmin();
  const [projects, blocks] = await Promise.all([
    db.from('projects').select('*').order('sort').order('created_at'),
    db.from('content_blocks').select('key, data'),
  ]);
  // tabulky ještě nejsou → návod ke spuštění migrace
  if (projects.error || blocks.error) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16">
        <h1 className="font-display text-xl font-bold uppercase">Databáze není připravená</h1>
        <p className="mt-4 text-muted">
          Spusťte jednou soubor <code className="text-ink">supabase/migrations/0001_content.sql</code> v Supabase → SQL Editor → Run. Vytvoří tabulky, úložiště obrázků a přenese současný obsah webu.
        </p>
        <p className="mt-3 text-sm text-muted">Chyba: {(projects.error ?? blocks.error)?.message}</p>
      </main>
    );
  }
  const block = (key: string) => blocks.data?.find((b) => b.key === key)?.data as Record<string, unknown> | undefined;
  const pricing = (block('pricing_cs') ?? csMessages.pricing) as Record<string, unknown>;
  const settings = block('settings') as { contact_email?: string } | undefined;

  return (
    <AdminApp
      email={admin.email}
      projects={(projects.data ?? []) as ProjectRow[]}
      pricing={pricing}
      contactEmail={settings?.contact_email ?? site.email}
    />
  );
}
