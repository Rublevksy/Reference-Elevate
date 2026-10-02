'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, CalendarDays, Check, FileText, Image as ImageIcon, Loader2, Mail, MapPin, PenTool, Phone, Plus, Sparkles, Type, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import type { Pose } from '@/content/mascot';
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

/* Pět kroků kvalifikačního formuláře — která pole který krok kontroluje. */
const STEP_FIELDS: (keyof ContactInput)[][] = [
  ['needs', 'niche', 'nicheDetail'],
  ['start', 'currentSite', 'assets'],
  ['likes', 'refs', 'style', 'colors', 'colorNote'],
  ['budget', 'timeline', 'deadline'],
  ['name', 'email', 'channel', 'phone', 'telegram', 'message', 'consent'],
];

/** Póza maskota, dokud v kroku nic nevybereš. */
const STEP_POSE: Pose[] = ['point', 'think', 'wave', 'thumbsUp', 'point'];

/** Volby „nevím / nechám na vás" — maskot se nad nimi zamyslí místo palce nahoru. */
const UNSURE = { needs: 6, styles: 5, budgets: 5 } as const;

type Reactions = Record<'needs' | 'niches' | 'starts' | 'styles' | 'budgets' | 'timelines' | 'channels', string[]>;

/** ikony podkladů: logo, texty, fotky, grafický manuál */
const ASSET_ICONS = [PenTool, Type, ImageIcon, BookOpen];

/**
 * Liniové ilustrace k volbám „odkud začínáme" — neonová kresba místo
 * obecné ikony: prázdné plátno, starý web s obnovou, nápad.
 */
const START_ART: ReactNode[] = [
  <svg key="0" viewBox="0 0 72 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="5" width="46" height="34" rx="5" strokeDasharray="3.5 3.5" opacity="0.55" />
    <path d="M29 15v14M22 22h14" />
    <path d="M60 8v6M57 11h6M63 26v4M61 28h4" opacity="0.8" />
  </svg>,
  <svg key="1" viewBox="0 0 72 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="5" width="44" height="34" rx="4" opacity="0.6" />
    <path d="M4 12h44" opacity="0.6" />
    <path d="M10 19h18M10 25h12M10 31h16" opacity="0.45" />
    <path d="M66 18a10 10 0 1 0-2.6 10.2" />
    <path d="M66 10v8h-8" />
  </svg>,
  <svg key="2" viewBox="0 0 72 44" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M36 9a11 11 0 0 0-6.5 19.9c1.3 1 2 2.2 2 3.6V34h9v-1.5c0-1.4.7-2.6 2-3.6A11 11 0 0 0 36 9Z" />
    <path d="M32 38h8" />
    <path d="M36 20v6M33 23h6" opacity="0.7" />
    <path d="M18 18h-5M59 18h-5M22 7l-3.5-3.5M50 7l3.5-3.5" opacity="0.6" />
  </svg>,
];
/** ikona kanálu podle indexu v contact.channels (e-mail, telefon, Telegram, WhatsApp) */
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

/*
 * Vizuální jazyk formuláře = jazyk webu: volby nejsou „pilulky z UI kitu",
 * ale neonové štítky — gradientní rám jako u karet služeb, kontrolka (LED),
 * která se při výběru rozsvítí, přejezd světla při najetí. Styly v globals.css
 * (.neon-chip, .neon-tile, .neon-led).
 */
function Chip({ on, multi = false, onClick, children }: { on: boolean; multi?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="neon-chip">
      <span aria-hidden className={`neon-led ${multi ? 'neon-led-box' : ''}`}>
        {multi && on ? <Check className="h-2 w-2" strokeWidth={4} /> : null}
      </span>
      <span>{children}</span>
    </button>
  );
}

const field =
  'w-full rounded-lg border border-[rgba(110,150,255,0.2)] bg-[rgba(5,9,22,0.6)] px-3.5 py-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-muted/60 hover:border-[rgba(110,150,255,0.36)] focus:border-[rgba(97,150,255,0.8)] focus:shadow-[0_0_0_3px_rgba(31,91,255,0.14),0_0_22px_-8px_rgba(61,123,255,0.8)]';

