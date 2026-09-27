'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SplitHeading } from '@/components/ui/SplitHeading';

type Item = { q: string; a: string };

export function Faq({
  items,
  title,
  accent,
  eyebrow,
  lead,
  id = 'faq',
}: {
  items: Item[];
  title: string;
  accent: string;
  eyebrow?: string;
  lead?: string;
  id?: string;
}) {
  const t = useTranslations('faq');
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id={id} className="relative py-24 md:py-32" aria-labelledby={`${id}-title`}>
      <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">{eyebrow ?? t('eyebrow')}</p>
          <SplitHeading
            as="h2"
            className="mt-4 font-display text-[clamp(1.7rem,3.8vw,2.6rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: title + ' ' }, { text: accent, accent: true }]}
          />
          <p className="mt-5 max-w-xs text-sm text-muted">{lead ?? t('lead')}</p>
        </div>

        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {items.map((item, index) => {
            const isOpen = open === index;
            return (
              <li key={item.q}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`${id}-panel-${index}`}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span
                      className={`font-display text-base font-semibold uppercase leading-snug transition-colors md:text-lg ${
                        isOpen ? 'text-[var(--blue-bright)]' : 'text-ink group-hover:text-[var(--blue-bright)]'
                      }`}
                    >
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 135 : 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] text-muted"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={`${id}-panel-${index}`}
                      key="panel"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-xl pb-7 text-sm leading-relaxed text-muted">{item.a}</p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** FAQ na homepage — bere data přímo z překladů. */
export function HomeFaq() {
  const t = useTranslations('faq');
  return <Faq items={t.raw('items') as Item[]} title={t('title')} accent={t('titleAccent')} />;
}
