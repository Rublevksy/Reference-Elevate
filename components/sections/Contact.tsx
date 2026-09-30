'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Check, Lightbulb, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Send, Sparkles, X } from 'lucide-react';
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
  COLOR_SWATCHES,
  MAX_REFS,
  NICHE_OTHER,
  START_OLD_SITE,
  conditionalIssues,
  makeContactSchema,
  type ContactInput,
} from '@/lib/contactSchema';
import { site } from '@/content/site';
import { useSiteContact } from '@/components/ContentProvider';
import { useReducedMotion } from '@/lib/useReducedMotion';

/* Pět kroků kvalifikačního formuláře — která pole který krok kontroluje. */
const STEP_FIELDS: (keyof ContactInput)[][] = [
  ['needs', 'niche', 'nicheDetail'],
  ['start', 'currentSite', 'assets'],
  ['refs', 'style', 'colors', 'colorNote'],
  ['budget', 'timeline', 'deadline'],
  ['name', 'email', 'channel', 'phone', 'telegram', 'message', 'consent'],
];

/** Póza maskota, dokud v kroku nic nevybereš. */
const STEP_POSE: Pose[] = ['point', 'think', 'wave', 'thumbsUp', 'point'];

/** Volby „nevím / nechám na vás" — maskot se nad nimi zamyslí místo palce nahoru. */
const UNSURE = { needs: 6, styles: 5, budgets: 5 } as const;

type Reactions = Record<'needs' | 'niches' | 'starts' | 'styles' | 'budgets' | 'timelines' | 'channels', string[]>;

const START_ICONS = [Sparkles, RefreshCw, Lightbulb];
const CHANNEL_ICONS = [Mail, Phone, Send];

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

const chipClass = (selected: boolean) =>
  `inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-[color,background-color,border-color,box-shadow] duration-300 ${
    selected
      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-ink shadow-glow'
      : 'border-[var(--line)] text-muted hover:border-[rgba(80,120,255,0.45)] hover:text-ink'
  }`;

const tileClass = (selected: boolean) =>
  `relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition-[color,background-color,border-color,box-shadow] duration-300 ${
    selected
      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.14)] text-ink shadow-[0_0_26px_rgba(31,91,255,0.28)]'
      : 'border-[var(--line)] bg-white/[0.02] text-muted hover:border-[rgba(80,120,255,0.45)] hover:text-ink'
  }`;

const field =
  'w-full rounded-xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-[rgba(61,123,255,0.6)]';

