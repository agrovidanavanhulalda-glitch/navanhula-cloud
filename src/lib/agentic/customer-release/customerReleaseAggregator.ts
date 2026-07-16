import type { CustomerEvidence } from './types';
import { buildCustomerReleaseReport, type CustomerReleaseReport } from './customerReleaseReport';

export interface CustomerReleaseBundle {
  readonly report: CustomerReleaseReport;
  readonly generatedAt: string;
}

export function assessCustomerRelease(
  input: CustomerEvidence = {},
  now: number = Date.now(),
): CustomerReleaseBundle {
  const report = buildCustomerReleaseReport(input);
  const generatedAt = new Date(Number.isFinite(now) ? now : 0).toISOString();
  return { report, generatedAt };
}
