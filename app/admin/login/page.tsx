import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { currentAdmin } from '@/lib/supabase/requireAdmin';
import { LoginForm } from '../_components/LoginForm';
import { RememberInquiry } from '../_components/RememberInquiry';
import { INQUIRY_PARAM, isInquiryKey } from '@/lib/inquiryLink';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; inquiry?: string }> }) {
  const { error, inquiry } = await searchParams;
  // odkaz z e-mailu na konkrétní poptávku: přihlášený jde rovnou na ni, ostatním se zapamatuje
  const target = isInquiryKey(inquiry) ? inquiry : null;
  if (await currentAdmin()) redirect(target ? `/admin?${INQUIRY_PARAM}=${encodeURIComponent(target)}` : '/admin');
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      {target ? <RememberInquiry id={target} /> : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgba(31,91,255,0.28), transparent 70%), radial-gradient(40% 30% at 50% 100%, rgba(31,91,255,0.12), transparent 70%)' }}
      />
      <div className="relative w-full max-w-[400px]">
        <div className="flex justify-center">
          <Logo height={30} glow priority />
        </div>
        <div className="relative mt-10 overflow-hidden rounded-card border border-[rgba(110,150,255,0.22)] bg-[linear-gradient(165deg,rgba(18,27,54,0.85),rgba(8,12,24,0.92))] p-7 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-10 top-0 h-[3px]"
            style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.85) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x', filter: 'drop-shadow(0 0 3px rgba(61,123,255,0.9))' }}
          />
          <h1 className="font-display text-lg font-bold uppercase tracking-[0.06em]">Administrace</h1>
          <p className="mt-1.5 text-sm text-muted">{target ? 'Po přihlášení se otevře poptávka z e-mailu.' : 'Správa obsahu webu.'}</p>
          {error ? (
            <p className="mt-5 rounded-xl border border-[rgba(255,90,110,0.4)] bg-[rgba(255,90,110,0.08)] px-3.5 py-2.5 text-sm text-[#ffc2cb]">
              Přihlášení se nepovedlo nebo odkaz vypršel. Zkuste to znovu.
            </p>
          ) : null}
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