function Group({ label, hint, optional, error, children, htmlFor }: { label: string; hint?: string; optional?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  const Title = htmlFor ? 'label' : 'p';
  return (
    <div>
      <Title {...(htmlFor ? { htmlFor } : {})} className="block text-sm font-semibold text-ink">
        {label} {optional ? <span className="font-normal text-muted">({optional})</span> : null}
      </Title>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function Tick() {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--blue-bright)] text-white">
      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
    </span>
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
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [said, setSaid] = useState<{ text: string; pose: Pose } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nicheDetailRef = useRef<HTMLInputElement | null>(null);

  const steps = t.raw('steps') as string[];
  const questions = t.raw('questions') as string[];
  const hints = t.raw('hints') as string[];
  const needs = t.raw('needs') as string[];
  const niches = t.raw('niches') as string[];
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
      needs: [], plan: '', niche: -1, nicheDetail: '',
      start: -1, currentSite: '', assets: [],
      refs: [''], style: -1, colors: [], colorNote: '',
      budget: -1, timeline: -1, deadline: '',
      name: '', email: '', channel: CHANNEL.email, phone: '', telegram: '', message: '',
      website: '', locale,
    },
  });

  useEffect(() => {
    (['needs', 'niche', 'start', 'assets', 'refs', 'style', 'colors', 'budget', 'timeline', 'channel', 'consent', 'plan'] as const).forEach((name) => register(name));
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

  const choose = (name: 'niche' | 'start' | 'style' | 'budget' | 'timeline' | 'channel', index: number) => {
    setValue(name, index);
    clearErrors(name);
  };

  /** Kontrola jednoho kroku: schéma + pole povinná podle jiné odpovědi. */
  const validateStep = async (s: number) => {
    const ok = await trigger(STEP_FIELDS[s]);
    const conditional = conditionalIssues(getValues()).filter((name) => STEP_FIELDS[s].includes(name));
    conditional.forEach((name) => setError(name, { message: t(`errors.${name}`) }));
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

  const onSubmit = async (values: ContactInput) => {
    const conditional = conditionalIssues(values);
    if (conditional.length) {
      conditional.forEach((name) => setError(name, { message: t(`errors.${name}`) }));
      return;
    }
    setStatus('sending');
    setServerError(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, refs: values.refs.filter((r) => r.trim()), locale }),
      });
      const data = (await response.json()) as { ok?: boolean; code?: string; to?: string };
      if (!response.ok || !data.ok) {
        const code = data.code ?? 'generic';
        const key = ['rate', 'server', 'send'].includes(code) ? code : 'generic';
        throw new Error(key === 'send' ? `${t('errors.send')} ${data.to ?? contactEmail}` : t(`errors.${key}`));
      }
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setServerError(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  // neplatné odeslání: ukázat i chyby polí povinných podle jiné odpovědi (telefon…)
  const onInvalid = () => {
    conditionalIssues(getValues()).forEach((name) => setError(name, { message: t(`errors.${name}`) }));
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
    { step: 0, text: v.niche >= 0 ? [niches[v.niche], v.nicheDetail].filter(Boolean).join(' — ') : '' },
    { step: 1, text: v.start >= 0 ? [starts[v.start], v.start === START_OLD_SITE ? v.currentSite : ''].filter(Boolean).join(' — ') : '' },
    { step: 2, text: [v.style >= 0 ? styles[v.style] : '', v.colors.map((i) => colors[i]).join(', ')].filter(Boolean).join(' · ') },
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

        <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-[1.3fr_0.7fr]">
          <div ref={cardRef} className="glass relative overflow-hidden rounded-card p-5 sm:p-7 md:p-9">
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
                  {/* průběh: pět pojmenovaných úseků, hotové jdou rozkliknout */}
                  <div className="mb-7">
                    <div className="flex items-baseline justify-between gap-4 text-[11px] uppercase tracking-[0.18em] text-muted">
                      <span>
                        {t('stepLabel')} <span className="text-ink">{step + 1}</span> / {steps.length}
                      </span>
                      <span className="truncate text-[var(--blue-bright)] sm:hidden">{steps[step]}</span>
                    </div>
                    <ol className="mt-3 grid grid-cols-5 gap-1.5">
                      {steps.map((label, i) => {
                        const reachable = i <= maxStep || i === step + 1;
                        return (
                          <li key={label}>
                            <button
                              type="button"
                              onClick={() => void goStep(i)}
                              disabled={!reachable}
                              aria-current={i === step ? 'step' : undefined}
                              aria-label={`${t('stepLabel')} ${i + 1}: ${label}`}
                              className="group block w-full text-left disabled:cursor-default"
                            >
                              <span className="block h-1 overflow-hidden rounded-full bg-white/[0.07]">
                                <motion.span
                                  className="block h-full rounded-full bg-[linear-gradient(90deg,var(--blue),var(--blue-bright))]"
                                  initial={false}
                                  animate={{ width: i <= step ? '100%' : '0%', opacity: i === step ? 1 : 0.75 }}
                                  transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                                />
                              </span>
                              <span
                                className={`mt-2 hidden truncate text-[10px] uppercase tracking-[0.14em] transition-colors sm:block ${
                                  i === step ? 'text-ink' : i <= maxStep ? 'text-muted group-hover:text-ink' : 'text-muted/50'
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
                      className="min-h-[330px] min-w-0"
                    >
                      <legend className="font-display text-lg font-bold uppercase leading-tight md:text-xl">{questions[step]}</legend>

                      {step === 0 ? (
                        <div className="mt-6 space-y-7">
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
                            <div className="flex flex-wrap gap-2.5">
                              {needs.map((item, i) => {
                                const on = v.needs.includes(i);
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={chipClass(on)}
                                    onClick={() => {
                                      if (toggle('needs', i)) react('needs', i, i === UNSURE.needs);
                                    }}
                                  >
                                    {on ? <Tick /> : null}
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <Group label={t('nicheLabel')} error={errors.niche?.message}>
                            <div className="flex flex-wrap gap-2.5">
                              {niches.map((item, i) => (
                                <button
                                  key={item}
                                  type="button"
                                  aria-pressed={v.niche === i}
                                  className={chipClass(v.niche === i)}
                                  onClick={() => {
                                    choose('niche', i);
                                    react('niches', i, i === NICHE_OTHER);
                                    if (i === NICHE_OTHER) window.setTimeout(() => nicheDetailRef.current?.focus(), 60);
                                  }}
                                >
                                  {item}
                                </button>
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
                        <div className="mt-6 space-y-7">
                          <Group label={t('startLabel')} error={errors.start?.message}>
                            <div className="grid gap-2.5 sm:grid-cols-3">
                              {starts.map((item, i) => {
                                const Icon = START_ICONS[i] ?? Sparkles;
                                const on = v.start === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={`${tileClass(on)} sm:flex-col sm:items-start sm:gap-4 sm:py-4`}
                                    onClick={() => {
                                      choose('start', i);
                                      react('starts', i);
                                    }}
                                  >
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${on ? 'border-[var(--blue-bright)] text-[var(--blue-bright)]' : 'border-[var(--line)] text-muted'}`}>
                                      <Icon className="h-[18px] w-[18px]" aria-hidden />
                                    </span>
                                    <span className="leading-snug">{item}</span>
                                    {on ? <span className="absolute right-3 top-3"><Tick /></span> : null}
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
                            <div className="flex flex-wrap gap-2.5">
                              {assets.map((item, i) => {
                                const on = v.assets.includes(i);
                                return (
                                  <button key={item} type="button" aria-pressed={on} className={chipClass(on)} onClick={() => toggle('assets', i)}>
                                    {on ? <Tick /> : null}
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </Group>
                        </div>
                      ) : null}

                      {step === 2 ? (
                        <div className="mt-6 space-y-7">
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
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                              {styles.map((item, i) => {
                                const on = v.style === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={`${tileClass(on)} !px-3 !py-3`}
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
                        <div className="mt-6 space-y-7">
                          <Group label={t('budgetLabel')} hint={t('budgetHint')} error={errors.budget?.message}>
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                              {budgets.map((item, i) => {
                                const on = v.budget === i;
                                const unsure = i === UNSURE.budgets;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={`${tileClass(on)} justify-center !py-3.5 text-center font-display text-[13px] tracking-[0.02em] ${unsure && !on ? 'border-dashed' : ''}`}
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
                            <div className="flex flex-wrap gap-2.5">
                              {timelines.map((item, i) => (
                                <button
                                  key={item}
                                  type="button"
                                  aria-pressed={v.timeline === i}
                                  className={chipClass(v.timeline === i)}
                                  onClick={() => {
                                    choose('timeline', i);
                                    react('timelines', i);
                                  }}
                                >
                                  {item}
                                </button>
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
                        <div className="mt-6 space-y-6">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Group label={`${t('nameLabel')} *`} htmlFor="name" error={errors.name?.message}>
                              <input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} className={field} {...register('name')} />
                            </Group>
                            <Group label={`${t('emailLabel')} *`} htmlFor="email" error={errors.email?.message}>
                              <input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className={field} {...register('email')} />
                            </Group>
                          </div>

                          <Group label={t('channelLabel')}>
                            <div className="grid grid-cols-3 gap-2.5">
                              {channels.map((item, i) => {
                                const Icon = CHANNEL_ICONS[i] ?? Mail;
                                const on = v.channel === i;
                                return (
                                  <button
                                    key={item}
                                    type="button"
                                    aria-pressed={on}
                                    className={`${tileClass(on)} flex-col !gap-2 !px-2 !py-3 text-center text-[13px]`}
                                    onClick={() => {
                                      choose('channel', i);
                                      react('channels', i);
                                    }}
                                  >
                                    <Icon className={`h-[18px] w-[18px] ${on ? 'text-[var(--blue-bright)]' : ''}`} aria-hidden />
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </Group>

                          <AnimatePresence initial={false} mode="wait">
                            {v.channel === CHANNEL.phone ? (
                              <motion.div key="phone" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduced ? 0 : 0.25 }}>
                                <Group label={`${t('phoneLabel')} *`} htmlFor="phone" error={errors.phone?.message}>
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

                  {serverError ? <p role="alert" className="mt-4 text-sm text-red-400">{serverError}</p> : null}

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => void goStep(step - 1)}
                      disabled={step === 0}
                      className="text-sm text-muted transition-colors hover:text-ink disabled:opacity-0"
                    >
                      ← {t('back')}
                    </button>

                    {step < last ? (
                      <Button onClick={() => void goStep(step + 1)}>{t('next')}</Button>
                    ) : (
                      <Button type="submit" disabled={status === 'sending'}>
                        {status === 'sending' ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            {t('sending')}
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
              <li className="flex items-center gap-3 text-muted">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--blue-bright)]">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                {city}
              </li>
            </ul>

            <ul className="flex flex-wrap gap-2">
              {social.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-block rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-wider text-muted transition-colors hover:border-[rgba(80,120,255,0.5)] hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
