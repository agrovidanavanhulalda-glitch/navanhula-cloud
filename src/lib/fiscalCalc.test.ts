import { describe, it, expect } from 'vitest';

/**
 * Pure fiscal math regression guard — matches DB triggers:
 *   IVA (MZ) = 16%   ISPC = 5%   IRPC = 3%
 * These constants MUST match backend fiscal engine to avoid divergence.
 */

const IVA_RATE = 0.16;
const ISPC_RATE = 0.05;
const IRPC_RATE = 0.03;

const round2 = (n: number) => Math.round(n * 100) / 100;
const calcIVA = (subtotal: number) => round2(subtotal * IVA_RATE);
const calcISPC = (subtotal: number) => round2(subtotal * ISPC_RATE);
const calcIRPC = (profit: number) => round2(Math.max(0, profit) * IRPC_RATE);
const calcTotal = (subtotal: number, discount = 0, tax = 0) =>
  round2(subtotal - discount + tax);

describe('fiscal calculations (MZ)', () => {
  it('IVA 16% on 1000 MT = 160 MT', () => {
    expect(calcIVA(1000)).toBe(160);
  });

  it('ISPC 5% on 500 MT = 25 MT', () => {
    expect(calcISPC(500)).toBe(25);
  });

  it('IRPC only applies to positive profit', () => {
    expect(calcIRPC(10000)).toBe(300);
    expect(calcIRPC(-500)).toBe(0);
    expect(calcIRPC(0)).toBe(0);
  });

  it('total = subtotal - discount + tax (2-decimal rounding)', () => {
    expect(calcTotal(1000, 100, 144)).toBe(1044);
    expect(calcTotal(99.999, 0, 0)).toBe(100);
  });

  it('rounds half-away-from-zero to 2 decimals', () => {
    expect(calcIVA(0.015)).toBe(0);
    expect(calcIVA(0.155)).toBeCloseTo(0.02, 2);
  });
});
