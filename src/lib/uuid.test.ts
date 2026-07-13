import { describe, it, expect } from 'vitest';
import { isUuid, isValidId, sanitizeId } from './uuid';

const GOOD = '550e8400-e29b-41d4-a716-446655440000';

describe('uuid utils', () => {
  it('isUuid validates canonical UUIDs', () => {
    expect(isUuid(GOOD)).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123 as any)).toBe(false);
  });

  it('isValidId blocks blacklisted mock ids', () => {
    expect(isValidId('local-store')).toBe(false);
    expect(isValidId('undefined')).toBe(false);
    expect(isValidId('')).toBe(false);
    expect(isValidId(GOOD)).toBe(true);
  });

  it('sanitizeId returns string or undefined', () => {
    expect(sanitizeId(GOOD)).toBe(GOOD);
    expect(sanitizeId('mock-id')).toBeUndefined();
    expect(sanitizeId(null)).toBeUndefined();
  });
});
