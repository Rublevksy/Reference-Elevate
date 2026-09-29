import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/supabase/requireAdmin';
import { LoginForm } from '../_components/LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAdmin()) redirect('/admin');
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <p className="font-display text-sm tracking-[0.3em] text-muted">ELEVATE</p>
        <h1 className="mt-3 font-display text-2xl font-bold uppercase">Administrace</h1>
        <p className="mt-2 text-sm text-muted">Pošleme vám přihlašovací odkaz na e-mail.</p>
        {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">Přihlášení se nepovedlo nebo odkaz vypršel. Zkuste to znovu.</p> : null}
        <LoginForm />
      </div>
    </main>
  );
}
