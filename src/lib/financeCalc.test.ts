import { describe, it, expect } from 'vitest';
import { calculateProfit, calculateMargin } from './formatters';

// Signature: (costPrice, salePrice[, quantity])

describe('financial calculations', () => {
  it('profit = (salePrice - costPrice) * quantity', () => {
    expect(calculateProfit(700, 1000)).toBe(300);
    expect(calculateProfit(500, 500)).toBe(0);
    expect(calculateProfit(800, 500)).toBe(-300);
    expect(calculateProfit(700, 1000, 3)).toBe(900);
  });

  it('margin = (salePrice - costPrice) / salePrice * 100', () => {
    expect(calculateMargin(700, 1000)).toBeCloseTo(30, 5);
    expect(calculateMargin(1000, 1000)).toBe(0);
    expect(calculateMargin(100, 0)).toBe(0); // guard: salePrice=0 -> 0
  });

  it('negative margin when cost > sale price', () => {
    expect(calculateMargin(800, 500)).toBeLessThan(0);
  });
});
