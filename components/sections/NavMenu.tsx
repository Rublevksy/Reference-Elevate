'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/FeatureIcon';
import { SectionLink } from '@/components/ui/SectionLink';
import { services } from '@/content/services';
import { processSteps } from '@/content/process';
import { plans } from '@/content/pricing';

/**
 * Podmenu v horní liště (hover / focus): rychlé skoky přímo na konkrétní
 * službu, krok procesu nebo balíček v ceníku. Každá položka je SectionLink —
 * na úvodní stránce rychlý přesun pod clonou, odjinud přechod s #kotvou.
 */

export type MenuKind = 'detaily' | 'proces' | 'cenik';

const EASE = [0.16, 1, 0.3, 1] as const;

function Row({
  to,
  index,
  lead,
  title,
  sub,
  aside,
  onNavigate,
}: {
  to: string;
  index: number;
  lead: ReactNode;
  title: string;
  sub?: string;
  aside?: ReactNode;
  onNavigate: () => void;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.03 + index * 0.025, ease: EASE }}
    >
      <SectionLink
        to={to}
        onNavigate={onNavigate}
        className="group/row relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 outline-none transition-colors duration-200 hover:bg-[rgba(31,91,255,0.12)] focus-visible:bg-[rgba(31,91,255,0.14)]"
      >
        {/* neonová linka vlevo — vyjede při najetí */}
        <span
          aria-hidden
          className="absolute bottom-2 left-0 top-2 w-[2px] origin-center scale-y-0 rounded-full bg-[#9fc0ff] shadow-[0_0_8px_1px_rgba(61,123,255,0.9)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] group-hover/row:scale-y-100 group-focus-visible/row:scale-y-100"
        />
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[rgba(61,123,255,0.35)] bg-[rgba(10,20,50,0.7)] font-display text-[10px] text-[var(--blue-bright)] transition-[border-color,box-shadow] duration-300 group-hover/row:border-[var(--blue-bright)] group-hover/row:shadow-[0_0_16px_rgba(31,91,255,0.5)]">
          {lead}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[11px] uppercase tracking-[0.1em] text-ink">{title}</span>
          {sub ? <span className="mt-0.5 block truncate text-xs text-muted transition-colors group-hover/row:text-[rgba(200,212,240,0.9)]">{sub}</span> : null}
        </span>
        {aside ? <span className="shrink-0 font-display text-[11px] text-[#cfe0ff]">{aside}</span> : null}
        <ArrowRight
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 -translate-x-1.5 text-[var(--blue-bright)] opacity-0 transition-[transform,opacity] duration-300 group-hover/row:translate-x-0 group-hover/row:opacity-100"
        />
      </SectionLink>
    </motion.li>
  );
}

function Footer({ to, label, onNavigate }: { to: string; label: string; onNavigate: () => void }) {
  return (
    <SectionLink
      to={to}
      onNavigate={onNavigate}
      className="group/all mt-1.5 flex items-center justify-between rounded-xl border-t border-[rgba(110,150,255,0.12)] px-3 pb-1.5 pt-3 font-display text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
    >
      {label}
      <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:translate-x-1" />
    </SectionLink>
  );
}

