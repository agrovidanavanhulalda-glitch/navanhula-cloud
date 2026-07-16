/**
 * Sprint 5.6.2 · Enterprise Certification V2 — bands derived from score, not fixed labels.
 */
export type CertificationV2 =
  | 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  | 'Enterprise' | 'Enterprise Certified' | 'Enterprise GA';

export type GradeV2 = 'F' | 'D' | 'C' | 'B' | 'A' | 'A+';

export interface CertificationV2Report {
  readonly grade: GradeV2;
  readonly certification: CertificationV2;
  readonly band: string;
}

const gradeFor = (s: number): GradeV2 => {
  const x = Number.isFinite(s) ? s : 0;
  if (x >= 95) return 'A+';
  if (x >= 88) return 'A';
  if (x >= 78) return 'B';
  if (x >= 65) return 'C';
  if (x >= 50) return 'D';
  return 'F';
};

const certFor = (s: number, gaEligible: boolean): CertificationV2 => {
  const x = Number.isFinite(s) ? s : 0;
  if (gaEligible) return 'Enterprise GA';
  if (x >= 92) return 'Enterprise Certified';
  if (x >= 88) return 'Enterprise';
  if (x >= 82) return 'Platinum';
  if (x >= 74) return 'Gold';
  if (x >= 65) return 'Silver';
  return 'Bronze';
};

export function certifyV2(enterpriseScore: number, gaEligible: boolean): CertificationV2Report {
  const grade = gradeFor(enterpriseScore);
  const certification = certFor(enterpriseScore, gaEligible);
  const band = `${grade} · ${certification}`;
  return { grade, certification, band };
}
