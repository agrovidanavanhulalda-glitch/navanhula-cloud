import type { CustomerEvidence } from './types';
import { aggregateCustomerEvidence } from './customerEvidenceAggregator';
import { clamp, round } from './_utils';

export interface ReadinessReport {
  readonly customer: number;
  readonly commercial: number;
  readonly operational: number;
  readonly enterprise: number;
  readonly production: number;
}

export function computeCustomerReadiness(input: CustomerEvidence = {}): ReadinessReport {
  const { collected } = aggregateCustomerEvidence(input);
  const v = collected.values;
  const customer = round(
    (v.customerSuccessScore + v.customerHealthScore + v.journeyScore + v.customer360Score) / 4,
  );
  const commercial = round((v.renewalScore + v.customer360Score + v.customerSuccessScore) / 3);
  const operational = round((v.supportScore + v.customerHealthScore) / 2);
  const enterprise = round(
    (customer * 0.4 + commercial * 0.3 + operational * 0.3),
  );
  const production = clamp(
    round(enterprise * (collected.completeness / 100)),
  );
  return { customer, commercial, operational, enterprise, production };
}
