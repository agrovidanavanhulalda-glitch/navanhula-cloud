/**
 * Sprint 5.6.2 · GA Evidence Engine — derives EvidenceInput from raw platform signals.
 * Pure. No I/O.
 */
import { normalizeSignal, type RawSignal } from './qualityNormalization';
import type { EvidenceInput } from './enterpriseEvidenceEngine';

export interface PlatformSignals {
  readonly typecheck?: RawSignal | boolean;
  readonly vitest?: RawSignal;
  readonly coverage?: RawSignal | number;
  readonly security?: RawSignal | number;
  readonly architecture?: RawSignal | number;
  readonly observability?: RawSignal | number;
  readonly performance?: RawSignal | number;
  readonly scalability?: RawSignal | number;
  readonly governance?: RawSignal | number;
  readonly compliance?: RawSignal | number;
  readonly agentic?: RawSignal | number;
  readonly businessContinuity?: RawSignal | number;
  readonly digitalTwin?: RawSignal | number;
  readonly releaseChecklist?: RawSignal;
  readonly qualityGates?: RawSignal;
  readonly operations?: RawSignal | number;
  readonly transformation?: RawSignal | number;
  readonly strategy?: RawSignal | number;
  readonly knowledge?: RawSignal | number;
  readonly decision?: RawSignal | number;
  readonly simulation?: RawSignal | number;
  readonly documentation?: RawSignal | number;
}

const avg = (...ns: number[]): number => {
  const xs = ns.filter((n) => Number.isFinite(n));
  if (xs.length === 0) return 0;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
};

export function deriveEvidence(signals: PlatformSignals = {}): EvidenceInput {
  const n = (s: PlatformSignals[keyof PlatformSignals]) => normalizeSignal(s ?? null);
  const typecheck = n(signals.typecheck);
  const vitest = n(signals.vitest);
  const coverage = n(signals.coverage);
  const testing = avg(typecheck, vitest, coverage);
  const releaseChecklist = n(signals.releaseChecklist);
  const qualityGates = n(signals.qualityGates);
  return {
    security: n(signals.security),
    testing,
    architecture: n(signals.architecture),
    operations: avg(n(signals.operations), n(signals.observability), n(signals.performance)),
    aiEnterprise: n(signals.agentic),
    governance: n(signals.governance),
    compliance: n(signals.compliance),
    businessContinuity: n(signals.businessContinuity),
    digitalTwin: n(signals.digitalTwin),
    performance: n(signals.performance),
    observability: n(signals.observability),
    transformation: n(signals.transformation),
    strategy: n(signals.strategy),
    knowledge: n(signals.knowledge),
    decision: n(signals.decision),
    simulation: n(signals.simulation),
    documentation: n(signals.documentation),
    release: avg(releaseChecklist, qualityGates),
  };
}
