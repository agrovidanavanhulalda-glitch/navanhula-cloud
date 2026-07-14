/**
 * Sprint 4.0 · Workflow Engine (pure).
 * Detects problems from live metrics snapshot and returns candidate plans.
 * READ-ONLY. No side effects.
 */
import { buildPlan, type AgenticPlan, type DetectedProblem } from './plannerEngine';

export interface WorkflowMetrics {
  storagePct: number | null;
  storageGrowthGbPerDay: number;
  workerSuccessRate: number | null;
  queueDepth: number;
  dlq: number;
  rpcP95Ms: number | null;
  liveSourceOk: number; // 0..1
}

export function detectProblems(m: WorkflowMetrics): DetectedProblem[] {
  const out: DetectedProblem[] = [];
  if ((m.storagePct ?? 0) > 75) {
    out.push({
      id: 'storage-pressure',
      kind: 'STORAGE',
      title: 'Storage quase cheio',
      description: `Uso atual ${m.storagePct}% com crescimento ${m.storageGrowthGbPerDay.toFixed(2)} GB/dia.`,
      severity: (m.storagePct ?? 0) > 90 ? 'CRITICAL' : 'HIGH',
      evidence: [`storagePct=${m.storagePct}`, `growth=${m.storageGrowthGbPerDay.toFixed(2)} GB/dia`],
      timeSensitivityHours: (m.storagePct ?? 0) > 90 ? 6 : 48,
    });
  }
  if ((m.workerSuccessRate ?? 1) < 0.9) {
    out.push({
      id: 'worker-degraded',
      kind: 'WORKER',
      title: 'Worker degradado',
      description: `Taxa de sucesso ${(((m.workerSuccessRate ?? 0) * 100)).toFixed(1)}%.`,
      severity: (m.workerSuccessRate ?? 1) < 0.7 ? 'CRITICAL' : 'HIGH',
      evidence: [`success=${((m.workerSuccessRate ?? 0) * 100).toFixed(1)}%`, `queue=${m.queueDepth}`],
      timeSensitivityHours: 12,
    });
  }
  if (m.dlq > 20) {
    out.push({
      id: 'dlq-growing',
      kind: 'DLQ',
      title: 'DLQ crescente',
      description: `DLQ com ${m.dlq} itens.`,
      severity: m.dlq > 200 ? 'CRITICAL' : m.dlq > 50 ? 'HIGH' : 'MEDIUM',
      evidence: [`dlq=${m.dlq}`],
      timeSensitivityHours: 24,
    });
  }
  if ((m.rpcP95Ms ?? 0) > 800) {
    out.push({
      id: 'rpc-slow',
      kind: 'RPC',
      title: 'RPC lenta',
      description: `p95 atual ${m.rpcP95Ms}ms.`,
      severity: (m.rpcP95Ms ?? 0) > 2000 ? 'CRITICAL' : 'HIGH',
      evidence: [`p95=${m.rpcP95Ms}ms`],
      timeSensitivityHours: 24,
    });
  }
  return out;
}

export function buildPlansFromMetrics(m: WorkflowMetrics): AgenticPlan[] {
  const problems = detectProblems(m);
  return problems.map((p) => buildPlan(p, m.liveSourceOk));
}
