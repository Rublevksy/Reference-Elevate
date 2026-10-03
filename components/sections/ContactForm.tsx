'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ImageIcon, Lightbulb, Loader2, Mail, MapPin, PenTool, Phone, Plus, RefreshCw, Sparkles, SquareDashed, Type, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from '@/i18n/navigation';
import { Confetti } from '@/components/ui/Confetti';
import { SplitHeading } from '@/components/ui/SplitHeading';
import {
  CHANNEL,
  CHANNEL_ORDER,
  COLOR_SWATCHES,
  MAX_REFS,
  NICHE_OTHER,
  START_OLD_SITE,
  conditionalIssues,
  makeContactSchema,
  type ContactInput,
} from '@/lib/contactSchema';
import { site } from '@/content/site';
import { useIndustries, useSiteContact } from '@/components/ContentProvider';
import { industryName } from '@/lib/content/gallery';
import { IndustryGallery } from './IndustryGallery';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { TURNSTILE_SITE_KEY, Turnstile, type TurnstileEvent, type TurnstileHandle } from '@/components/ui/Turnstile';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Poptávkový formulář — pět kroků ve skleněné kartě nad pomalou „aurorou".
 * Vzhled je celý ve stylech `qf-*` (globals.css): gradientní obrys karty,
 * pilulky voleb, dlaždice, pole s gradientním fokusem, tlačítko s obíhajícím
 * světlem. Žádné nativní zaškrtávací prvky, žádný maskot — nápověda kroku je
 * řádek s ikonou.
 */

/* Která pole který krok kontroluje. */
const STEP_FIELDS: (keyof ContactInput)[][] = [
  ['needs', 'niche', 'nicheDetail'],
  ['start', 'currentSite', 'assets'],
  ['likes', 'refs', 'style', 'colors', 'colorNote'],
  ['budget', 'timeline', 'deadline'],
  ['name', 'email', 'channel', 'phone', 'telegram', 'message', 'consent'],
];

type Reactions = Record<'needs' | 'niches' | 'starts' | 'styles' | 'budgets' | 'timelines' | 'channels', string[]>;

const START_ICONS = [SquareDashed, RefreshCw, Lightbulb];
const ASSET_ICONS = [PenTool, Type, ImageIcon, BookOpen];

function ChannelIcon({ index, className }: { index: number; className: string }) {
  if (index === CHANNEL.whatsapp) return <SocialIcon brand="whatsapp" className={className} />;
  if (index === CHANNEL.telegram) return <SocialIcon brand="telegram" className={className} />;
  const Icon = index === CHANNEL.phone ? Phone : Mail;
  return <Icon className={className} aria-hidden />;
}

