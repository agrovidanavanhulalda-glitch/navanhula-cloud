/**
 * Sprint 7.5 · Customer 360° types (read-only, deterministic).
 */
export interface Customer360Input {
  readonly id: string;
  readonly name: string;
  readonly planTier: 'starter' | 'pro' | 'enterprise';
  readonly mrr: number;
  readonly tenureDays: number;
  readonly healthScore: number;         // 0-100
  readonly journeyScore: number;        // 0-100
  readonly nps: number;                 // -100..100
  readonly csat: number;                // 0-100
  readonly supportScore: number;        // 0-100
  readonly renewalScore: number;        // 0-100
  readonly renewalProbability: number;  // 0-1
  readonly churnProbability: number;    // 0-1
  readonly expansionMrr: number;
  readonly openTickets: number;
  readonly criticalTickets: number;
  readonly feedbackCount: number;
  readonly lifecycleStage: 'onboarding' | 'adoption' | 'retention' | 'expansion' | 'renewal' | 'churn';
}

export interface Customer360Buckets {
  CRITICAL: number;
  AT_RISK: number;
  STABLE: number;
  HEALTHY: number;
  CHAMPION: number;
}
