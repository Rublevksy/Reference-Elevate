'use client';

import {
  AppWindow,
  Eye,
  MousePointerClick,
  Sparkles,
  LayoutGrid,
  Monitor,
  PenTool,
  Play,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { IconName } from '@/content/icons';

const registry = {
  Monitor,
  Zap,
  Users,
  TrendingUp,
  Search,
  Target,
  ShoppingCart,
  Smartphone,
  ShieldCheck,
  PenTool,
  Rocket,
  AppWindow,
  Play,
  LayoutGrid,
  Sparkles,
  Eye,
  MousePointerClick,
} satisfies Record<IconName, unknown>;

export function Icon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  const Cmp = registry[name] as typeof Monitor;
  return <Cmp className={className} aria-hidden />;
}

/** Čtvercová ikona s modrým rámečkem — přesně jako na reklamních kartách. */
export function FeatureIcon({ name, size = 64 }: { name: IconName; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-2xl border border-[rgba(61,123,255,0.45)] bg-[rgba(10,20,50,0.6)] text-[var(--blue-bright)] shadow-[0_0_24px_rgba(31,91,255,0.25),inset_0_0_18px_rgba(31,91,255,0.12)]"
      style={{ width: size, height: size }}
    >
      <Icon name={name} className="h-7 w-7" />
    </span>
  );
}

export function FeatureRow({
  name,
  title,
  sub,
}: {
  name: IconName;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <FeatureIcon name={name} />
      <div className="leading-tight">
        <div className="font-display text-sm font-bold uppercase tracking-wide text-ink">{title}</div>
        <div className="text-sm uppercase tracking-wide text-muted">{sub}</div>
      </div>
    </div>
  );
}
