/**
 * Sprint 7.6 · Customer Release types (read-only, deterministic).
 */
export interface CustomerEvidence {
  readonly customerSuccessScore?: number;
  readonly customerHealthScore?: number;
  readonly journeyScore?: number;
  readonly feedbackScore?: number;
  readonly supportScore?: number;
  readonly renewalScore?: number;
  readonly customer360Score?: number;
}

export type EvidenceKey =
  | 'customerSuccessScore'
  | 'customerHealthScore'
  | 'journeyScore'
  | 'feedbackScore'
  | 'supportScore'
  | 'renewalScore'
  | 'customer360Score';

export const EVIDENCE_KEYS: readonly EvidenceKey[] = [
  'customerSuccessScore',
  'customerHealthScore',
  'journeyScore',
  'feedbackScore',
  'supportScore',
  'renewalScore',
  'customer360Score',
];

export type ReleaseStatus = 'NOT_READY' | 'RELEASE_CANDIDATE' | 'GENERAL_AVAILABILITY';
export type CertificationLevel = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type QualityGateStatus = 'FAIL' | 'WARN' | 'PASS';
