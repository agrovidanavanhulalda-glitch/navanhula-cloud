/**
 * Sprint 5.6.1 · Enterprise Weight Engine — pure, single source of truth for weights.
 */
export type EvidenceKey =
  | 'security' | 'testing' | 'architecture' | 'operations' | 'aiEnterprise'
  | 'governance' | 'compliance' | 'businessContinuity' | 'digitalTwin'
  | 'performance' | 'observability' | 'transformation' | 'strategy'
  | 'knowledge' | 'decision' | 'simulation' | 'documentation' | 'release';

export const ENTERPRISE_WEIGHTS: Readonly<Record<EvidenceKey, number>> = Object.freeze({
  security: 15,
  testing: 15,
  architecture: 10,
  operations: 10,
  aiEnterprise: 10,
  governance: 8,
  compliance: 8,
  businessContinuity: 6,
  digitalTwin: 5,
  performance: 5,
  observability: 5,
  transformation: 3,
  strategy: 3,
  knowledge: 2,
  decision: 2,
  simulation: 1,
  documentation: 1,
  release: 1,
});

export const EVIDENCE_KEYS: readonly EvidenceKey[] = Object.freeze(
  Object.keys(ENTERPRISE_WEIGHTS) as EvidenceKey[],
);

export function totalWeight(): number {
  return Object.values(ENTERPRISE_WEIGHTS).reduce((a, b) => a + b, 0);
}

export function normalizedWeights(): Readonly<Record<EvidenceKey, number>> {
  const t = totalWeight() || 1;
  const out = {} as Record<EvidenceKey, number>;
  for (const k of EVIDENCE_KEYS) out[k] = ENTERPRISE_WEIGHTS[k] / t;
  return Object.freeze(out);
}