/** Skupina otázky: popisek ve fontu webu, nápověda na stejném řádku (šetří místo). */
function Group({ label, hint, optional, error, children, htmlFor }: { label: string; hint?: string; optional?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  const Title = htmlFor ? 'label' : 'p';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Title {...(htmlFor ? { htmlFor } : {})} className="font-display text-[10.5px] uppercase tracking-[0.16em] text-[#c6d4f6]">
          {label}
          {optional ? <span className="ml-2 font-sans text-[11px] normal-case tracking-normal text-muted/80">{optional}</span> : null}
        </Title>
        {hint ? <p className="text-[11.5px] leading-snug text-muted">{hint}</p> : null}
      </div>
      <div className="mt-2.5">{children}</div>
      {error ? <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#ff8a9a]"><span className="h-1 w-1 rounded-full bg-[#ff5a6e] shadow-[0_0_6px_#ff5a6e]" />{error}</p> : null}
    </div>
  );
}

export function Contact() {
  const { contactEmail, city, social } = useSiteContact();
  const t = useTranslations('contact');
  const tMascot = useTranslations('mascot');
  const locale = useLocale();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [said, setSaid] = useState<{ text: string; pose: Pose } | null>(null);
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

  /** Maskot reaguje na poslední volbu; při změně kroku se vrátí k nápovědě kroku. */
  const react = useCallback(
    (group: keyof Reactions, index: number, unsure = false) => {
      const text = reactions[group]?.[index];
      if (text) setSaid({ text, pose: unsure ? 'think' : 'thumbsUp' });
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

  const bubbleText = status === 'done' ? tMascot('success') : said?.text ?? hints[step];
  const pose: Pose = status === 'done' ? 'celebrate' : said?.pose ?? STEP_POSE[step];

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

  const mascotBubble = (compact: boolean) => (
    <SpeechBubble key={bubbleText} text={bubbleText} compact={compact} />
  );

  return (
    <section id="kontakt" className="relative py-24 md:py-32" aria-labelledby="kontakt-title">
      <div className="shell">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            id="kontakt-title"
            className="mt-4 font-display text-[clamp(1.7rem,4vw,3rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: t('title') + ' ' }, { text: t('titleAccent'), accent: true }]}
          />
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted md:text-base">{t('lead')}</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
          <div ref={cardRef} className="glass relative overflow-hidden rounded-card p-4 sm:p-6 md:p-7">
            {/* tečkovaná neonová linka a záře nahoře — stejný motiv jako karty webu */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-[3px]"
              style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.8) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }}
            />
            <span aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-40 w-2/3 -translate-x-1/2 rounded-full bg-[rgba(31,91,255,0.12)] blur-3xl" />
            <AnimatePresence mode="wait">
              {status === 'done' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative grid min-h-[420px] place-items-center text-center"
                >
                  <Confetti />
                  <div className="relative z-10">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--blue-bright)] bg-[rgba(31,91,255,0.2)] text-[var(--blue-bright)] shadow-glow">
                      <Check className="h-7 w-7" aria-hidden />
                    </span>
                    <h3 className="mt-6 font-display text-2xl font-bold uppercase">{t('successTitle')}</h3>
                    <p className="mx-auto mt-3 max-w-md text-sm text-muted">
                      {t('successText')}{' '}
                      <a href="#proces" className="text-[var(--blue-bright)] underline-offset-4 hover:underline">
                        {t('successLink')}
                      </a>
                      .
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit(onSubmit, onInvalid)} onKeyDown={onKeyDown} initial={{ opacity: 0 }} animate={{ opacity: 1 }} noValidate>
                  {/* průběh: neonová kolejnice s uzly (jako sekce Proces), hotové kroky jdou rozkliknout */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-between gap-4 font-display text-[10px] uppercase tracking-[0.2em] text-muted">
                      <span>
                        {t('stepLabel')} <span className="text-ink">{String(step + 1).padStart(2, '0')}</span> / {String(steps.length).padStart(2, '0')}
                      </span>
                      <span className="truncate text-[#9fc0ff] sm:hidden">{steps[step]}</span>
                    </div>
                    <ol className="relative mt-4 grid grid-cols-5">
                      {/* kolejnice: podklad, náplň s kometou */}
                      <span aria-hidden className="pointer-events-none absolute left-[10%] right-[10%] top-[17px] h-[2px] rounded-full bg-[rgba(110,150,255,0.16)]" />
                      <span aria-hidden className="pointer-events-none absolute left-[10%] right-[10%] top-[17px] h-[2px]">
                        <motion.span
                          className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--blue),#5fa8ff)] shadow-[0_0_10px_rgba(61,123,255,0.9)]"
                          initial={false}
                          animate={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                          transition={{ duration: reduced ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <span className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#dbe8ff] shadow-[0_0_12px_4px_rgba(61,123,255,0.9)]" />
                        </motion.span>
                      </span>
                      {steps.map((label, i) => {
                        const reachable = i <= maxStep || i === step + 1;
                        const done = i < step;
                        const current = i === step;
                        return (
                          <li key={label} className="relative flex justify-center">
                            <button
                              type="button"
                              onClick={() => void goStep(i)}
                              disabled={!reachable}
                              aria-current={current ? 'step' : undefined}
                              aria-label={`${t('stepLabel')} ${i + 1}: ${label}`}
                              className="group flex flex-col items-center disabled:cursor-default"
                            >
                              <span
                                className={`relative grid h-9 w-9 place-items-center rounded-full border font-display text-[10px] transition-[background,border-color,box-shadow,color] duration-500 ${
                                  current
                                    ? 'border-[#8fb2ff] bg-[radial-gradient(circle_at_50%_35%,#2a4fb8,#0c1638)] text-white shadow-[0_0_0_4px_rgba(31,91,255,0.16),0_0_22px_rgba(61,123,255,0.75)]'
                                    : done
                                      ? 'border-transparent bg-[linear-gradient(135deg,var(--blue),var(--blue-bright))] text-white shadow-[0_0_12px_rgba(31,91,255,0.55)]'
                                      : 'border-[rgba(110,150,255,0.25)] bg-[#0b1227] text-muted group-enabled:group-hover:border-[rgba(150,185,255,0.6)] group-enabled:group-hover:text-ink'
                                }`}
                              >
                                {current && !reduced ? <span aria-hidden className="rail-pulse absolute inset-0 rounded-full" /> : null}
                                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : String(i + 1).padStart(2, '0')}
                              </span>
                              <span
                                className={`mt-2 hidden max-w-full truncate text-[10px] uppercase tracking-[0.12em] transition-colors sm:block ${
                                  current ? 'text-ink' : done ? 'text-[#9fc0ff] group-hover:text-ink' : 'text-muted/60'
                                }`}
                              >
                                {label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>

                  {/* maskot na mobilu přímo ve formuláři — reakce jsou vidět hned u volby */}
                  <div className="mb-6 flex min-h-[92px] items-end gap-3 lg:hidden">
                    <div className="-mb-1 shrink-0">
                      <Mascot pose={pose} height={96} followCursor={false} />
                    </div>
                    <div className="mb-3 min-w-0 flex-1">{mascotBubble(true)}</div>
                  </div>

                  <div className="absolute -left-[9999px] top-0" aria-hidden>
                    <label htmlFor="website">{t('honeypot')}</label>
                    <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.fieldset
                      key={step}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: reduced ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="min-w-0"
                    >
                      <legend className="font-display text-base font-bold uppercase leading-tight md:text-lg">{questions[step]}</legend>

                      {step === 0 ? (
                        <div className="mt-5 space-y-5">
                          <Group label={t('needsLabel')} hint={t('needsHint')} error={errors.needs?.message}>
                            {v.plan ? (
                              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(61,123,255,0.45)] bg-[rgba(31,91,255,0.1)] py-1.5 pl-3.5 pr-1.5 text-xs text-ink">
                                <span className="text-muted">{t('planLabel')}:</span> {v.plan}
                                <button
                                  type="button"
                                  onClick={() => setValue('plan', '')}
                                  aria-label={t('removePlan')}
                                  className="grid h-6 w-6 place-items-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-ink"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                              {needs.map((item, i) => {
                                const on = v.needs.includes(i);
                                return (
                                  <Chip
                                    key={item}
                                    on={on}
                                    multi
                                    onClick={() => {
                                      if (toggle('needs', i)) react('needs', i, i === UNSURE.needs);
                                    }}
                                  >
                                    {item}
                                  </Chip>
                                );
                              })}
                            </div>
                          </Group>

                          <Group label={t('nicheLabel')} error={errors.niche?.message}>
                            <div className="flex flex-wrap gap-2">
                              {industries.map((item) => (
                                <Chip
                                  key={item.id}
                                  on={v.niche === item.id}
                                  onClick={() => {
                                    if (v.niche !== item.id) setValue('likes', []); // ukázky jiného oboru už nesedí
                                    setValue('niche', item.id);
                                    clearErrors('niche');
                                    // původní obory mají vlastní reakci maskota, nové obecnou
                                    if (item.legacy !== undefined) react('niches', item.legacy, item.id === NICHE_OTHER);
                                    else setSaid({ text: t('reactions.nicheAny'), pose: 'thumbsUp' });
                                    if (item.id === NICHE_OTHER) window.setTimeout(() => nicheDetailRef.current?.focus(), 60);
                                  }}
                                >
                                  {industryName(item, locale)}
                                </Chip>
                              ))}
                            </div>
                            <div className="mt-4">
                              <label htmlFor="nicheDetail" className="text-xs text-muted">
                                {t('nicheDetailLabel')} {v.niche === NICHE_OTHER ? null : <span>({t('optional')})</span>}
                              </label>
                              {(() => {
                                const reg = register('nicheDetail');
                                return (
                                  <input
                                    id="nicheDetail"
                                    type="text"
                                    placeholder={t('nicheDetailPlaceholder')}
                                    className={`${field} mt-1.5`}
                                    {...reg}
                                    ref={(el) => {
                                      reg.ref(el);
                                      nicheDetailRef.current = el;
                                    }}
                                  />
                                );
                              })()}
                            </div>
                          </Group>
                        </div>
                      ) : null}

                      {step === 1 ? (
                        <div className="mt-5 space-y-5">
                          <Group label={t('startLabel')} error={errors.start?.message}>
                            <div className="grid gap-2.5 sm:grid-cols-3">
                              {starts.map((item, i) => {
                                const on = v.start === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className="option-card group"
                                    onClick={() => {
                                      choose('start', i);
                                      react('starts', i);
                                    }}
                                  >
                                    <span className="option-art" aria-hidden>
                                      {START_ART[i]}
                                    </span>
                                    <span className="relative min-w-0 flex-1 text-[13.5px] leading-snug">{item}</span>
                                    <span className="option-radio" aria-hidden />
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <AnimatePresence initial={false}>
                            {v.start === START_OLD_SITE ? (
                              <motion.div
                                key="site"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: reduced ? 0 : 0.35 }}
                                className="overflow-hidden"
                              >
                                <Group label={t('currentSiteLabel')} htmlFor="currentSite" error={errors.currentSite?.message}>
                                  <input id="currentSite" type="text" inputMode="url" placeholder={t('currentSitePlaceholder')} className={field} {...register('currentSite', { onChange: () => clearErrors('currentSite') })} />
                                </Group>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>

                          <Group label={t('assetsLabel')} optional={t('optional')}>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {assets.map((item, i) => {
                                const on = v.assets.includes(i);
                                const Icon = ASSET_ICONS[i] ?? FileText;
                                return (
                                  <button key={item} type="button" aria-pressed={on} className="asset-tile group" onClick={() => toggle('assets', i)}>
                                    <span className="asset-check" aria-hidden>
                                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                                    </span>
                                    <Icon className="asset-icon h-5 w-5" aria-hidden />
                                    <span className="text-[12.5px] leading-tight">{item}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </Group>
                        </div>
                      ) : null}

                      {step === 2 ? (
                        <div className="mt-5 space-y-5">
                          {/* ukázky našich webů z oboru zvoleného v 1. kroku */}
                          {v.niche ? (
                            <IndustryGallery
                              industryId={v.niche}
                              industryLabel={industryName(industries.find((i) => i.id === v.niche), locale)}
                              likes={v.likes ?? []}
                              onLikes={(ids) => setValue('likes', ids)}
                              onLike={() => setSaid({ text: t('gallery.react'), pose: 'thumbsUp' })}
                            />
                          ) : null}
                          <Group label={t('refsLabel')} hint={t('refsHint')} optional={t('optional')} error={errors.refs?.message}>
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
                                    className={field}
                                  />
                                  {refs.length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() => setValue('refs', refs.filter((_, j) => j !== i))}
                                      aria-label={t('refsRemove')}
                                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--line)] text-muted transition-colors hover:border-[rgba(255,90,110,0.5)] hover:text-[#ffc2cb]"
                                    >
                                      <X className="h-4 w-4" aria-hidden />
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            {refs.length < MAX_REFS ? (
                              <button
                                type="button"
                                onClick={() => setValue('refs', [...refs, ''])}
                                className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--blue-bright)] transition-colors hover:text-ink"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden />
                                {t('refsAdd')}
                              </button>
                            ) : null}
                          </Group>

                          <Group label={t('styleLabel')} optional={t('optional')}>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {styles.map((item, i) => {
                                const on = v.style === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className="neon-tile !py-2.5"
                                    onClick={() => {
                                      choose('style', on ? -1 : i);
                                      if (!on) react('styles', i, i === UNSURE.styles);
                                    }}
                                  >
                                    <span aria-hidden className="relative h-9 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                                      {STYLE_PREVIEWS[i]}
                                    </span>
                                    <span className="text-[13px] leading-snug">{item}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <Group label={t('colorsLabel')} optional={t('optional')}>
                            <div className="flex flex-wrap items-center gap-2.5">
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
                                    className={`relative grid h-10 w-10 place-items-center rounded-full transition-[box-shadow,transform] duration-300 hover:scale-105 ${
                                      on ? 'shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--blue-bright)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.14)]'
                                    }`}
                                    style={{ background: COLOR_SWATCHES[i] }}
                                  >
                                    {on ? (
                                      <Check className={`h-4 w-4 ${i === 2 ? 'text-[#0b0d12]' : 'text-white'}`} strokeWidth={3} aria-hidden />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                            {v.colors.length ? (
                              <p className="mt-2.5 text-xs text-muted">{v.colors.map((i) => colors[i]).join(', ')}</p>
                            ) : null}
                            <input
                              type="text"
                              aria-label={t('colorsLabel')}
                              placeholder={t('colorNotePlaceholder')}
                              className={`${field} mt-3`}
                              {...register('colorNote')}
                            />
                          </Group>
                        </div>
                      ) : null}

                      {step === 3 ? (
                        <div className="mt-5 space-y-5">
                          <Group label={t('budgetLabel')} hint={t('budgetHint')} error={errors.budget?.message}>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {budgets.map((item, i) => {
                                const on = v.budget === i;
                                const unsure = i === UNSURE.budgets;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={`neon-tile justify-center whitespace-nowrap !px-2 !py-3 text-center font-display !text-[11.5px] tracking-[0.02em] sm:!text-[12.5px] ${unsure ? 'neon-tile-soft' : ''}`}
                                    onClick={() => {
                                      choose('budget', i);
                                      react('budgets', i, unsure);
                                    }}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <Group label={t('timelineLabel')} error={errors.timeline?.message}>
                            <div className="flex flex-wrap gap-2">
                              {timelines.map((item, i) => (
                                <Chip
                                  key={item}
                                  on={v.timeline === i}
                                  onClick={() => {
                                    choose('timeline', i);
                                    react('timelines', i);
                                  }}
                                >
                                  {item}
                                </Chip>
                              ))}
                            </div>
                          </Group>

                          <Group label={t('deadlineLabel')} hint={t('deadlineHint')} optional={t('optional')} htmlFor="deadline">
                            <div className="relative max-w-[240px]">
                              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--blue-bright)]" aria-hidden />
                              <input id="deadline" type="date" min={today} className={`${field} pl-10 [color-scheme:dark]`} {...register('deadline')} />
                            </div>
                          </Group>
                        </div>
                      ) : null}

                      {step === 4 ? (
                        <div className="mt-5 space-y-4">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Group label={`${t('nameLabel')} *`} htmlFor="name" error={errors.name?.message}>
                              <input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} className={field} {...register('name')} />
                            </Group>
                            <Group label={`${t('emailLabel')} *`} htmlFor="email" error={errors.email?.message}>
                              <input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className={field} {...register('email')} />
                            </Group>
                          </div>

                          <Group label={t('channelLabel')}>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {CHANNEL_ORDER.map((i) => {
                                const item = channels[i];
                                if (!item) return null;
                                const on = v.channel === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className="neon-tile flex-col !gap-1.5 !px-2 !py-2.5 text-center !text-[12.5px]"
                                    onClick={() => {
                                      choose('channel', i);
                                      react('channels', i);
                                    }}
                                  >
                                    <ChannelIcon index={i} className={`h-[18px] w-[18px] ${on ? 'text-[var(--blue-bright)]' : ''}`} />
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <AnimatePresence initial={false} mode="wait">
                            {v.channel === CHANNEL.phone || v.channel === CHANNEL.whatsapp ? (
                              <motion.div key="phone" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                <Group label={`${v.channel === CHANNEL.whatsapp ? t('whatsappLabel') : t('phoneLabel')} *`} htmlFor="phone" error={errors.phone?.message}>
                                  <input id="phone" type="tel" autoComplete="tel" placeholder={t('phonePlaceholder')} className={field} {...register('phone', { onChange: () => clearErrors('phone') })} />
                                </Group>
                              </motion.div>
                            ) : v.channel === CHANNEL.telegram ? (
                              <motion.div key="telegram" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                <Group label={`${t('telegramLabel')} *`} htmlFor="telegram" error={errors.telegram?.message}>
                                  <input id="telegram" type="text" autoComplete="off" placeholder={t('telegramPlaceholder')} className={field} {...register('telegram', { onChange: () => clearErrors('telegram') })} />
                                </Group>
                              </motion.div>
                            ) : null}
                          </AnimatePresence>

                          <Group label={t('messageLabel')} optional={t('optional')} htmlFor="message" error={errors.message?.message}>
                            <textarea id="message" rows={3} placeholder={t('messagePlaceholder')} className={`${field} resize-y`} {...register('message')} />
                          </Group>

                          {summary.length ? (
                            <div className="rounded-2xl border border-[var(--line)] bg-white/[0.02] p-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{t('summaryLabel')}</p>
                              <ul className="mt-2.5 space-y-1.5">
                                {summary.map((row, i) => (
                                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                                    <span className="min-w-0 text-ink/90">{row.text}</span>
                                    <button
                                      type="button"
                                      onClick={() => void goStep(row.step)}
                                      className="shrink-0 text-xs text-[var(--blue-bright)] underline-offset-4 hover:underline"
                                    >
                                      {t('edit')}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--blue)]"
                              onChange={(event) => setValue('consent', event.target.checked as true, { shouldValidate: true })}
                            />
                            <span>
                              {t('consent')}{' '}
                              <Link href="/ochrana-osobnich-udaju" className="text-[var(--blue-bright)] underline-offset-4 hover:underline">
                                {t('consentLink')}
                              </Link>
                              .
                            </span>
                          </label>
                          {errors.consent ? <p className="text-xs text-red-400">{errors.consent.message}</p> : null}
                        </div>
                      ) : null}
                    </motion.fieldset>
                  </AnimatePresence>

                  {/* ochrana proti robotům — běžně neviditelná, ověření běží na pozadí;
                      po prvním příchodu na poslední krok zůstává připojená i při návratu zpět */}
                  {TURNSTILE_SITE_KEY && maxStep >= last ? (
                    <div className={step === last ? 'mt-4' : 'hidden'}>
                      {captchaAsk ? <p className="mb-2 text-xs text-[rgba(205,214,236,0.9)]">{t('captchaAsk')}</p> : null}
                      <Turnstile ref={captchaRef} language={locale} onEvent={onCaptcha} />
                    </div>
                  ) : null}

                  {serverError ? <p role="alert" className="mt-4 text-sm text-red-400">{serverError}</p> : null}

                  <div className="mt-6 flex items-center justify-between gap-4 border-t border-[rgba(110,150,255,0.12)] pt-5">
                    <button
                      type="button"
                      onClick={() => void goStep(step - 1)}
                      disabled={step === 0}
                      className="shrink-0 whitespace-nowrap py-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-0"
                    >
                      ← {t('back')}
                    </button>

                    {step < last ? (
                      <Button onClick={() => void goStep(step + 1)} className="whitespace-nowrap !px-6 !py-3 !text-[12px] max-sm:!gap-2 max-sm:!px-5">{t('next')}</Button>
                    ) : (
                      <Button type="submit" disabled={status === 'sending' || status === 'verifying'} className="whitespace-nowrap !px-6 !py-3 !text-[12px] max-sm:!gap-2 max-sm:!px-4 max-sm:!tracking-[0.08em]">
                        {status === 'sending' || status === 'verifying' ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            {t(status === 'verifying' ? 'verifying' : 'sending')}
                          </span>
                        ) : (
                          t('submit')
                        )}
                      </Button>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <aside className="flex flex-col gap-8">
            <div className="glass relative hidden items-end gap-3 overflow-hidden rounded-card p-6 lg:flex">
              <Mascot pose={pose} height={210} followCursor={false} />
              <div className="mb-6 min-w-0 flex-1">{mascotBubble(true)}</div>
            </div>

            <ul className="space-y-4 text-sm">
              <li>
                <a href={`mailto:${contactEmail}`} className="flex items-center gap-3 text-muted transition-colors hover:text-ink">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--blue-bright)]">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                  {contactEmail}
                </a>
              </li>
              {site.phone ? (
                <li>
                  <a href={`tel:${site.phoneHref}`} className="flex items-center gap-3 text-muted transition-colors hover:text-ink">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--blue-bright)]">
                      <Phone className="h-4 w-4" aria-hidden />
                    </span>
                    {site.phone}
                  </a>
                </li>
              ) : null}
              {/* messengery z administrace (WhatsApp, Telegram…) */}
              {social
                .filter((item) => item.kind === 'messenger')
                .map((item) => (
                  <li key={item.href}>
                    <a href={item.href} target="_blank" rel="noreferrer noopener" className="flex items-center gap-3 text-muted transition-colors hover:text-ink">
                      <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--blue-bright)]">
                        <SocialIcon brand={item.brand} className="h-4 w-4" />
                      </span>
                      <span>
                        {item.label}
                        {item.display ? <span className="ml-2 text-ink/85">{item.display}</span> : null}
                      </span>
                    </a>
                  </li>
                ))}
              <li className="flex items-center gap-3 text-muted">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--blue-bright)]">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                {city}
              </li>
            </ul>

            {social.some((item) => item.kind === 'social') ? (
              <ul className="flex flex-wrap gap-2">
                {social
                  .filter((item) => item.kind === 'social')
                  .map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3.5 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-ink"
                      >
                        <SocialIcon brand={item.brand} className="h-3.5 w-3.5" />
                        {item.label}
                      </a>
                    </li>
                  ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
