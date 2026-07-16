/**
 * Sprint 5.6.1 · Enterprise Grade Engine — pure classification.
 */
export type EnterpriseGrade = 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';
export type CertificationLevel =
  | 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  | 'Enterprise' | 'Enterprise Certified' | 'Enterprise GA';

export function classifyGrade(score: number): EnterpriseGrade {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 95) return 'A+';
  if (s >= 88) return 'A';
  if (s >= 78) return 'B';
  if (s >= 65) return 'C';
  if (s >= 50) return 'D';
  return 'F';
}

export function classifyCertification(
  enterpriseScore: number,
  gaEligible: boolean,
): CertificationLevel {
  const s = Number.isFinite(enterpriseScore) ? enterpriseScore : 0;
  if (gaEligible) return 'Enterprise GA';
  if (s >= 92) return 'Enterprise Certified';
  if (s >= 88) return 'Enterprise';
  if (s >= 82) return 'Platinum';
  if (s >= 74) return 'Gold';
  if (s >= 65) return 'Silver';
  return 'Bronze';
}
