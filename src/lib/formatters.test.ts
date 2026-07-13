import { describe, it, expect, beforeAll } from 'vitest';
import {
  setFormatterCountry,
  formatCurrency,
  calculateMargin,
  calculateProfit,
  getPaymentMethodLabel,
  getRoleLabel,
  getSaleStatusLabel,
  getAdjustmentReasonLabel,
} from './formatters';

beforeAll(() => setFormatterCountry('MZ'));

describe('formatters — money & math', () => {
  it('formats MZ currency with symbol', () => {
    const out = formatCurrency(1250);
    // Locale spacing varies; assert value + symbol presence
    expect(out).toMatch(/1[\.\s]?250,00/);
    expect(out).toMatch(/MT$/);
  });

  it('calculateMargin returns 0 when sale is 0', () => {
    expect(calculateMargin(50, 0)).toBe(0);
  });

  it('calculateMargin computes percentage', () => {
    expect(calculateMargin(50, 100)).toBe(50);
  });

  it('calculateProfit multiplies by quantity', () => {
    expect(calculateProfit(10, 25, 3)).toBe(45);
    expect(calculateProfit(10, 25)).toBe(15);
  });
});

describe('formatters — labels', () => {
  it('maps known payment methods', () => {
    expect(getPaymentMethodLabel('cash')).toBe('Dinheiro');
    expect(getPaymentMethodLabel('mpesa')).toBe('M-Pesa');
    expect(getPaymentMethodLabel('unknown')).toBe('unknown');
  });

  it('maps roles, statuses, and adjustment reasons', () => {
    expect(getRoleLabel('admin')).toBe('Administrador');
    expect(getSaleStatusLabel('completed')).toBe('Concluída');
    expect(getAdjustmentReasonLabel('theft')).toBe('Roubo');
  });
});
