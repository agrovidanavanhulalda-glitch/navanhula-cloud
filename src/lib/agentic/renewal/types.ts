/**
 * Sprint 7.3 · Renewal & Revenue Intelligence — shared types.
 * Pure, deterministic. No side-effects.
 */

export interface RenewalContract {
  readonly id: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly planTier: 'starter' | 'pro' | 'enterprise';
  readonly mrr: number;
  readonly startDate: string; // ISO
  readonly renewalDate: string; // ISO
  readonly tenureDays: number;
  readonly usagePct: number; // 0-100 feature adoption
  readonly npsScore: number; // -100..100 or 0..10 (clamped)
  readonly overdueInvoices: number;
  readonly criticalTickets: number;
  readonly daysSinceLastLogin: number;
  readonly expansionSignals: number; // count 0..N
}

export type RenewalBand = 'CRITICAL' | 'AT_RISK' | 'STABLE' | 'HEALTHY' | 'CHAMPION';
export type RenewalPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type RenewalStage =
  | 'EXPIRED'
  | 'DUE_NOW'
  | 'DUE_30D'
  | 'DUE_60D'
  | 'DUE_90D'
  | 'FUTURE';