export function NavMenuPanel({ kind, onNavigate }: { kind: MenuKind; onNavigate: () => void }) {
  const tNav = useTranslations('nav');
  const tItems = useTranslations('services.items');
  const tProcess = useTranslations('process');
  const tPricing = useTranslations('pricing');

  let body: ReactNode = null;
  if (kind === 'detaily') {
    body = (
      <>
        <ul>
          {services.map((service, i) => {
            const headline = (tItems.raw(`${service.slug}.headline`) as string[]).join('').trim();
            return (
              <Row
                key={service.slug}
                to={`sluzba-${service.slug}`}
                index={i}
                lead={<Icon name={service.icon} className="h-4 w-4" />}
                title={tItems(`${service.slug}.card`)}
                sub={headline}
                onNavigate={onNavigate}
              />
            );
          })}
        </ul>
        <Footer to="detaily" label={tNav('allServices')} onNavigate={onNavigate} />
      </>
    );
  } else if (kind === 'proces') {
    const steps = tProcess.raw('steps') as { title: string; text: string }[];
    body = (
      <>
        <ul>
          {steps.map((step, i) => (
            <Row key={step.title} to={`krok-${i + 1}`} index={i} lead={processSteps[i] ?? String(i + 1).padStart(2, '0')} title={step.title} sub={step.text} onNavigate={onNavigate} />
          ))}
        </ul>
        <Footer to="proces" label={tNav('allSteps')} onNavigate={onNavigate} />
      </>
    );
  } else {
    const custom = tPricing.raw('custom') as { name: string };
    body = (
      <>
        <ul>
          {plans.map((plan, i) => (
            <Row
              key={plan.id}
              to={`cena-${plan.id}`}
              index={i}
              lead={<Icon name={services.find((s) => s.slug === plan.slug)?.icon ?? 'Monitor'} className="h-4 w-4" />}
              title={tPricing(`plans.${plan.id}.name`)}
              sub={tPricing(`plans.${plan.id}.term`)}
              aside={
                <>
                  <span className="mr-1 text-[9px] uppercase tracking-[0.12em] text-muted">{tPricing('from')}</span>
                  {tPricing(`plans.${plan.id}.price`)}
                </>
              }
              onNavigate={onNavigate}
            />
          ))}
          <Row
            to="cena-na-miru"
            index={plans.length}
            lead="+"
            title={custom.name}
            aside={tPricing('customPrice')}
            onNavigate={onNavigate}
          />
        </ul>
        <Footer to="cenik" label={tNav('allPlans')} onNavigate={onNavigate} />
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.985, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: EASE }}
      className="relative w-[min(380px,calc(100vw-32px))] origin-top overflow-hidden rounded-2xl border border-[rgba(110,150,255,0.24)] p-2 shadow-[0_28px_60px_-22px_rgba(0,0,0,0.95),0_0_44px_-16px_rgba(31,91,255,0.5)]"
      style={{ background: 'linear-gradient(165deg, rgba(16,25,52,0.97), rgba(6,10,22,0.97))' }}
    >
      {/* tečkovaná neonová linka nahoře — stejný motiv jako karty webu */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-[3px]"
        style={{ background: 'radial-gradient(circle, #cfe0ff 0 1px, rgba(97,150,255,0.8) 1.3px, transparent 1.9px) 0 50% / 9px 3px repeat-x' }}
      />
      <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 h-32 w-56 -translate-x-1/2 rounded-full bg-[rgba(31,91,255,0.18)] blur-3xl" />
      <div className="relative">{body}</div>
    </motion.div>
  );
}

/** Mobilní menu: pod hlavní položkou řádek rychlých odkazů (služby, kroky, balíčky). */
export function MobileSubLinks({ kind, onNavigate }: { kind: MenuKind; onNavigate: () => void }) {
  const tItems = useTranslations('services.items');
  const tProcess = useTranslations('process');
  const tPricing = useTranslations('pricing');
  const links: { to: string; label: string }[] =
    kind === 'detaily'
      ? services.map((s) => ({ to: `sluzba-${s.slug}`, label: tItems(`${s.slug}.card`) }))
      : kind === 'proces'
        ? (tProcess.raw('steps') as { title: string }[]).map((step, i) => ({ to: `krok-${i + 1}`, label: `${processSteps[i] ?? i + 1} ${step.title}` }))
        : plans.map((p) => ({ to: `cena-${p.id}`, label: `${tPricing(`plans.${p.id}.name`)} · ${tPricing(`plans.${p.id}.price`)}` }));
  return (
    <ul className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((link) => (
        <li key={link.to} className="shrink-0">
          <SectionLink
            to={link.to}
            onNavigate={onNavigate}
            className="block whitespace-nowrap rounded-full border border-[rgba(110,150,255,0.28)] bg-[rgba(31,91,255,0.06)] px-3.5 py-2 text-xs text-[rgba(200,212,240,0.9)] transition-colors active:border-[var(--blue-bright)] active:bg-[rgba(31,91,255,0.2)]"
          >
            {link.label}
          </SectionLink>
        </li>
      ))}
    </ul>
  );
}
