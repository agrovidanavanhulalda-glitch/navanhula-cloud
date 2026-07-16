import type { Customer360Input } from './types';
import { computeCustomer360Score } from './customer360Score';
import { computeRisk } from './customerRiskIndex';
import { computeOpportunity } from './_shim';

export interface ExecutiveSummary {
  readonly headline: string;
  readonly highlights: string[];
}

export function summarizeCustomer(c: Customer360Input): ExecutiveSummary {
  const score = computeCustomer360Score(c);
  const risk = computeRisk(c);
  const opp = computeOpportunity(c);
  const highlights: string[] = [];
  highlights.push(`Score 360°: ${score.score} (${score.grade})`);
  highlights.push(`Risco: ${risk.band}`);
  if (opp.hasOpportunity) highlights.push(`Oportunidade: ${opp.type} (+${opp.estimatedMrrLift} MZN)`);
  if (risk.reasons.length) highlights.push(...risk.reasons.slice(0, 2));
  const headline = risk.band === 'CRITICAL' || risk.band === 'HIGH'
    ? `${c.name}: intervenção necessária`
    : opp.hasOpportunity
      ? `${c.name}: oportunidade ${opp.type}`
      : `${c.name}: perfil estável`;
  return { headline, highlights };
}
