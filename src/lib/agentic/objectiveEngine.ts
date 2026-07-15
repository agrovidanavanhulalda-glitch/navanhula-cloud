/**
 * Sprint 4.7 · Objective Engine (pure).
 * Derives strategic objectives from platform signals.
 */
export type ObjectivePillar = 'RELIABILITY' | 'GROWTH' | 'GOVERNANCE' | 'EFFICIENCY' | 'INTELLIGENCE';

export interface StrategicObjective {
  id: string;
  pillar: ObjectivePillar;
  title: string;
  rationale: string;
  targetScore: number; // 0-100
  currentScore: number; // 0-100
  gap: number;
}

interface Signals {
  opsHealth: number;
  enterpriseScore: number;
  storageUsagePct: number;
  knowledgeScore: number;
  policyScore: number;
  simulationScore: number;
  executionReadiness: number;
}

const mk = (
  id: string, pillar: ObjectivePillar, title: string, rationale: string,
  current: number, target = 95,
): StrategicObjective => ({
  id, pillar, title, rationale,
  currentScore: current, targetScore: target,
  gap: Math.max(0, target - current),
});

export function buildObjectives(s: Signals): StrategicObjective[] {
  return [
    mk('obj-reliability', 'RELIABILITY', 'Elevar confiabilidade operacional',
       'Manter Ops Health acima do SLO enterprise.', s.opsHealth),
    mk('obj-growth', 'GROWTH', 'Sustentar crescimento enterprise',
       'Aumentar Enterprise Score preservando margem.', s.enterpriseScore),
    mk('obj-governance', 'GOVERNANCE', 'Fortalecer governança Agentic',
       'Consolidar policy + approval + audit.', s.policyScore),
    mk('obj-efficiency', 'EFFICIENCY', 'Otimizar recursos de armazenamento',
       'Reduzir pressão de storage e custo unitário.',
       Math.max(0, 100 - s.storageUsagePct)),
    mk('obj-intelligence', 'INTELLIGENCE', 'Ampliar inteligência decisória',
       'Elevar knowledge + simulation + execution readiness.',
       Math.round((s.knowledgeScore + s.simulationScore + s.executionReadiness) / 3)),
  ];
}
