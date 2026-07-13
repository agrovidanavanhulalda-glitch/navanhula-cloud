import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateMargin } from './formatters';

describe('financial calculations', () => {
  it('profit = revenue - cost', () => {
    expect(calculateProfit(1000, 700)).toBe(300);
    expect(calculateProfit(500, 500)).toBe(0);
    expect(calculateProfit(500, 800)).toBe(-300);
  });

  it('margin as percentage of revenue', () => {
    expect(calculateMargin(1000, 700)).toBeCloseTo(30, 5);
    expect(calculateMargin(1000, 1000)).toBe(0);
    expect(calculateMargin(0, 100)).toBe(0); // guard against div-by-zero
  });

  it('negative margin when cost > revenue', () => {
    expect(calculateMargin(500, 800)).toBeLessThan(0);
  });
});
