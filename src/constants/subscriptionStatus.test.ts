import { describe, it, expect } from 'vitest';
import {
  SubscriptionStatus,
  SUBSCRIPTION_STATUS_VALUES,
  isSubscriptionStatus,
} from './subscriptionStatus';

describe('SubscriptionStatus enum', () => {
  it('exposes canonical values matching the DB enum', () => {
    expect(new Set(SUBSCRIPTION_STATUS_VALUES)).toEqual(
      new Set(['active','warning','blocked','cancelled','trial','past_due','suspended','expired','lifetime'])
    );
  });

  it('uses UK spelling "cancelled" (not "canceled")', () => {
    expect(SubscriptionStatus.CANCELLED).toBe('cancelled');
    expect(SUBSCRIPTION_STATUS_VALUES).not.toContain('canceled' as any);
  });

  it('rejects common misspellings via type guard', () => {
    expect(isSubscriptionStatus('active')).toBe(true);
    expect(isSubscriptionStatus('trialing')).toBe(false);
    expect(isSubscriptionStatus('canceled')).toBe(false);
    expect(isSubscriptionStatus(null)).toBe(false);
  });
});
