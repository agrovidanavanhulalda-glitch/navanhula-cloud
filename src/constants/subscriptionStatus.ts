/**
 * NAVANHULA CLOUD — Shared Subscription Status Constants
 *
 * Single source of truth for `subscription_status` enum values.
 * Must stay in sync with the PostgreSQL enum:
 *
 *   CREATE TYPE subscription_status AS ENUM (
 *     'active', 'warning', 'blocked', 'cancelled',
 *     'trial', 'past_due', 'suspended', 'expired', 'lifetime'
 *   );
 *
 * NEVER hard-code these string literals elsewhere — import from here.
 * Common misspellings that MUST NOT appear anywhere:
 *   ❌ 'trialing' | 'trialling' | 'trial_expired'
 *   ❌ 'canceled' (US) — the enum uses 'cancelled' (UK)
 *   ❌ 'inactive' | 'ativo'
 */
export const SubscriptionStatus = {
  ACTIVE: 'active',
  WARNING: 'warning',
  BLOCKED: 'blocked',
  CANCELLED: 'cancelled',
  TRIAL: 'trial',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  LIFETIME: 'lifetime',
} as const;

export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const SUBSCRIPTION_STATUS_VALUES: SubscriptionStatus[] =
  Object.values(SubscriptionStatus);

export const isSubscriptionStatus = (v: unknown): v is SubscriptionStatus =>
  typeof v === 'string' &&
  (SUBSCRIPTION_STATUS_VALUES as string[]).includes(v);
