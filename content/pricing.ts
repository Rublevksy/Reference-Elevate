/**
 * PLACEHOLDER CENY — doplňte skutečné částky.
 * Název, popis i seznam funkcí jsou v messages pod pricing.plans.<id>.
 */
export type Plan = {
  id: 'start' | 'business' | 'animated';
  /** kolik odrážek má balíček v messages (kvůli animaci po jedné) */
  featureCount: number;
  featured: boolean;
  /** index v contact.needs pro předvýběr ve formuláři */
  needIndex: number;
};

export const plans: Plan[] = [
  { id: 'start', featureCount: 6, featured: false, needIndex: 0 },
  { id: 'business', featureCount: 7, featured: true, needIndex: 0 },
  { id: 'animated', featureCount: 7, featured: false, needIndex: 0 },
];
