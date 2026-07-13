/**
 * Sprint 3.3 · Root Cause Engine (READ-ONLY, advisory).
 */
export type RootCauseSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface RootCause {
  id: string;
  severity: RootCauseSeverity;
  title: string;
  reason: string;
  evidence: string[];
}

export interface RootCauseInputs {
  rpcP95Ms: number | null;
  rpcTimeoutRate: number | null;
  storagePct: number | null;
  storageGrowthGbPerDay: number;
  telemetryPerDay: number;
  workerSuccessRate: number | null;
  queueDepth: number;
  dlq: number;
  fiscal30d: number;
}

export function detectRootCauses(i: RootCauseInputs): RootCause[] {
  const out: RootCause[] = [];
  if ((i.rpcP95Ms ?? 0) > 800 && (i.rpcTimeoutRate ?? 0) > 0.02) {
    out.push({
      id: 'rpc-saturation', severity: 'CRITICAL',
      title: 'Possível saturação de RPC',
      reason: 'Latência p95 elevada combinada com timeouts.',
      evidence: [`p95=${i.rpcP95Ms}ms`, `timeout=${((i.rpcTimeoutRate ?? 0) * 100).toFixed(1)}%`],
    });
  }
  if ((i.storagePct ?? 0) > 70 && i.telemetryPerDay > 1000) {
    out.push({
      id: 'ops-growth', severity: 'WARNING',
      title: 'Crescimento operacional acelerado',
      reason: 'Storage e telemetria a crescer em paralelo.',
      evidence: [`storage=${i.storagePct}%`, `telemetry=${i.telemetryPerDay.toFixed(0)}/dia`],
    });
  }
  if ((i.workerSuccessRate ?? 1) < 0.9 && i.queueDepth > 200) {
    out.push({
      id: 'worker-capacity', severity: 'CRITICAL',
      title: 'Capacidade de workers insuficiente',
      reason: 'Fila crescendo enquanto sucesso dos workers cai.',
      evidence: [`success=${((i.workerSuccessRate ?? 0) * 100).toFixed(1)}%`, `queue=${i.queueDepth}`],
    });
  }
  if (i.fiscal30d > 0 && i.dlq > 20) {
    out.push({
      id: 'fiscal-degraded', severity: 'WARNING',
      title: 'Worker fiscal degradado',
      reason: 'Volume fiscal com DLQ elevada.',
      evidence: [`fiscal30d=${i.fiscal30d}`, `dlq=${i.dlq}`],
    });
  }
  return out;
}
