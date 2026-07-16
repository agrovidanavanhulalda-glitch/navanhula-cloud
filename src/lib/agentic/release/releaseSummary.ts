/**
 * Sprint 5.6.1 · Release Summary — executive narrative (pure).
 */
import type { ReleaseCalibrationReport } from './releaseCalibration';

export type ExecutiveVerdict = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';

export interface ExecutiveSummary {
  readonly headline: string;
  readonly highlights: readonly string[];
  readonly verdict: ExecutiveVerdict;
}

export function summarizeCalibration(r: ReleaseCalibrationReport): ExecutiveSummary {
  const { calibration, readiness, certification, grade, gate } = r;
  const verdict: ExecutiveVerdict =
    readiness.gaEligible && gate.passed ? 'GO' :
    calibration.enterpriseScore >= 75 ? 'CONDITIONAL_GO' : 'NO_GO';
  const highlights: string[] = [
    `Enterprise Score ${calibration.enterpriseScore}/100 (Grade ${grade}).`,
    `GA Score ${calibration.gaScore}/100 · Production ${calibration.productionReadiness}/100.`,
    `Release Stage: ${readiness.stage} (${readiness.passedCount}/${readiness.totalCount} critérios).`,
    `Quality Gate: ${gate.passedCount}/${gate.totalCount}.`,
    `Certification: ${certification}.`,
  ];
  const headline = verdict === 'GO'
    ? `Plataforma certificada como ${certification}.`
    : verdict === 'CONDITIONAL_GO'
      ? `Plataforma em ${readiness.stage} — pronta condicionalmente.`
      : `Plataforma em ${readiness.stage} — bloqueios pendentes.`;
  return { headline, highlights, verdict };
}
