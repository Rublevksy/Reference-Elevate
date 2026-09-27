'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { SpeechBubble } from '@/components/mascot/SpeechBubble';
import { Icon } from '@/components/ui/FeatureIcon';
import { getServiceMeta } from '@/content/services';

/** Hero stránky jedné služby — navazuje na kartu ze stolu. */
export function ServiceHero({ slug }: { slug: string }) {
  const t = useTranslations('services');
  const tItem = useTranslations(`services.items.${slug}`);
  const meta = getServiceMeta(slug);
  if (!meta) return null;

  const headline = tItem.raw('headline') as string[];
  const features = tItem.raw('features') as { title: string; sub: string }[];

  return (
    <section className="relative overflow-hidden pb-10 pt-[136px] md:pb-16 md:pt-[180px]">
      <div className="shell grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <motion.p
            className="eyebrow flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-display text-[var(--blue-bright)]">{meta.num}</span>
            <span className="inline-block h-px w-8 bg-[var(--line)]" />
            {t('serviceLabel')}
          </motion.p>

          <SplitHeading
            as="h1"
            className="mt-5 font-display text-[clamp(2rem,4.8vw,3.4rem)] font-bold uppercase leading-[1.06]"
            parts={[
              { text: headline[0] },
              { text: headline[1], accent: true },
              { text: headline[2] },
            ]}
          />

          <motion.p
            className="mt-6 max-w-lg text-base leading-relaxed text-muted"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            {tItem('lead')}
          </motion.p>

          <motion.ul
            className="mt-8 flex flex-wrap gap-2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {meta.featureIcons.map((icon, index) => (
              <li
                key={icon + index}
                className="flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-xs text-muted"
              >
                <Icon name={icon} className="h-3.5 w-3.5 text-[var(--blue-bright)]" />
                {features[index]?.title} {features[index]?.sub}
              </li>
            ))}
          </motion.ul>

          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            <Button href="#kontakt">{tItem('cta')}</Button>
            <Button href="/#sluzby" variant="ghost" withArrow={false}>
              {t('backToServices')}
            </Button>
          </motion.div>
        </div>

        <div className="relative hidden justify-center lg:flex">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full opacity-60 blur-3xl"
            style={{ background: 'radial-gradient(circle at 50% 60%, rgba(31,91,255,0.35), transparent 65%)' }}
          />
          <div className="relative">
            <Mascot pose="point" height={380} />
            <div className="absolute -left-24 top-10 w-[220px]">
              <SpeechBubble text={tItem('mascotLine')} compact />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
