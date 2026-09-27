'use client';

import { motion, useInView } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRef, type ComponentType } from 'react';
import { Button } from '@/components/ui/Button';
import { FeatureRow } from '@/components/ui/FeatureIcon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { Mascot } from '@/components/mascot/Mascot';
import { AppMockup, DesignMockup, SeoDashboard, ShopMockup, WebMockup } from '@/components/mockups';
import { getServiceMeta, type MockupKind } from '@/content/services';

const MOCKUPS: Record<MockupKind, ComponentType<{ active: boolean }>> = {
  web: WebMockup,
  seo: SeoDashboard,
  shop: ShopMockup,
  design: DesignMockup,
  app: AppMockup,
};

/** Ukázka služby na její vlastní stránce — mimo kolodu karet. */
export function ServiceShowcase({ slug }: { slug: string }) {
  const tItem = useTranslations(`services.items.${slug}`);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20%' });
  const meta = getServiceMeta(slug);
  if (!meta) return null;

  const Mockup = MOCKUPS[meta.mockup];
  const headline = tItem.raw('headline') as string[];
  const features = tItem.raw('features') as { title: string; sub: string }[];

  return (
    <section className="relative py-16 md:py-24">
      <div className="shell grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div>
          <SplitHeading
            as="h2"
            className="font-display text-[clamp(1.6rem,3.6vw,2.7rem)] font-bold uppercase leading-[1.08]"
            parts={[{ text: headline[0] }, { text: headline[1], accent: true }, { text: headline[2] }]}
          />

          <motion.p
            className="mt-5 max-w-md text-muted"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            {tItem('lead')}
          </motion.p>

          <motion.ul
            className="mt-8 space-y-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-10% 0px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
          >
            {meta.featureIcons.map((icon, index) => (
              <motion.li
                key={icon + index}
                variants={{
                  hidden: { opacity: 0, x: -18 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <FeatureRow
                  name={icon}
                  title={features[index]?.title ?? ''}
                  sub={features[index]?.sub ?? ''}
                />
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-9">
            <Button href="#kontakt">{tItem('cta')}</Button>
          </div>
        </div>

        <div ref={ref} className="relative">
          <Mockup active={inView} />
          <div className="pointer-events-none absolute -bottom-24 -left-10 hidden xl:block">
            <Mascot pose="point" height={300} followCursor={false} />
          </div>
        </div>
      </div>
    </section>
  );
}
