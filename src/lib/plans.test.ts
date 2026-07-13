import { describe, it, expect } from 'vitest';
import { PLANS, getPlanByTier, getYearlyDiscount, type PlanTier } from './plans';

describe('plans.ts — pure catalog', () => {
  it('exposes exactly 3 tiers in canonical order', () => {
    expect(PLANS.map((p) => p.tier)).toEqual<PlanTier[]>(['starter', 'pro', 'enterprise']);
  });

  it('getPlanByTier returns the matching definition', () => {
    expect(getPlanByTier('pro').name).toBe('Profissional');
    expect(getPlanByTier('enterprise').maxProducts).toBe(-1);
    expect(getPlanByTier('starter').maxStores).toBe(1);
  });

  it('enterprise tier has unlimited quotas (-1 sentinel)', () => {
    const ent = getPlanByTier('enterprise');
    expect(ent.maxProducts).toBe(-1);
    expect(ent.maxSellers).toBe(-1);
    expect(ent.maxStores).toBe(-1);
  });

  it('price monotonicity: starter <= pro <= enterprise (monthly)', () => {
    const [s, p, e] = PLANS;
    expect(s.price).toBeLessThanOrEqual(p.price);
    expect(p.price).toBeLessThanOrEqual(e.price);
  });

  it('yearly plan grants ~2 months discount (>=15%)', () => {
    for (const plan of PLANS) {
      const discount = getYearlyDiscount(plan);
      expect(discount).toBeGreaterThanOrEqual(15);
    }
  });
});
