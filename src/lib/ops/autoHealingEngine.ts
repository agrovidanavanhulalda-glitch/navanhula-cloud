/**
 * Sprint 3.0 · Auto-Healing Recommendations (READ-ONLY, advisory).
 * Never triggers actions. Pure suggestion generator.
 */

export type HealingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface HealingRecommendation {
  id: string;
  severity: HealingSeverity;
  area: 'queue' | 'storage' | 'realtime' | 'rpc' | 'database' | 'workers';
  title: string;
  suggestion: string;
  evidence: string;
}

export interface HealingInputs {
  queueDepth: number;
  queueGrowthPerMin: number;
  dlqCount: number;
  storagePctUsed: number | null;
  storageGrowthGbPerDay: number;
  realtimeChannels: number;
  rpcErrorRate: number | null;
  rpcP95Ms: number | null;
  workerSuccessRate: number | null;
}

export function recommend(i: HealingInputs): HealingRecommendation[] {
  const out: HealingRecommendation[] = [];

  if (i.queueDepth > 500 || i.queueGrowthPerMin > 20) {
    out.push({
      id: 'queue-scale',
      severity: i.queueDepth > 2000 ? 'CRITICAL' : 'WARNING',
      area: 'queue',
      title: 'Fila de background_tasks crescendo',
      suggestion: 'Aumentar concorrência dos workers ou adicionar shards por company_id.',
      evidence: `depth=${i.queueDepth}, growth=${i.queueGrowthPerMin.toFixed(1)}/min`,
    });
  }
  if (i.dlqCount > 10) {
    out.push({
      id: 'dlq-review',
      severity: i.dlqCount > 50 ? 'CRITICAL' : 'WARNING',
      area: 'queue',
      title: 'DLQ elevada',
      suggestion: 'Rever runbook de reprocessamento e causas raiz.',
      evidence: `dlq=${i.dlqCount}`,
    });
  }
  if (i.storagePctUsed !== null && i.storagePctUsed >= 80) {
    out.push({
      id: 'storage-cleanup',
      severity: i.storagePctUsed >= 90 ? 'CRITICAL' : 'WARNING',
      area: 'storage',
      title: 'Storage próximo do limite',
      suggestion: 'Aplicar retenção em telemetria/logs antigos ou aumentar quota.',
      evidence: `used=${i.storagePctUsed.toFixed(1)}%`,
    });
  }
  if (i.storageGrowthGbPerDay > 1) {
    out.push({
      id: 'storage-growth',
      severity: 'INFO',
      area: 'storage',
      title: 'Crescimento acelerado de storage',
      suggestion: 'Revisar buckets com maior crescimento e políticas de retenção.',
      evidence: `${i.storageGrowthGbPerDay.toFixed(2)} GB/dia`,
    });
  }
  if (i.realtimeChannels > 5000) {
    out.push({
      id: 'realtime-shard',
      severity: 'WARNING',
      area: 'realtime',
      title: 'Realtime saturando',
      suggestion: 'Sharding por tenant e limitação de subscrições por canal.',
      evidence: `channels=${i.realtimeChannels}`,
    });
  }
  if (i.rpcErrorRate !== null && i.rpcErrorRate > 0.02) {
    out.push({
      id: 'rpc-errors',
      severity: i.rpcErrorRate > 0.05 ? 'CRITICAL' : 'WARNING',
      area: 'rpc',
      title: 'Taxa de erro RPC elevada',
      suggestion: 'Investigar top RPCs com erro em telemetry_events.',
      evidence: `err=${(i.rpcErrorRate * 100).toFixed(2)}%`,
    });
  }
  if (i.rpcP95Ms !== null && i.rpcP95Ms > 800) {
    out.push({
      id: 'rpc-latency',
      severity: i.rpcP95Ms > 1500 ? 'CRITICAL' : 'WARNING',
      area: 'rpc',
      title: 'Latência RPC alta',
      suggestion: 'Ativar cache L1 (TanStack) em consultas quentes.',
      evidence: `p95=${i.rpcP95Ms.toFixed(0)}ms`,
    });
  }
  if (i.workerSuccessRate !== null && i.workerSuccessRate < 0.95) {
    out.push({
      id: 'worker-health',
      severity: i.workerSuccessRate < 0.85 ? 'CRITICAL' : 'WARNING',
      area: 'workers',
      title: 'Workers com sucesso baixo',
      suggestion: 'Verificar Edge Function logs e políticas de retry.',
      evidence: `success=${(i.workerSuccessRate * 100).toFixed(1)}%`,
    });
  }
  return out;
}
