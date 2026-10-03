'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ArrowLeft, ArrowRight, AtSign, BookOpen, Building2, CalendarDays, Check, ImageIcon, Lightbulb, Link2, Loader2, Mail, MapPin, MessageSquareText, PenTool, Phone, Plus, RefreshCw, Sparkles, SquareDashed, Type, UserRound, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
import { galleryTypesForNeeds, industryName } from '@/lib/content/gallery';
import { IndustryGallery } from './IndustryGallery';
import { SocialIcon } from '@/components/ui/SocialIcon';
import { TURNSTILE_SITE_KEY, Turnstile, type TurnstileEvent, type TurnstileHandle } from '@/components/ui/Turnstile';
import { useReducedMotion } from '@/lib/useReducedMotion';

/**
 * Poptávkový formulář ve stylu „sklo a záře": matný skleněný panel nad
 * pomalou aurorou, svítící obrysy, všechno vlastní prvky (třídy `ga-*`
 * v globals.css) — kapsle voleb, segmentové přepínače, stopa rozpočtu,
 * 3D karusel ukázek, skleněné tlačítko.
 *
 * Telefon: žádný backdrop-filter ani rozmazávání při animacích (iOS Safari
 * by sekal), pole mají 16 px (jinak iOS při fokusu přiblíží stránku),
 * tlačítko Pokračovat je přilepené dole přes celou šířku.
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
/** poslední volba rozpočtu = „zatím nevím" (mimo stopu) */
const BUDGET_UNSURE = 5;
/** záře kolem vybrané barvy (černá by nesvítila) */
const COLOR_GLOW = ['#4c82ff', '#8aa0ff', '#ffffff', '#3fd08a', '#ff5a60', '#ffa24a', '#9a6bff', '#e0bc62'];

function ChannelIcon({ index }: { index: number }) {
  if (index === CHANNEL.whatsapp) return <SocialIcon brand="whatsapp" className="h-[17px] w-[17px] shrink-0" />;
  if (index === CHANNEL.telegram) return <SocialIcon brand="telegram" className="h-[17px] w-[17px] shrink-0" />;
  const Icon = index === CHANNEL.phone ? Phone : Mail;
  return <Icon size={17} className="shrink-0" aria-hidden />;
}

/** Malé abstraktní náhledy šesti stylů webu v kulatém terčíku (pořadí = contact.styles). */
const STYLE_SWATCHES: ReactNode[] = [
  <span key="0" className="ga-swatch" style={{ background: '#f4f6fb' }}>
    <span style={{ position: 'absolute', left: '16%', top: '26%', width: '46%', height: 3, borderRadius: 9, background: '#1b2133' }} />
    <span style={{ position: 'absolute', left: '16%', top: '46%', width: '66%', height: 2, borderRadius: 9, background: '#c9cfdc' }} />
    <span style={{ position: 'absolute', left: '16%', top: '62%', width: '52%', height: 2, borderRadius: 9, background: '#c9cfdc' }} />
  </span>,
  <span key="1" className="ga-swatch" style={{ background: '#0b0d12' }}>
    <span style={{ position: 'absolute', right: 0, bottom: 0, width: '56%', height: '44%', background: '#ff3d57' }} />
    <span style={{ position: 'absolute', left: '14%', top: '26%', width: '50%', height: 5, background: '#ffd23d' }} />
  </span>,
  <span key="2" className="ga-swatch" style={{ background: 'linear-gradient(160deg,#1c160d,#0b0906)' }}>
    <span style={{ position: 'absolute', left: '50%', top: '30%', width: '44%', height: 1, marginLeft: '-22%', background: '#c9a24a' }} />
    <span style={{ position: 'absolute', left: '50%', top: '46%', width: '24%', height: '24%', marginLeft: '-12%', borderRadius: '50%', border: '1px solid #e3c78a' }} />
  </span>,
  <span key="3" className="ga-swatch" style={{ background: '#fff4e8' }}>
    <span style={{ position: 'absolute', left: '14%', top: '16%', width: '34%', height: '34%', borderRadius: '50%', background: '#ff7a59' }} />
    <span style={{ position: 'absolute', right: '14%', top: '22%', width: '26%', height: '26%', borderRadius: 4, transform: 'rotate(14deg)', background: '#7c4dff' }} />
    <span style={{ position: 'absolute', left: '36%', bottom: '14%', width: '32%', height: '32%', borderRadius: '50%', background: '#1fae6b' }} />
  </span>,
  <span
    key="4"
    className="ga-swatch"
    style={{ background: '#050811', backgroundImage: 'linear-gradient(rgba(61,123,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(61,123,255,0.28) 1px, transparent 1px)', backgroundSize: '7px 7px' }}
  >
    <span style={{ position: 'absolute', left: '18%', top: '30%', width: '50%', height: 3, borderRadius: 9, background: '#3d7bff', boxShadow: '0 0 6px #3d7bff' }} />
  </span>,
  <span key="5" className="ga-swatch" style={{ display: 'grid', placeItems: 'center', background: 'rgba(98,104,255,0.18)', color: '#b9c8ff' }}>
    <Sparkles size={15} />
  </span>,
];

