/**
 * Sprint 7.1 · Engagement Engine (pure).
 */
import type { CustomerSignals } from '../customer-success/customerHealthEngine';

const num = (n: number): number => (Number.isFinite(n) && n >= 0 ? n : 0);
const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0));

export interface EngagementResult {
  readonly score: number;
  readonly band: 'DORMANT' | 'LOW' | 'STEADY' | 'ACTIVE' | 'INTENSE';
}

export function evaluateEngagement(s: CustomerSignals): EngagementResult {
  const idle = num(s.daysSinceLastLogin);
  const loginScore = idle >= 30 ? 0 : idle >= 14 ? 30 : idle >= 7 ? 60 : idle >= 2 ? 85 : 100;
  const activity = Math.min(60, num(s.sales30d) * 0.5 + num(s.fiscalDocs30d) * 0.3);
  const score = clamp(loginScore * 0.6 + activity);
  const band = score >= 85 ? 'INTENSE'
    : score >= 65 ? 'ACTIVE'
    : score >= 45 ? 'STEADY'
    : score >= 20 ? 'LOW'
    : 'DORMANT';
  return { score: Math.round(score), band };
}