/** Miniatura stylu — malý abstraktní náhled místo slovního popisu. */
const STYLE_PREVIEWS: ReactNode[] = [
  // čistý a minimalistický
  <span key="0" className="absolute inset-0 bg-[#f4f6fb]">
    <span className="absolute left-2 top-2 h-1 w-8 rounded-full bg-[#1b2133]" />
    <span className="absolute left-2 top-4 h-[3px] w-12 rounded-full bg-[#c9cfdc]" />
    <span className="absolute left-2 top-[22px] h-[3px] w-10 rounded-full bg-[#c9cfdc]" />
    <span className="absolute bottom-2 left-2 h-2 w-6 rounded-sm border border-[#1b2133]" />
  </span>,
  // výrazný a odvážný
  <span key="1" className="absolute inset-0 bg-[#0b0d12]">
    <span className="absolute left-1.5 top-1.5 font-display text-[15px] font-black leading-none text-white">BIG</span>
    <span className="absolute bottom-0 right-0 h-5 w-9 bg-[#ff3d57]" />
    <span className="absolute bottom-2 left-1.5 h-1.5 w-7 bg-[#ffd23d]" />
  </span>,
  // prémiový a elegantní
  <span key="2" className="absolute inset-0 bg-[linear-gradient(160deg,#17130c,#0b0906)]">
    <span className="absolute left-1/2 top-2 -translate-x-1/2 font-serif text-[15px] italic leading-none text-[#e3c78a]">Aa</span>
    <span className="absolute bottom-3 left-1/2 h-px w-10 -translate-x-1/2 bg-[#c9a24a]" />
    <span className="absolute bottom-1.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-[#6d5a33]" />
  </span>,
  // hravý a barevný
  <span key="3" className="absolute inset-0 bg-[#fff4e8]">
    <span className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full bg-[#ff7a59]" />
    <span className="absolute right-2 top-2 h-3 w-3 rotate-12 rounded-[3px] bg-[#7c4dff]" />
    <span className="absolute bottom-1.5 left-5 h-3.5 w-3.5 rounded-full bg-[#1fae6b]" />
    <span className="absolute bottom-2 right-2.5 h-2 w-5 rounded-full bg-[#ffc933]" />
  </span>,
  // technický a tmavý
  <span
    key="4"
    className="absolute inset-0 bg-[#050811]"
    style={{ backgroundImage: 'linear-gradient(rgba(61,123,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(61,123,255,0.18) 1px, transparent 1px)', backgroundSize: '8px 8px' }}
  >
    <span className="absolute left-2 top-2 h-1 w-7 rounded-full bg-[#3d7bff] shadow-[0_0_6px_#3d7bff]" />
    <span className="absolute bottom-2 left-2 right-2 h-px bg-[linear-gradient(90deg,transparent,#5fd4ff,transparent)]" />
  </span>,
  // nechám na vás
  <span key="5" className="absolute inset-0 grid place-items-center border border-dashed border-[rgba(140,170,255,0.45)] bg-[rgba(31,91,255,0.08)]">
    <Sparkles className="h-4 w-4 text-[var(--blue-bright)]" aria-hidden />
  </span>,
];


/** Pilulka volby: výběr = gradientní výplň, záře a krátké „nadechnutí". */
function Pill({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="qf-pill">
      {on || icon ? (
        <span aria-hidden className="qf-pill-mark">{on ? <Check className="h-3 w-3" strokeWidth={3.2} /> : icon}</span>
      ) : null}
      <span className="min-w-0 text-left">{children}</span>
    </button>
  );
}

/** Otázka: popisek běžným písmem (ne verzálky), nápověda vpravo. */
function Field({ label, hint, optional, error, children, htmlFor }: { label: string; hint?: string; optional?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  const Title = htmlFor ? 'label' : 'p';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <Title {...(htmlFor ? { htmlFor } : {})} className="text-[13.5px] font-semibold text-[#e6ecff]">
          {label}
          {optional ? <span className="ml-2 text-xs font-normal text-[rgba(160,172,205,0.75)]">{optional}</span> : null}
        </Title>
        {hint ? <p className="text-xs leading-snug text-[rgba(160,172,205,0.8)]">{hint}</p> : null}
      </div>
      <div className="mt-3">{children}</div>
      {error ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-[#ff9aa8]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a6e] shadow-[0_0_8px_#ff5a6e]" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Směr přechodu mezi kroky: dopředu zprava, zpátky zleva; odchod kratší než příchod. */
const STEP_VARIANTS: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 26, filter: 'blur(4px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (dir: number) => ({ opacity: 0, x: dir * -14, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const } }),
};

/** Plynulá výška obsahu — kroky jsou různě dlouhé, karta neposkočí. */
function AutoHeight({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');
  useEffect(() => {
    const node = inner.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div style={{ height, transition: reduced ? undefined : 'height 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }} className="-mx-2 overflow-hidden px-2">
      <div ref={inner} className="pb-1">{children}</div>
    </div>
  );
}

export function Contact() {
  const { contactEmail, city, social } = useSiteContact();
  const stageRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('contact');
  const locale = useLocale();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  /** směr posledního přechodu (1 = dál, -1 = zpět) — kvůli animaci kroků */
  const [dir, setDir] = useState(1);
  const [maxStep, setMaxStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  /** reakce na poslední volbu — nahradí nápovědu kroku, při změně kroku zmizí */
  const [said, setSaid] = useState<string | null>(null);
  // Turnstile: token (jednorázový), zda Cloudflare chce kliknutí, zda widget selhává
  const captchaRef = useRef<TurnstileHandle>(null);
  const captchaToken = useRef('');
  const captchaWaiters = useRef<((token: string) => void)[]>([]);
  const [captchaAsk, setCaptchaAsk] = useState(false);
  const [captchaBroken, setCaptchaBroken] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const nicheDetailRef = useRef<HTMLInputElement | null>(null);

  const steps = t.raw('steps') as string[];
  const questions = t.raw('questions') as string[];
  const hints = t.raw('hints') as string[];
  const needs = t.raw('needs') as string[];
  // obory z administrace (společný seznam s galerií ukázek)
  const industries = useIndustries();
  const starts = t.raw('starts') as string[];
  const assets = t.raw('assets') as string[];
  const styles = t.raw('styles') as string[];
  const colors = t.raw('colors') as string[];
  const budgets = t.raw('budgets') as string[];
  const timelines = t.raw('timelines') as string[];
  const channels = t.raw('channels') as string[];
  const reactions = t.raw('reactions') as Reactions;
  const last = steps.length - 1;

  const schema = useMemo(
    () =>
      makeContactSchema({
        needs: t('errors.needs'),
        niche: t('errors.niche'),
        start: t('errors.start'),
        currentSite: t('errors.currentSite'),
        budget: t('errors.budget'),
        timeline: t('errors.timeline'),
        name: t('errors.name'),
        email: t('errors.email'),
        phone: t('errors.phone'),
        whatsapp: t('errors.whatsapp'),
        telegram: t('errors.telegram'),
        message: t('errors.message'),
        site: t('errors.site'),
        consent: t('errors.consent'),
      }),
    [t],
  );

  const {
    register, handleSubmit, trigger, watch, setValue, getValues, setError, clearErrors,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      needs: [], plan: '', niche: '', nicheDetail: '',
      start: -1, currentSite: '', assets: [],
      likes: [], refs: [''], style: -1, colors: [], colorNote: '',
      budget: -1, timeline: -1, deadline: '',
      name: '', email: '', channel: CHANNEL.email, phone: '', telegram: '', message: '',
      website: '', locale,
    },
  });

  useEffect(() => {
    (['needs', 'niche', 'start', 'assets', 'likes', 'refs', 'style', 'colors', 'budget', 'timeline', 'channel', 'consent', 'plan'] as const).forEach((name) => register(name));
  }, [register]);

  const v = watch();

  const react = useCallback(
    (group: keyof Reactions, index: number) => {
      const text = reactions[group]?.[index];
      if (text) setSaid(text);
    },
    [reactions],
  );
  useEffect(() => setSaid(null), [step]);

  // výběr balíčku z Ceníku → předvyplnit typ projektu a ukázat vybraný balíček
  const onPreselect = useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<{ needIndex: number; plan: string }>).detail;
      const current = getValues('needs') ?? [];
      if (detail.needIndex >= 0 && detail.needIndex < needs.length && !current.includes(detail.needIndex)) {
        setValue('needs', [...current, detail.needIndex]);
        clearErrors('needs');
      }
      if (detail.plan) setValue('plan', detail.plan);
      setStatus((s) => (s === 'done' ? s : 'idle'));
      setStep(0);
      react('needs', detail.needIndex);
    },
    [needs.length, getValues, setValue, clearErrors, react],
  );

  useEffect(() => {
    window.addEventListener('elevate:preselect', onPreselect);
    return () => window.removeEventListener('elevate:preselect', onPreselect);
  }, [onPreselect]);

  const toggle = (name: 'needs' | 'assets' | 'colors', index: number) => {
    const list = (getValues(name) ?? []) as number[];
    const on = !list.includes(index);
    setValue(name, on ? [...list, index] : list.filter((i) => i !== index));
    clearErrors(name);
    return on;
  };

  const choose = (name: 'start' | 'style' | 'budget' | 'timeline' | 'channel', index: number) => {
    setValue(name, index);
    clearErrors(name);
  };

  /** Kontrola jednoho kroku: schéma + pole povinná podle jiné odpovědi. */
  const validateStep = async (s: number) => {
    const ok = await trigger(STEP_FIELDS[s]);
    const conditional = conditionalIssues(getValues()).filter((c) => STEP_FIELDS[s].includes(c.field));
    conditional.forEach((c) => setError(c.field, { message: t(`errors.${c.message}`) }));
    return ok && conditional.length === 0;
  };

  // po přepnutí kroku držet začátek formuláře v okně (hlavně na mobilu)
  const keepInView = () => {
    const node = cardRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top;
    if (top < 70 || top > window.innerHeight * 0.5) {
      const y = window.scrollY + top - 96;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: reduced ? 0 : 0.6 });
      else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  const goStep = async (target: number) => {
    if (target === step) return;
    setDir(target > step ? 1 : -1);
    if (target < step) {
      setStep(target);
      keepInView();
      return;
    }
    for (let s = step; s < target; s++) {
      if (!(await validateStep(s))) {
        setStep(s);
        return;
      }
    }
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
    keepInView();
  };

  const captchaAskRef = useRef(false);
  // hlášky o ověření zmizí, jakmile token dorazí
  const captchaMessages = useRef<string[]>([]);
  captchaMessages.current = [t('errors.captchaWait'), t('errors.captchaTick'), t('errors.captcha')];
  const onCaptcha = useCallback((event: TurnstileEvent) => {
    if (event.type === 'token') {
      captchaToken.current = event.token;
      if (!event.token) return;
      setCaptchaBroken(false);
      setServerError((e) => (e && captchaMessages.current.includes(e) ? null : e));
      captchaWaiters.current.splice(0).forEach((resolve) => resolve(event.token));
    } else if (event.type === 'interactive') {
      captchaAskRef.current = event.on;
      setCaptchaAsk(event.on);
      // Cloudflare chce kliknutí → nečekat potichu, ukázat políčko a říct proč
      if (event.on) captchaWaiters.current.splice(0).forEach((resolve) => resolve(''));
    } else {
      setCaptchaBroken(true);
    }
  }, []);

  /** Počká na token Turnstile; '' když nepřijde včas nebo je potřeba zaškrtnout políčko. */
  const waitForCaptcha = (timeout: number) =>
    new Promise<string>((resolve) => {
      const done = (token: string) => {
        window.clearTimeout(timer);
        captchaWaiters.current = captchaWaiters.current.filter((fn) => fn !== done);
        resolve(token);
      };
      const timer = window.setTimeout(() => done(''), timeout);
      captchaWaiters.current.push(done);
    });

  const onSubmit = async (values: ContactInput) => {
    const conditional = conditionalIssues(values);
    if (conditional.length) {
      conditional.forEach((c) => setError(c.field, { message: t(`errors.${c.message}`) }));
      return;
    }
    setServerError(null);
    let captcha = captchaToken.current;
    if (TURNSTILE_SITE_KEY && !captcha) {
      if (captchaAsk) {
        setServerError(t('errors.captchaTick'));
        return;
      }
      // ověření ještě běží na pozadí → počkat na token (nebo na políčko k zaškrtnutí)
      setStatus('verifying');
      captcha = await waitForCaptcha(captchaBroken ? 4000 : 15000);
      if (!captcha) {
        setStatus('idle');
        setServerError(captchaBroken ? `${t('errors.captchaBroken')} ${contactEmail}` : t(captchaAskRef.current ? 'errors.captchaTick' : 'errors.captchaWait'));
        return;
      }
    }
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, refs: values.refs.filter((r) => r.trim()), locale, captcha }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; to?: string };
      if (!response.ok || !data.ok) {
        const code = data.code ?? 'generic';
        const key = ['rate', 'server', 'send', 'captcha'].includes(code) ? code : 'generic';
        throw new Error(key === 'send' ? `${t('errors.send')} ${data.to ?? contactEmail}` : t(`errors.${key}`));
      }
      setStatus('done');
    } catch (error) {
      setStatus('error');
      // TypeError = výpadek sítě (fetch), jinak naše srozumitelná hláška
      setServerError(error instanceof Error && !(error instanceof TypeError) ? error.message : t('errors.generic'));
    } finally {
      // token platí jen jednou → hned připravit nový pro případný další pokus
      captchaRef.current?.reset();
    }
  };

  // neplatné odeslání: ukázat i chyby polí povinných podle jiné odpovědi (telefon…)
  const onInvalid = () => {
    conditionalIssues(getValues()).forEach((c) => setError(c.field, { message: t(`errors.${c.message}`) }));
  };

  // Enter v textovém poli = další krok (ne odeslání rozpracovaného formuláře)
  const onKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || step === last) return;
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT') {
      event.preventDefault();
      void goStep(step + 1);
    }
  };

  const hint = said ?? hints[step];

  const refs = v.refs?.length ? v.refs : [''];
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /** Shrnutí na posledním kroku — co už víme, s odkazem zpět na krok. */
  const summary: { step: number; text: string }[] = [
    { step: 0, text: [v.needs.map((i) => needs[i]).join(', '), v.plan].filter(Boolean).join(' · ') },
    { step: 0, text: v.niche ? [industryName(industries.find((i) => i.id === v.niche), locale), v.nicheDetail].filter(Boolean).join(' — ') : '' },
    { step: 1, text: v.start >= 0 ? [starts[v.start], v.start === START_OLD_SITE ? v.currentSite : ''].filter(Boolean).join(' — ') : '' },
    { step: 2, text: [v.likes?.length ? t('gallery.likedShort', { count: v.likes.length }) : '', v.style >= 0 ? styles[v.style] : '', v.colors.map((i) => colors[i]).join(', ')].filter(Boolean).join(' · ') },
    { step: 3, text: [v.budget >= 0 ? budgets[v.budget] : '', v.timeline >= 0 ? timelines[v.timeline] : ''].filter(Boolean).join(' · ') },
  ].filter((row) => row.text);


  const done = status === 'done';
  const busy = status === 'sending' || status === 'verifying';

  // aurora a odlesk běží jen, když je formulář na obrazovce
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => node.toggleAttribute('data-live', entry.isIntersecting), { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="kontakt" className="relative overflow-x-clip py-20 md:py-28" aria-labelledby="kontakt-title">
      <div className="shell max-sm:px-3">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            id="kontakt-title"
            className="mt-4 font-display text-[clamp(1.6rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted md:mt-5 md:text-base">{t('lead')}</p>
        </div>

        <div ref={stageRef} className="qf-stage relative mx-auto mt-9 max-w-[780px] md:mt-14">
          {/* aurora za sklem — tři měkká světla, pomalu se přelévají */}
          <div aria-hidden className="qf-aurora">
            <i className="qf-a1" />
            <i className="qf-a2" />
            <i className="qf-a3" />
          </div>

          <div ref={cardRef} className="qf-card scroll-mt-24">
            <span aria-hidden className="qf-sheen" />

            {/* ---- hlavička: krok + průběh ---- */}
            <header className="relative px-5 pt-5 sm:px-9 sm:pt-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {!done && step > 0 ? (
                    <button type="button" onClick={() => void goStep(step - 1)} aria-label={t('back')} className="qf-back sm:hidden">
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                  <p className="truncate text-[13px] text-[rgba(170,182,214,0.9)]">
                    {done ? (
                      <span className="font-semibold text-[#cfe0ff]">{t('doneLabel')}</span>
                    ) : (
                      <>
                        {t('stepLabel')} <span className="font-semibold text-white">{step + 1}</span> / {steps.length}
                        <span className="mx-2 text-[rgba(170,182,214,0.4)]">—</span>
                        <span className="font-semibold text-[#cfe0ff]">{steps[step]}</span>
                      </>
                    )}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums text-xs text-[rgba(170,182,214,0.7)]">{Math.round((done ? 1 : (step + (maxStep > step ? 1 : 0.5)) / steps.length) * 100)} %</span>
              </div>

              <ol className="qf-steps mt-4 sm:mt-6" aria-label={t('stepLabel')}>
                <span aria-hidden className="qf-track">
                  <motion.span
                    className="qf-track-fill"
                    initial={false}
                    animate={{ width: `${(done ? 1 : step / last) * 100}%` }}
                    transition={{ duration: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
                {steps.map((label, i) => {
                  const reachable = !done && (i <= maxStep || i === step + 1);
                  const state = done || i < step ? 'done' : i === step ? 'current' : 'todo';
                  return (
                    <li key={label}>
                      <button
                        type="button"
                        onClick={() => void goStep(i)}
                        disabled={!reachable}
                        aria-current={state === 'current' ? 'step' : undefined}
                        aria-label={`${t('stepLabel')} ${i + 1}: ${label}`}
                        className="qf-step"
                        data-state={state}
                      >
                        <span className="qf-node">
                          <AnimatePresence mode="wait" initial={false}>
                            {state === 'done' ? (
                              <motion.span key="c" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}>
                                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                              </motion.span>
                            ) : (
                              <motion.span key="n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {i + 1}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                        <span className="qf-step-label">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </header>

            <div className="relative px-5 sm:px-9">
              <AnimatePresence mode="wait" initial={false}>
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="relative pb-9 pt-10 text-center sm:pb-12 sm:pt-12"
                  >
                    <Confetti />
                    <div className="relative z-10">
                      <motion.span
                        initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
                        className="qf-success mx-auto grid h-20 w-20 place-items-center rounded-full text-white"
                      >
                        <Check className="h-9 w-9" strokeWidth={2.4} aria-hidden />
                      </motion.span>
                      <h3 className="mt-7 font-display text-[clamp(1.4rem,3.6vw,2.1rem)] font-bold uppercase leading-tight">{t('successTitle')}</h3>
                      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[rgba(190,200,228,0.9)]">
                        {t('successText')}{' '}
                        <a href="#proces" className="text-[#9fc0ff] underline-offset-4 hover:underline">
                          {t('successLink')}
                        </a>
                        .
                      </p>
                      <p className="mt-9 text-[13px] font-semibold text-[#cfe0ff]">{t('successNextLabel')}</p>
                      <ol className="mx-auto mt-3 grid max-w-2xl gap-2.5 text-left sm:grid-cols-3">
                        {(t.raw('successNext') as string[]).map((item, i) => (
                          <motion.li
                            key={item}
                            initial={reduced ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: reduced ? 0 : 0.35 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="qf-note flex items-start gap-3 sm:flex-col sm:gap-3"
                          >
                            <span className="qf-num">{i + 1}</span>
                            <span className="text-[13.5px] leading-snug text-[rgba(226,232,248,0.92)]">{item}</span>
                          </motion.li>
                        ))}
                      </ol>
                      <a href="#reference" className="qf-ghost mt-9 inline-flex">
                        {t('successWorks')}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </a>
                    </div>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubmit(onSubmit, onInvalid)} onKeyDown={onKeyDown} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} noValidate>
                    <div className="absolute -left-[9999px] top-0" aria-hidden>
                      <label htmlFor="website">{t('honeypot')}</label>
                      <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
                    </div>

                    <AutoHeight reduced={reduced}>
                      <AnimatePresence mode="wait" initial={false} custom={dir}>
                        <motion.fieldset
                          key={step}
                          custom={dir}
                          variants={STEP_VARIANTS}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ duration: reduced ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }}
                          className="min-w-0 pt-7 sm:pt-9"
                        >
                          <legend className="sr-only">{questions[step]}</legend>
                          <h3 aria-hidden className="font-display text-[clamp(1.25rem,3.2vw,1.7rem)] font-bold uppercase leading-[1.12]">{questions[step]}</h3>
                          {/* nápověda kroku / reakce na volbu — řádek s ikonou místo postavy */}
                          <div className="qf-hint mt-3" role="status" aria-live="polite">
                            <Sparkles className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#9fb8ff]" aria-hidden />
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span key={hint} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.22 }}>
                                {hint}
                              </motion.span>
                            </AnimatePresence>
                          </div>

                          {step === 0 ? (
                            <div className="mt-7 space-y-8">
                              <Field label={t('needsLabel')} hint={t('needsHint')} error={errors.needs?.message}>
                                {v.plan ? (
                                  <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(124,77,255,0.5)] bg-[rgba(124,77,255,0.12)] py-1.5 pl-3.5 pr-1.5 text-xs text-white">
                                    <span className="text-[rgba(190,200,228,0.8)]">{t('planLabel')}:</span> {v.plan}
                                    <button type="button" onClick={() => setValue('plan', '')} aria-label={t('removePlan')} className="grid h-6 w-6 place-items-center rounded-full text-[rgba(190,200,228,0.8)] hover:bg-white/10 hover:text-white">
                                      <X className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </p>
                                ) : null}
                                <div className="qf-pills">
                                  {needs.map((item, i) => (
                                    <Pill
                                      key={item}
                                      on={v.needs.includes(i)}
                                      onClick={() => {
                                        if (toggle('needs', i)) react('needs', i);
                                      }}
                                    >
                                      {item}
                                    </Pill>
                                  ))}
                                </div>
                              </Field>

                              <Field label={t('nicheLabel')} error={errors.niche?.message}>
                                <div className="qf-pills">
                                  {industries.map((item) => (
                                    <Pill
                                      key={item.id}
                                      on={v.niche === item.id}
                                      onClick={() => {
                                        if (v.niche !== item.id) setValue('likes', []); // ukázky jiného oboru už nesedí
                                        setValue('niche', item.id);
                                        clearErrors('niche');
                                        if (item.legacy !== undefined) react('niches', item.legacy);
                                        else setSaid(t('reactions.nicheAny'));
                                        if (item.id === NICHE_OTHER) window.setTimeout(() => nicheDetailRef.current?.focus(), 60);
                                      }}
                                    >
                                      {industryName(item, locale)}
                                    </Pill>
                                  ))}
                                </div>
                                <div className="mt-5">
                                  <label htmlFor="nicheDetail" className="text-xs text-[rgba(160,172,205,0.85)]">
                                    {t('nicheDetailLabel')} {v.niche === NICHE_OTHER ? null : <span>({t('optional')})</span>}
                                  </label>
                                  {(() => {
                                    const reg = register('nicheDetail');
                                    return (
                                      <input
                                        id="nicheDetail"
                                        type="text"
                                        placeholder={t('nicheDetailPlaceholder')}
                                        className="qf-input mt-2"
                                        {...reg}
                                        ref={(el) => {
                                          reg.ref(el);
                                          nicheDetailRef.current = el;
                                        }}
                                      />
                                    );
                                  })()}
                                </div>
                              </Field>
                            </div>
                          ) : null}

                          {step === 1 ? (
                            <div className="mt-7 space-y-8">
                              <Field label={t('startLabel')} error={errors.start?.message}>
                                <div className="grid gap-2.5 sm:grid-cols-3">
                                  {starts.map((item, i) => {
                                    const Icon = START_ICONS[i] ?? Sparkles;
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        aria-pressed={v.start === i}
                                        className="qf-tile qf-tile-start"
                                        onClick={() => {
                                          choose('start', i);
                                          react('starts', i);
                                        }}
                                      >
                                        <span className="qf-tile-icon" aria-hidden>
                                          <Icon className="h-[18px] w-[18px]" />
                                        </span>
                                        <span className="min-w-0 flex-1 text-[14px] leading-snug">{item}</span>
                                        <span className="qf-radio" aria-hidden />
                                      </button>
                                    );
                                  })}
                                </div>
                              </Field>

                              <AnimatePresence initial={false}>
                                {v.start === START_OLD_SITE ? (
                                  <motion.div key="site" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduced ? 0 : 0.35 }} className="-mx-2 overflow-hidden px-2">
                                    <Field label={t('currentSiteLabel')} htmlFor="currentSite" error={errors.currentSite?.message}>
                                      <input id="currentSite" type="text" inputMode="url" placeholder={t('currentSitePlaceholder')} className="qf-input" {...register('currentSite', { onChange: () => clearErrors('currentSite') })} />
                                    </Field>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>

                              <Field label={t('assetsLabel')} optional={t('optional')}>
                                <div className="qf-pills">
                                  {assets.map((item, i) => {
                                    const Icon = ASSET_ICONS[i] ?? Plus;
                                    return (
                                      <Pill key={item} on={v.assets.includes(i)} onClick={() => toggle('assets', i)} icon={<Icon className="h-3.5 w-3.5" />}>
                                        {item}
                                      </Pill>
                                    );
                                  })}
                                </div>
                              </Field>
                            </div>
                          ) : null}

                          {step === 2 ? (
                            <div className="mt-7 space-y-8">
                              {v.niche ? (
                                <IndustryGallery
                                  industryId={v.niche}
                                  industryLabel={industryName(industries.find((i) => i.id === v.niche), locale)}
                                  likes={v.likes ?? []}
                                  onLikes={(ids) => setValue('likes', ids)}
                                  onLike={() => setSaid(t('gallery.react'))}
                                />
                              ) : null}

                              <Field label={t('refsLabel')} hint={t('refsHint')} optional={t('optional')} error={errors.refs?.message}>
                                <div className="space-y-2.5">
                                  {refs.map((value, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        inputMode="url"
                                        aria-label={`${t('refsLabel')} ${i + 1}`}
                                        placeholder={t('refsPlaceholder')}
                                        value={value}
                                        onChange={(event) => {
                                          const next = [...refs];
                                          next[i] = event.target.value;
                                          setValue('refs', next);
                                        }}
                                        className="qf-input"
                                      />
                                      {refs.length > 1 ? (
                                        <button type="button" onClick={() => setValue('refs', refs.filter((_, j) => j !== i))} aria-label={t('refsRemove')} className="qf-icon-btn">
                                          <X className="h-4 w-4" aria-hidden />
                                        </button>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                                {refs.length < MAX_REFS ? (
                                  <button type="button" onClick={() => setValue('refs', [...refs, ''])} className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium text-[#9fc0ff] transition-colors hover:text-white">
                                    <Plus className="h-4 w-4" aria-hidden />
                                    {t('refsAdd')}
                                  </button>
                                ) : null}
                              </Field>

                              <Field label={t('styleLabel')} optional={t('optional')}>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                  {styles.map((item, i) => {
                                    const on = v.style === i;
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        aria-pressed={on}
                                        className="qf-tile qf-tile-col !gap-2.5 !p-2.5"
                                        onClick={() => {
                                          choose('style', on ? -1 : i);
                                          if (!on) react('styles', i);
                                        }}
                                      >
                                        <span aria-hidden className="relative block h-14 w-full overflow-hidden rounded-[10px] ring-1 ring-white/10">
                                          {STYLE_PREVIEWS[i]}
                                        </span>
                                        <span className="px-1 pb-0.5 text-[13px] leading-snug">{item}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </Field>

                              <Field label={t('colorsLabel')} optional={t('optional')}>
                                <div className="grid grid-cols-8 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                                  {colors.map((name, i) => {
                                    const on = v.colors.includes(i);
                                    return (
                                      <button
                                        key={name}
                                        type="button"
                                        aria-pressed={on}
                                        aria-label={name}
                                        title={name}
                                        onClick={() => toggle('colors', i)}
                                        className="qf-swatch"
                                        style={{ background: COLOR_SWATCHES[i] }}
                                      >
                                        {on ? <Check className={`h-4 w-4 ${i === 2 ? 'text-[#0b0d12]' : 'text-white'}`} strokeWidth={3} aria-hidden /> : null}
                                      </button>
                                    );
                                  })}
                                </div>
                                {v.colors.length ? <p className="mt-3 text-xs text-[rgba(160,172,205,0.85)]">{v.colors.map((i) => colors[i]).join(', ')}</p> : null}
                                <input type="text" aria-label={t('colorsLabel')} placeholder={t('colorNotePlaceholder')} className="qf-input mt-3.5" {...register('colorNote')} />
                              </Field>
                            </div>
                          ) : null}

                          {step === 3 ? (
                            <div className="mt-7 space-y-8">
                              <Field label={t('budgetLabel')} hint={t('budgetHint')} error={errors.budget?.message}>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                  {budgets.map((item, i) => (
                                    <button
                                      key={item}
                                      type="button"
                                      aria-pressed={v.budget === i}
                                      className="qf-tile justify-center whitespace-nowrap text-center text-[14px] font-semibold tabular-nums"
                                      onClick={() => {
                                        choose('budget', i);
                                        react('budgets', i);
                                      }}
                                    >
                                      {item}
                                    </button>
                                  ))}
                                </div>
                              </Field>

                              <Field label={t('timelineLabel')} error={errors.timeline?.message}>
                                <div className="qf-pills">
                                  {timelines.map((item, i) => (
                                    <Pill
                                      key={item}
                                      on={v.timeline === i}
                                      onClick={() => {
                                        choose('timeline', i);
                                        react('timelines', i);
                                      }}
                                    >
                                      {item}
                                    </Pill>
                                  ))}
                                </div>
                              </Field>

                              <Field label={t('deadlineLabel')} hint={t('deadlineHint')} optional={t('optional')} htmlFor="deadline">
                                <div className="relative sm:max-w-[260px]">
                                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9fb8ff]" aria-hidden />
                                  <input id="deadline" type="date" min={today} className="qf-input !pl-11 [color-scheme:dark]" {...register('deadline')} />
                                </div>
                              </Field>
                            </div>
                          ) : null}

                          {step === 4 ? (
                            <div className="mt-7 space-y-7">
                              <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
                                <Field label={`${t('nameLabel')} *`} htmlFor="name" error={errors.name?.message}>
                                  <input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} className="qf-input" {...register('name')} />
                                </Field>
                                <Field label={`${t('emailLabel')} *`} htmlFor="email" error={errors.email?.message}>
                                  <input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className="qf-input" {...register('email')} />
                                </Field>
                              </div>

                              <Field label={t('channelLabel')}>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                  {CHANNEL_ORDER.map((i) => {
                                    const item = channels[i];
                                    if (!item) return null;
                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        aria-pressed={v.channel === i}
                                        className="qf-tile justify-center !gap-2.5 text-[13.5px]"
                                        onClick={() => {
                                          choose('channel', i);
                                          react('channels', i);
                                        }}
                                      >
                                        <ChannelIcon index={i} className="h-[17px] w-[17px] shrink-0" />
                                        {item}
                                      </button>
                                    );
                                  })}
                                </div>
                              </Field>

                              <AnimatePresence initial={false} mode="wait">
                                {v.channel === CHANNEL.phone || v.channel === CHANNEL.whatsapp ? (
                                  <motion.div key="phone" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                    <Field label={`${v.channel === CHANNEL.whatsapp ? t('whatsappLabel') : t('phoneLabel')} *`} htmlFor="phone" error={errors.phone?.message}>
                                      <input id="phone" type="tel" autoComplete="tel" placeholder={t('phonePlaceholder')} className="qf-input" {...register('phone', { onChange: () => clearErrors('phone') })} />
                                    </Field>
                                  </motion.div>
                                ) : v.channel === CHANNEL.telegram ? (
                                  <motion.div key="telegram" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                    <Field label={`${t('telegramLabel')} *`} htmlFor="telegram" error={errors.telegram?.message}>
                                      <input id="telegram" type="text" autoComplete="off" placeholder={t('telegramPlaceholder')} className="qf-input" {...register('telegram', { onChange: () => clearErrors('telegram') })} />
                                    </Field>
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>

                              <Field label={t('messageLabel')} optional={t('optional')} htmlFor="message" error={errors.message?.message}>
                                <textarea id="message" rows={3} placeholder={t('messagePlaceholder')} className="qf-input resize-y" {...register('message')} />
                              </Field>

                              {summary.length ? (
                                <div className="qf-note">
                                  <p className="text-xs font-semibold text-[#cfe0ff]">{t('summaryLabel')}</p>
                                  <ul className="mt-2.5 divide-y divide-white/[0.06]">
                                    {summary.map((row, i) => (
                                      <li key={i} className="flex items-start justify-between gap-3 py-2 text-[13.5px] first:pt-0 last:pb-0">
                                        <span className="min-w-0 text-[rgba(226,232,248,0.92)]">{row.text}</span>
                                        <button type="button" onClick={() => void goStep(row.step)} className="shrink-0 text-xs font-medium text-[#9fc0ff] underline-offset-4 hover:underline">
                                          {t('edit')}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-[rgba(170,182,214,0.95)]">
                                <input type="checkbox" className="qf-check mt-px shrink-0" onChange={(event) => setValue('consent', event.target.checked as true, { shouldValidate: true })} />
                                <span>
                                  {t('consent')}{' '}
                                  <Link href="/ochrana-osobnich-udaju" className="text-[#9fc0ff] underline-offset-4 hover:underline">
                                    {t('consentLink')}
                                  </Link>
                                  .
                                </span>
                              </label>
                              {errors.consent ? <p className="!mt-2 text-xs text-[#ff9aa8]">{errors.consent.message}</p> : null}
                            </div>
                          ) : null}
                        </motion.fieldset>
                      </AnimatePresence>
                    </AutoHeight>

                    {/* ochrana proti robotům — běžně neviditelná; po prvním příchodu na poslední krok zůstává připojená */}
                    {TURNSTILE_SITE_KEY && maxStep >= last ? (
                      <div className={step === last ? 'mt-5' : 'hidden'}>
                        {captchaAsk ? <p className="mb-2 text-xs text-[rgba(205,214,236,0.9)]">{t('captchaAsk')}</p> : null}
                        <Turnstile ref={captchaRef} language={locale} onEvent={onCaptcha} />
                      </div>
                    ) : null}

                    {serverError ? (
                      <p role="alert" className="mt-5 rounded-2xl border border-[rgba(255,90,110,0.35)] bg-[rgba(255,90,110,0.08)] px-4 py-3 text-[13.5px] leading-snug text-[#ffb3be]">
                        {serverError}
                      </p>
                    ) : null}

                    {/* akce — na telefonu tlačítko přes celou šířku, přilepené dole */}
                    <div className="qf-actions">
                      <button type="button" onClick={() => void goStep(step - 1)} disabled={step === 0} className="qf-back-text max-sm:hidden">
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        {t('back')}
                      </button>
                      <button type={step < last ? 'button' : 'submit'} onClick={step < last ? () => void goStep(step + 1) : undefined} disabled={busy} className="qf-cta">
                        <span className="qf-cta-label">
                          {busy ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              {t(status === 'verifying' ? 'verifying' : 'sending')}
                            </>
                          ) : (
                            <>
                              {step < last ? t('next') : t('submit')}
                              <ArrowRight className="qf-cta-arrow h-4 w-4" aria-hidden />
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* přímé kontakty pod kartou */}
        <ul className="mx-auto mt-7 flex max-w-[780px] flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted">
          <li>
            <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-ink">
              <Mail className="h-4 w-4 text-[#9fb8ff]" aria-hidden />
              {contactEmail}
            </a>
          </li>
          {site.phone ? (
            <li>
              <a href={`tel:${site.phoneHref}`} className="inline-flex items-center gap-2.5 transition-colors hover:text-ink">
                <Phone className="h-4 w-4 text-[#9fb8ff]" aria-hidden />
                {site.phone}
              </a>
            </li>
          ) : null}
          {social
            .filter((item) => item.kind === 'messenger')
            .map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2.5 transition-colors hover:text-ink">
                  <SocialIcon brand={item.brand} className="h-4 w-4 text-[#9fb8ff]" />
                  {item.display || item.label}
                </a>
              </li>
            ))}
          <li className="inline-flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-[#9fb8ff]" aria-hidden />
            {city}
          </li>
          {social
            .filter((item) => item.kind === 'social')
            .map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noreferrer noopener" aria-label={item.label} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 transition-colors hover:border-[rgba(124,150,255,0.6)] hover:text-ink">
                  <SocialIcon brand={item.brand} className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