/** Kapsle volby: bez terčíku ukazuje kroužek → zatržítko, s terčíkem ikonu / náhled. */
function Cap({ on, onClick, disc, children }: { on: boolean; onClick: () => void; disc?: ReactNode; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="ga-cap">
      {disc ? <i className="ga-cap-disc">{disc}</i> : <i className="ga-cap-dot">{on ? <Check size={13} strokeWidth={3.4} /> : null}</i>}
      {/* slovo se spojovníkem („e-commerce") se uprostřed neláme */}
      <span>{typeof children === 'string' ? children.replace(/(\p{L})-(\p{L})/gu, '$1\u2011$2') : children}</span>
    </button>
  );
}

/** Otázka: popisek, vpravo „nepovinné", pod ním případná nápověda a chyba. */
function Field({ label, hint, optional, error, children, htmlFor }: { label: string; hint?: string; optional?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  const Title = htmlFor ? 'label' : 'p';
  return (
    <div>
      <Title {...(htmlFor ? { htmlFor } : {})} className="ga-label">
        <span>{label}</span>
        {optional ? <small>{optional}</small> : null}
      </Title>
      {hint ? <p className="ga-note">{hint}</p> : null}
      {children}
      {error ? <p className="ga-error">{error}</p> : null}
    </div>
  );
}

/** Směr přechodu mezi kroky: dopředu zprava, zpátky zleva (jen opacity + posun — plynulé i na telefonu). */
const STEP_VARIANTS: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 26 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -14, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] as const } }),
};

