'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/Button';
import { Confetti } from '@/components/ui/Confetti';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { makeContactSchema, type ContactInput } from '@/lib/contactSchema';
import { site } from '@/content/site';
import { useSiteContact } from '@/components/ContentProvider';

const STEP_FIELDS: (keyof ContactInput)[][] = [
  ['needs'],
  ['budget', 'timeline', 'currentSite'],
  ['name', 'email', 'phone', 'message', 'consent'],
];

const MASCOT_BY_STEP = ['point', 'think', 'thumbsUp'] as const;

const chip = (selected: boolean) =>
  `rounded-full border px-4 py-2.5 text-sm transition-all duration-300 ${
    selected
      ? 'border-[var(--blue-bright)] bg-[rgba(31,91,255,0.18)] text-ink shadow-glow'
      : 'border-[var(--line)] text-muted hover:border-[rgba(80,120,255,0.45)] hover:text-ink'
  }`;

const field =
  'w-full rounded-xl border border-[var(--line)] bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-[rgba(61,123,255,0.6)]';

export function Contact({ preselectIndex }: { preselectIndex?: number }) {
  const { contactEmail, city, social } = useSiteContact();
  const t = useTranslations('contact');
  const tMascot = useTranslations('mascot');
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const needs = t.raw('needs') as string[];
  const budgets = t.raw('budgets') as string[];
  const timelines = t.raw('timelines') as string[];
  const steps = t.raw('steps') as string[];
  const hints = t.raw('hints') as string[];

  const schema = useMemo(
    () =>
      makeContactSchema({
        needs: t('errors.needs'),
        name: t('errors.name'),
        email: t('errors.email'),
        message: t('errors.message'),
        site: t('errors.site'),
        consent: t('errors.consent'),
      }),
    [t],
  );

  const {
    register, handleSubmit, trigger, watch, setValue, getValues,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      needs: preselectIndex !== undefined && needs[preselectIndex] ? [needs[preselectIndex]] : [],
      budget: '', timeline: '', currentSite: '',
      name: '', email: '', phone: '', message: '', website: '',
    },
  });

  const selected = watch('needs') ?? [];
  const budget = watch('budget');
  const timeline = watch('timeline');

  useEffect(() => {
    register('needs');
    register('budget');
    register('timeline');
    register('consent');
  }, [register]);

  // výběr balíčku z ceníku
  const onPreselect = useCallback(
    (event: Event) => {
      const detail = (event as CustomEvent<{ needIndex: number; plan: string }>).detail;
      const value = needs[detail.needIndex];
      if (value && !getValues('needs').includes(value)) {
        setValue('needs', [...getValues('needs'), value], { shouldValidate: true });
      }
      const current = getValues('message') ?? '';
      if (detail.plan && !current.includes(detail.plan)) {
        setValue('message', current ? `${current}\n${detail.plan}` : detail.plan);
      }
      setStep(0);
    },
    [needs, getValues, setValue],
  );

  useEffect(() => {
    window.addEventListener('elevate:preselect', onPreselect);
    return () => window.removeEventListener('elevate:preselect', onPreselect);
  }, [onPreselect]);

  const toggleNeed = (value: string) => {
    const next = selected.includes(value) ? selected.filter((i) => i !== value) : [...selected, value];
    setValue('needs', next, { shouldValidate: true });
  };

  const next = async () => {
    if (await trigger(STEP_FIELDS[step])) setStep((c) => Math.min(steps.length - 1, c + 1));
  };

  const onSubmit = async (values: ContactInput) => {
    setStatus('sending');
    setServerError(null);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
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
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="glass relative overflow-hidden rounded-card p-6 md:p-9">
            <AnimatePresence mode="wait">
              {status === 'done' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative grid min-h-[380px] place-items-center text-center"
                >
                  <Confetti />
                  <div className="relative z-10">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--blue-bright)] bg-[rgba(31,91,255,0.2)] text-[var(--blue-bright)] shadow-glow">
                      <Check className="h-7 w-7" aria-hidden />
                    </span>
                    <h3 className="mt-6 font-display text-2xl font-bold uppercase">{t('successTitle')}</h3>
                    <p className="mt-3 text-sm text-muted">
                      {t('successText')}{' '}
                      <a href="#proces" className="text-[var(--blue-bright)] underline-offset-4 hover:underline">
                        {t('successLink')}
                      </a>
                      .
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit(onSubmit)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} noValidate>
                  <div className="mb-8">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted">
                      <span>{t('stepLabel')} {step + 1} / {steps.length}</span>
                      <span className="text-ink">{steps[step]}</span>
                    </div>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-[linear-gradient(90deg,var(--blue),var(--blue-bright))]"
                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>

                  <div className="absolute -left-[9999px] top-0" aria-hidden>
                    <label htmlFor="website">{t('honeypot')}</label>
                    <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="min-h-[260px]"
                    >
                      {step === 0 ? (
                        <fieldset>
                          <legend className="font-display text-lg font-bold uppercase">{steps[0]}</legend>
                          <div className="mt-5 flex flex-wrap gap-2.5">
                            {needs.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => toggleNeed(item)}
                                aria-pressed={selected.includes(item)}
                                className={chip(selected.includes(item))}
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                          {errors.needs ? <p className="mt-3 text-sm text-red-400">{errors.needs.message}</p> : null}
                        </fieldset>
                      ) : null}

                      {step === 1 ? (
                        <div className="space-y-7">
                          <fieldset>
                            <legend className="text-sm font-semibold text-ink">{t('budgetLabel')}</legend>
                            <div className="mt-3 flex flex-wrap gap-2.5">
                              {budgets.map((item) => (
                                <button key={item} type="button" onClick={() => setValue('budget', item)} aria-pressed={budget === item} className={chip(budget === item)}>
                                  {item}
                                </button>
                              ))}
                            </div>
                          </fieldset>

                          <fieldset>
                            <legend className="text-sm font-semibold text-ink">{t('timelineLabel')}</legend>
                            <div className="mt-3 flex flex-wrap gap-2.5">
                              {timelines.map((item) => (
                                <button key={item} type="button" onClick={() => setValue('timeline', item)} aria-pressed={timeline === item} className={chip(timeline === item)}>
                                  {item}
                                </button>
                              ))}
                            </div>
                          </fieldset>

                          <div>
                            <label htmlFor="currentSite" className="text-sm font-semibold text-ink">
                              {t('siteLabel')} <span className="font-normal text-muted">({t('optional')})</span>
                            </label>
                            <input id="currentSite" type="text" placeholder="www.example.cz" className={`${field} mt-2`} {...register('currentSite')} />
                          </div>
                        </div>
                      ) : null}

                      {step === 2 ? (
                        <div className="space-y-5">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label htmlFor="name" className="text-sm font-semibold text-ink">
                                {t('nameLabel')} <span className="text-[var(--blue-bright)]">*</span>
                              </label>
                              <input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} className={`${field} mt-2`} {...register('name')} />
                              {errors.name ? <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p> : null}
                            </div>
                            <div>
                              <label htmlFor="email" className="text-sm font-semibold text-ink">
                                {t('emailLabel')} <span className="text-[var(--blue-bright)]">*</span>
                              </label>
                              <input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} className={`${field} mt-2`} {...register('email')} />
                              {errors.email ? <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p> : null}
                            </div>
                          </div>

                          <div>
                            <label htmlFor="phone" className="text-sm font-semibold text-ink">
                              {t('phoneLabel')} <span className="font-normal text-muted">({t('optional')})</span>
                            </label>
                            <input id="phone" type="tel" autoComplete="tel" className={`${field} mt-2`} {...register('phone')} />
                          </div>

                          <div>
                            <label htmlFor="message" className="text-sm font-semibold text-ink">
                              {t('messageLabel')} <span className="font-normal text-muted">({t('optional')})</span>
                            </label>
                            <textarea id="message" rows={4} placeholder={t('messagePlaceholder')} className={`${field} mt-2 resize-y`} {...register('message')} />
                          </div>

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
                    </motion.div>
                  </AnimatePresence>

                  {serverError ? <p role="alert" className="mt-4 text-sm text-red-400">{serverError}</p> : null}

                  <div className="mt-8 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => setStep((c) => Math.max(0, c - 1))}
                      disabled={step === 0}
                      className="text-sm text-muted transition-colors hover:text-ink disabled:opacity-0"
                    >
                      ← {t('back')}
                    </button>

                    {step < steps.length - 1 ? (
                      <Button onClick={next}>{t('next')}</Button>
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
            <div className="glass relative flex items-end gap-3 overflow-hidden rounded-card p-6">
              <Mascot pose={status === 'done' ? 'celebrate' : MASCOT_BY_STEP[step]} height={210} followCursor={false} />
              <div className="mb-6 flex-1">
                <SpeechBubble
                  key={status === 'done' ? 'done' : step}
                  text={status === 'done' ? tMascot('success') : hints[step]}
                  compact
                />
              </div>
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
