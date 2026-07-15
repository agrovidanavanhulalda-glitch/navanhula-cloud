/**
 * Sprint 4.6 · Policy Catalog (pure, read-only).
 * Static list of enterprise policies that any Agentic plan must satisfy.
 */

export type PolicyId =
  | 'RISK_THRESHOLD'
  | 'MAX_COMPLEXITY'
  | 'MAX_DURATION'
  | 'MAX_COST'
  | 'ROLLBACK_READINESS'
  | 'REQUIRED_APPROVALS'
  | 'DEPENDENCY_VALIDATION'
  | 'GOVERNANCE_RULES'
  | 'KNOWLEDGE_CONFIDENCE'
  | 'SIMULATION_SCORE'
  | 'DECISION_SCORE';

export type PolicySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PolicyDefinition {
  id: PolicyId;
  label: string;
  description: string;
  severity: PolicySeverity;
  threshold: number;
  operator: 'lte' | 'gte';
}

export const POLICY_CATALOG: PolicyDefinition[] = [
  { id: 'RISK_THRESHOLD', label: 'Risk Threshold', description: 'Risco máximo tolerado.', severity: 'HIGH', threshold: 70, operator: 'lte' },
  { id: 'MAX_COMPLEXITY', label: 'Maximum Complexity', description: 'Complexidade máxima aceita.', severity: 'MEDIUM', threshold: 80, operator: 'lte' },
  { id: 'MAX_DURATION', label: 'Maximum Duration (min)', description: 'Duração máxima permitida.', severity: 'MEDIUM', threshold: 240, operator: 'lte' },
  { id: 'MAX_COST', label: 'Maximum Cost', description: 'Custo máximo permitido.', severity: 'HIGH', threshold: 1000, operator: 'lte' },
  { id: 'ROLLBACK_READINESS', label: 'Rollback Readiness', description: 'Prontidão mínima de rollback.', severity: 'CRITICAL', threshold: 60, operator: 'gte' },
  { id: 'REQUIRED_APPROVALS', label: 'Required Approvals', description: 'Aprovações mínimas.', severity: 'CRITICAL', threshold: 1, operator: 'gte' },
  { id: 'DEPENDENCY_VALIDATION', label: 'Dependency Validation', description: 'Dependências não resolvidas devem ser zero.', severity: 'HIGH', threshold: 0, operator: 'lte' },
  { id: 'GOVERNANCE_RULES', label: 'Governance Rules', description: 'Governance score mínimo.', severity: 'HIGH', threshold: 60, operator: 'gte' },
  { id: 'KNOWLEDGE_CONFIDENCE', label: 'Knowledge Confidence', description: 'Confiança mínima do knowledge base.', severity: 'MEDIUM', threshold: 55, operator: 'gte' },
  { id: 'SIMULATION_SCORE', label: 'Simulation Score', description: 'Simulation score mínimo.', severity: 'MEDIUM', threshold: 55, operator: 'gte' },
  { id: 'DECISION_SCORE', label: 'Decision Score', description: 'Decision score mínimo.', severity: 'HIGH', threshold: 60, operator: 'gte' },
];

export function getPolicy(id: PolicyId): PolicyDefinition | undefined {
  return POLICY_CATALOG.find((p) => p.id === id);
}
