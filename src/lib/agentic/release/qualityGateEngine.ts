/**
 * Sprint 5.6 · Quality Gate Engine — pure.
 */
export interface QualityGateInput {
  typecheckClean?: boolean;
  testsGreen?: boolean;
  zeroRegressions?: boolean;
  readOnly?: boolean;
  darkModeSafe?: boolean;
  mobileFirst?: boolean;
  semanticTokens?: boolean;
  backwardCompatible?: boolean;
  protectedModulesUntouched?: boolean;
  consultiveOnly?: boolean;
}

export interface QualityGateCheck {
  readonly id: string;
  readonly label: string;
  readonly passed: boolean;
}

export interface QualityGateReport {
  readonly checks: readonly QualityGateCheck[];
  readonly passed: boolean;
  readonly passedCount: number;
  readonly totalCount: number;
  readonly score: number;
}

export function evaluateQualityGate(input: QualityGateInput = {}): QualityGateReport {
  const bool = (v: unknown): boolean => v === true;
  const checks: QualityGateCheck[] = [
    { id: 'typecheck', label: 'TypeScript strict clean', passed: bool(input.typecheckClean) },
    { id: 'tests', label: 'All tests green', passed: bool(input.testsGreen) },
    { id: 'regressions', label: 'Zero regressions', passed: bool(input.zeroRegressions) },
    { id: 'readOnly', label: 'Read-only consultive layer', passed: bool(input.readOnly) },
    { id: 'darkMode', label: 'Dark mode safe', passed: bool(input.darkModeSafe) },
    { id: 'mobileFirst', label: 'Mobile first', passed: bool(input.mobileFirst) },
    { id: 'tokens', label: 'Semantic tokens', passed: bool(input.semanticTokens) },
    { id: 'backCompat', label: 'Backward compatible', passed: bool(input.backwardCompatible) },
    { id: 'protected', label: 'Protected modules untouched', passed: bool(input.protectedModulesUntouched) },
    { id: 'consultive', label: '100% consultive', passed: bool(input.consultiveOnly) },
  ];
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;
  const score = Math.round((passedCount / totalCount) * 100);
  return { checks, passed: passedCount === totalCount, passedCount, totalCount, score };
}