/** Plynulá výška obsahu — kroky jsou různě dlouhé, panel neposkočí. */
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
    <div style={{ height, transition: reduced ? undefined : 'height 0.45s cubic-bezier(0.16, 1, 0.3, 1)' }} className="ga-auto">
      <div ref={inner}>{children}</div>
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
  const peekRef = useRef<HTMLSpanElement>(null);
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

  // aurora a odlesky běží jen, když je formulář na obrazovce
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => node.toggleAttribute('data-live', entry.isIntersecting), { rootMargin: '120px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // telefon: přilepená lišta s tlačítkem vyjede, až je z formuláře vidět stepper a nadpis
  // (dokud panel jen vykukuje zespodu, překrývala by je)
  useEffect(() => {
    const panel = cardRef.current;
    const mark = peekRef.current;
    if (!panel || !mark) return;
    const observer = new IntersectionObserver(
      ([entry]) => panel.toggleAttribute('data-peek', !entry.isIntersecting && entry.boundingClientRect.top > 0),
      { rootMargin: '0px 0px -320px 0px' },
    );
    observer.observe(mark);
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

        <div ref={stageRef} className="ga-stage mt-10 md:mt-16">
          <div aria-hidden className="ga-aurora">
            <i />
            <i />
            <i />
          </div>

          <div ref={cardRef} className="ga-panel scroll-mt-24">
            <span ref={peekRef} aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-px" />
            {/* průběh: kapsle, aktivní krok svítí, hotové jdou rozkliknout */}
            <ol className="ga-steps" aria-label={t('stepLabel')}>
              {steps.map((label, i) => {
                const reachable = !done && (i <= maxStep || i === step + 1);
                const state = done || i < step ? 'done' : i === step ? 'current' : 'todo';
                return (
                  <li key={label} data-state={state}>
                    <button type="button" className="ga-step" onClick={() => void goStep(i)} disabled={!reachable} aria-current={state === 'current' ? 'step' : undefined}>
                      {/* název pro čtečky zvlášť („Krok 2: Výchozí stav") — na telefonu je popisek neaktivních kroků skrytý */}
                      <span className="sr-only">{`${t('stepLabel')} ${i + 1}: ${label}`}</span>
                      <span className="ga-step-n" aria-hidden>{state === 'done' ? <Check size={12} strokeWidth={3.2} aria-hidden /> : i + 1}</span>
                      <span className="ga-step-l" aria-hidden>{label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="ga-success"
                >
                  <Confetti />
                  <div className="relative z-10">
                    <motion.span
                      initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.1 }}
                      className="ga-success-orb"
                    >
                      <Check size={38} strokeWidth={2.4} aria-hidden />
                    </motion.span>
                    <h3 className="ga-title !mt-8">{t('successTitle')}</h3>
                    <p className="ga-success-text">
                      {t('successText')}{' '}
                      <a href="#proces" className="text-[#b9c8ff] underline-offset-4 hover:underline">
                        {t('successLink')}
                      </a>
                      .
                    </p>
                    <p className="ga-label !mt-10 !justify-center">{t('successNextLabel')}</p>
                    <ol className="ga-next">
                      {(t.raw('successNext') as string[]).map((item, i) => (
                        <motion.li
                          key={item}
                          initial={reduced ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: reduced ? 0 : 0.35 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <i>{i + 1}</i>
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ol>
                    <a href="#reference" className="ga-ghost">
                      {t('successWorks')}
                      <ArrowRight size={16} aria-hidden />
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
                      <motion.fieldset key={step} custom={dir} variants={STEP_VARIANTS} initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }} className="min-w-0">
                        <legend className="sr-only">{questions[step]}</legend>
                        <h3 aria-hidden className="ga-title">
                          {questions[step]}
                        </h3>
                        {/* nápověda kroku / reakce na volbu */}
                        <p className="ga-hint" role="status" aria-live="polite">
                          <Sparkles size={15} aria-hidden />
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span key={hint} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.22 }}>
                              {hint}
                            </motion.span>
                          </AnimatePresence>
                        </p>

                        {step === 0 ? (
                          <>
                            <Field label={t('needsLabel')} optional={t('needsHint')} error={errors.needs?.message}>
                              {v.plan ? (
                                <p className="ga-plan">
                                  <span>{t('planLabel')}:</span> {v.plan}
                                  <button type="button" onClick={() => setValue('plan', '')} aria-label={t('removePlan')}>
                                    <X size={14} aria-hidden />
                                  </button>
                                </p>
                              ) : null}
                              <div className="ga-caps">
                                {needs.map((item, i) => (
                                  <Cap
                                    key={item}
                                    on={v.needs.includes(i)}
                                    onClick={() => {
                                      if (toggle('needs', i)) react('needs', i);
                                    }}
                                  >
                                    {item}
                                  </Cap>
                                ))}
                              </div>
                            </Field>

                            <Field label={t('nicheLabel')} error={errors.niche?.message}>
                              <div className="ga-caps">
                                {industries.map((item) => (
                                  <Cap
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
                                  </Cap>
                                ))}
                              </div>
                            </Field>

                            <Field label={t('nicheDetailLabel')} optional={v.niche === NICHE_OTHER ? undefined : t('optional')} htmlFor="nicheDetail">
                              {(() => {
                                const reg = register('nicheDetail');
                                return (
                                  <label className="ga-field">
                                    <Building2 size={18} aria-hidden />
                                    <input
                                      id="nicheDetail"
                                      type="text"
                                      placeholder={t('nicheDetailPlaceholder')}
                                      {...reg}
                                      ref={(el) => {
                                        reg.ref(el);
                                        nicheDetailRef.current = el;
                                      }}
                                    />
                                  </label>
                                );
                              })()}
                            </Field>
                          </>
                        ) : null}

                        {step === 1 ? (
                          <>
                            <Field label={t('startLabel')} error={errors.start?.message}>
                              <div className="ga-opts">
                                {starts.map((item, i) => {
                                  const Icon = START_ICONS[i] ?? Sparkles;
                                  return (
                                    <button
                                      key={item}
                                      type="button"
                                      aria-pressed={v.start === i}
                                      className="ga-opt"
                                      onClick={() => {
                                        choose('start', i);
                                        react('starts', i);
                                      }}
                                    >
                                      <i className="ga-opt-orb" aria-hidden>
                                        <Icon size={20} />
                                      </i>
                                      <span>{item}</span>
                                      <em className="ga-radio" aria-hidden />
                                    </button>
                                  );
                                })}
                              </div>
                            </Field>

                            <AnimatePresence initial={false}>
                              {v.start === START_OLD_SITE ? (
                                <motion.div key="site" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: reduced ? 0 : 0.35 }} className="ga-reveal">
                                  <Field label={t('currentSiteLabel')} htmlFor="currentSite" error={errors.currentSite?.message}>
                                    <label className="ga-field" data-invalid={Boolean(errors.currentSite)}>
                                      <Link2 size={18} aria-hidden />
                                      <input id="currentSite" type="text" inputMode="url" placeholder={t('currentSitePlaceholder')} {...register('currentSite', { onChange: () => clearErrors('currentSite') })} />
                                    </label>
                                  </Field>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>

                            <Field label={t('assetsLabel')} optional={t('optional')}>
                              <div className="ga-caps">
                                {assets.map((item, i) => {
                                  const Icon = ASSET_ICONS[i] ?? Plus;
                                  const on = v.assets.includes(i);
                                  return (
                                    <Cap key={item} on={on} onClick={() => toggle('assets', i)} disc={on ? <Check size={15} strokeWidth={3} /> : <Icon size={15} />}>
                                      {item}
                                    </Cap>
                                  );
                                })}
                              </div>
                            </Field>
                          </>
                        ) : null}

                        {step === 2 ? (
                          <>
                            {v.niche ? (
                              <IndustryGallery
                                industryId={v.niche}
                                industryLabel={industryName(industries.find((i) => i.id === v.niche), locale)}
                                types={galleryTypesForNeeds(v.needs)}
                                likes={v.likes ?? []}
                                onLikes={(ids) => setValue('likes', ids)}
                                onLike={() => setSaid(t('gallery.react'))}
                              />
                            ) : null}

                            <Field label={t('refsLabel')} hint={t('refsHint')} optional={t('optional')} error={errors.refs?.message}>
                              {refs.map((value, i) => (
                                <div key={i} className="ga-ref">
                                  <label className="ga-field">
                                    <Link2 size={18} aria-hidden />
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
                                    />
                                  </label>
                                  {refs.length > 1 ? (
                                    <button type="button" onClick={() => setValue('refs', refs.filter((_, j) => j !== i))} aria-label={t('refsRemove')} className="ga-orb-btn">
                                      <X size={16} aria-hidden />
                                    </button>
                                  ) : null}
                                </div>
                              ))}
                              {refs.length < MAX_REFS ? (
                                <button type="button" onClick={() => setValue('refs', [...refs, ''])} className="ga-add">
                                  <Plus size={15} aria-hidden />
                                  {t('refsAdd')}
                                </button>
                              ) : null}
                            </Field>

                            <Field label={t('styleLabel')} optional={t('optional')}>
                              <div className="ga-caps">
                                {styles.map((item, i) => {
                                  const on = v.style === i;
                                  return (
                                    <Cap
                                      key={item}
                                      on={on}
                                      disc={STYLE_SWATCHES[i]}
                                      onClick={() => {
                                        choose('style', on ? -1 : i);
                                        if (!on) react('styles', i);
                                      }}
                                    >
                                      {item}
                                    </Cap>
                                  );
                                })}
                              </div>
                            </Field>

                            <Field label={t('colorsLabel')} optional={v.colors.length ? v.colors.map((i) => colors[i]).join(', ') : t('optional')}>
                              <div className="ga-orbs">
                                {colors.map((name, i) => (
                                  <button
                                    key={name}
                                    type="button"
                                    aria-pressed={v.colors.includes(i)}
                                    aria-label={name}
                                    title={name}
                                    onClick={() => toggle('colors', i)}
                                    className="ga-orb"
                                    style={{ '--c': COLOR_SWATCHES[i], '--g': COLOR_GLOW[i] } as CSSProperties}
                                  />
                                ))}
                              </div>
                              <label className="ga-field">
                                <PenTool size={17} aria-hidden />
                                <input type="text" aria-label={t('colorsLabel')} placeholder={t('colorNotePlaceholder')} {...register('colorNote')} />
                              </label>
                            </Field>
                          </>
                        ) : null}

                        {step === 3 ? (
                          <>
                            <Field label={t('budgetLabel')} hint={t('budgetHint')} error={errors.budget?.message}>
                              {/* rozpočet jako stopa: uzly rozpětí, vybraný svítí a čte se nahoře */}
                              <div className="ga-budget">
                                <p className="ga-budget-read" data-empty={v.budget < 0 || v.budget === BUDGET_UNSURE}>
                                  {v.budget >= 0 ? budgets[v.budget] : `${budgets[0]} — ${budgets[BUDGET_UNSURE - 1]}`}
                                </p>
                                <div className="ga-track" role="radiogroup" aria-label={t('budgetLabel')} style={{ '--p': v.budget >= 0 && v.budget < BUDGET_UNSURE ? v.budget / (BUDGET_UNSURE - 1) : 0 } as CSSProperties}>
                                  <span className="ga-track-fill" aria-hidden />
                                  {budgets.slice(0, BUDGET_UNSURE).map((item, i) => (
                                    <button
                                      key={item}
                                      type="button"
                                      role="radio"
                                      aria-checked={v.budget === i}
                                      data-on={v.budget >= i && v.budget < BUDGET_UNSURE}
                                      className="ga-stop"
                                      onClick={() => {
                                        choose('budget', i);
                                        react('budgets', i);
                                      }}
                                    >
                                      <i aria-hidden />
                                      <span>{item}</span>
                                    </button>
                                  ))}
                                </div>
                                <Cap
                                  on={v.budget === BUDGET_UNSURE}
                                  onClick={() => {
                                    choose('budget', BUDGET_UNSURE);
                                    react('budgets', BUDGET_UNSURE);
                                  }}
                                >
                                  {budgets[BUDGET_UNSURE]}
                                </Cap>
                              </div>
                            </Field>

                            <Field label={t('timelineLabel')} error={errors.timeline?.message}>
                              <div className="ga-seg">
                                {timelines.map((item, i) => (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={v.timeline === i}
                                    onClick={() => {
                                      choose('timeline', i);
                                      react('timelines', i);
                                    }}
                                  >
                                    {item}
                                  </button>
                                ))}
                              </div>
                            </Field>

                            <Field label={t('deadlineLabel')} hint={t('deadlineHint')} optional={t('optional')} htmlFor="deadline">
                              <label className="ga-field ga-field-date">
                                <CalendarDays size={18} aria-hidden />
                                <input id="deadline" type="date" min={today} className="[color-scheme:dark]" {...register('deadline')} />
                              </label>
                            </Field>
                          </>
                        ) : null}

                        {step === 4 ? (
                          <>
                            <div className="ga-two">
                              <Field label={`${t('nameLabel')} *`} htmlFor="name" error={errors.name?.message}>
                                <label className="ga-field" data-invalid={Boolean(errors.name)}>
                                  <UserRound size={18} aria-hidden />
                                  <input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
                                </label>
                              </Field>
                              <Field label={`${t('emailLabel')} *`} htmlFor="email" error={errors.email?.message}>
                                <label className="ga-field" data-invalid={Boolean(errors.email)}>
                                  <AtSign size={18} aria-hidden />
                                  <input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
                                </label>
                              </Field>
                            </div>

                            <Field label={t('channelLabel')}>
                              <div className="ga-seg">
                                {CHANNEL_ORDER.map((i) => {
                                  const item = channels[i];
                                  if (!item) return null;
                                  return (
                                    <button
                                      key={item}
                                      type="button"
                                      aria-pressed={v.channel === i}
                                      onClick={() => {
                                        choose('channel', i);
                                        react('channels', i);
                                      }}
                                    >
                                      <ChannelIcon index={i} />
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
                                    <label className="ga-field" data-invalid={Boolean(errors.phone)}>
                                      <Phone size={18} aria-hidden />
                                      <input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder={t('phonePlaceholder')} {...register('phone', { onChange: () => clearErrors('phone') })} />
                                    </label>
                                  </Field>
                                </motion.div>
                              ) : v.channel === CHANNEL.telegram ? (
                                <motion.div key="telegram" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                  <Field label={`${t('telegramLabel')} *`} htmlFor="telegram" error={errors.telegram?.message}>
                                    <label className="ga-field" data-invalid={Boolean(errors.telegram)}>
                                      <AtSign size={18} aria-hidden />
                                      <input id="telegram" type="text" autoComplete="off" autoCapitalize="none" placeholder={t('telegramPlaceholder')} {...register('telegram', { onChange: () => clearErrors('telegram') })} />
                                    </label>
                                  </Field>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>

                            <Field label={t('messageLabel')} optional={t('optional')} htmlFor="message" error={errors.message?.message}>
                              <label className="ga-field ga-area">
                                <MessageSquareText size={18} aria-hidden />
                                <textarea id="message" rows={3} placeholder={t('messagePlaceholder')} {...register('message')} />
                              </label>
                            </Field>

                            {summary.length ? (
                              <div className="ga-sub ga-summary">
                                <p>{t('summaryLabel')}</p>
                                <ul>
                                  {summary.map((row, i) => (
                                    <li key={i}>
                                      <span>{row.text}</span>
                                      <button type="button" onClick={() => void goStep(row.step)}>
                                        {t('edit')}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <label className="ga-consent">
                              <input type="checkbox" className="ga-check" onChange={(event) => setValue('consent', event.target.checked as true, { shouldValidate: true })} />
                              <span>
                                {t('consent')}{' '}
                                <Link href="/ochrana-osobnich-udaju" className="text-[#b9c8ff] underline-offset-4 hover:underline">
                                  {t('consentLink')}
                                </Link>
                                .
                              </span>
                            </label>
                            {errors.consent ? <p className="ga-error">{errors.consent.message}</p> : null}
                          </>
                        ) : null}
                      </motion.fieldset>
                    </AnimatePresence>
                  </AutoHeight>

                  {/* ochrana proti robotům — běžně neviditelná; po prvním příchodu na poslední krok zůstává připojená */}
                  {TURNSTILE_SITE_KEY && maxStep >= last ? (
                    <div className={step === last ? 'mt-5' : 'hidden'}>
                      {captchaAsk ? <p className="ga-note !mb-2">{t('captchaAsk')}</p> : null}
                      <Turnstile ref={captchaRef} language={locale} onEvent={onCaptcha} />
                    </div>
                  ) : null}

                  {serverError ? (
                    <p role="alert" className="ga-alert">
                      {serverError}
                    </p>
                  ) : null}

                  {/* akce — na telefonu přilepené dole, tlačítko přes celou šířku */}
                  <div className="ga-actions">
                    <button type="button" onClick={() => void goStep(step - 1)} disabled={step === 0} className="ga-back" aria-label={t('back')}>
                      <ArrowLeft size={20} aria-hidden />
                    </button>
                    <button type={step < last ? 'button' : 'submit'} onClick={step < last ? () => void goStep(step + 1) : undefined} disabled={busy} className="ga-cta">
                      {busy ? t(status === 'verifying' ? 'verifying' : 'sending') : step < last ? t('next') : t('submit')}
                      <i>{busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <ArrowRight size={20} aria-hidden />}</i>
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* přímé kontakty pod kartou */}
        <ul className="mx-auto mt-9 flex max-w-[820px] flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted">
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
