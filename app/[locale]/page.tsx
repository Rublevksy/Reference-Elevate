import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/sections/Hero';
import { ServicesTable } from '@/components/sections/ServicesTable';
import { ServiceDeck } from '@/components/sections/ServiceDeck';
import { WhyAnimatedBlock } from '@/components/sections/WhyAnimated';
import { Process } from '@/components/sections/Process';
import { Cases } from '@/components/sections/Cases';
import { Pricing } from '@/components/sections/Pricing';
import { Contact } from '@/components/sections/Contact';
import { TransitionScene } from '@/components/sections/TransitionScene';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <ServicesTable />
      <TransitionScene variant="cardToPanel" />
      <ServiceDeck />
      <TransitionScene variant="panelCollapseRise" />
      <WhyAnimatedBlock />
      <TransitionScene variant="glitchTimeline" />
      <Process />
      <TransitionScene variant="timelineUnfurl" />
      <Cases />
      <TransitionScene variant="devicesToCard" />
      <Pricing />
      <TransitionScene variant="fanRing" />
      <Contact />
    </>
  );
}
