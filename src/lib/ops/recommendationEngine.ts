/**
 * Sprint 3.3 · Recommendation + Confidence + Impact Engines (READ-ONLY).
 * Never triggers actions. Pure advisory output.
 */
import type { RootCause } from './rootCauseEngine';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ConfidenceBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  impact: string;
  risk: string;
  benefit: string;
  confidence: number;         // 0..100
  confidenceBand: ConfidenceBand;
  evidence: string[];
  causeId?: string;
}

export interface RecommendationInputs {
  rpcP95Ms: number | null;
  rpcTimeoutRate: number | null;
  storagePct: number | null;
  storageGrowthGbPerDay: number;
  telemetryPerDay: number;
  workerSuccessRate: number | null;
  queueDepth: number;
  dlq: number;
  causes: RootCause[];
  dataQuality: number; // 0..1 fraction of live/healthy sources
}

function band(score: number): ConfidenceBand {
  if (score >= 85) return 'VERY HIGH';
  if (score >= 70) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

function conf(base: number, quality: number): number {
  return Math.round(Math.max(0, Math.min(100, base * (0.5 + 0.5 * quality))));
}

export function recommend(i: RecommendationInputs): Recommendation[] {
  const out: Recommendation[] = [];
  const q = i.dataQuality;

  if (i.queueDepth > 200 || (i.workerSuccessRate ?? 1) < 0.9) {
    const c = conf(85, q);
    out.push({
      id: 'add-worker',
      title: 'Adicionar Worker',
      description: 'Aumentar concorrência ou instâncias para reduzir profundidade da fila.',
      priority: i.queueDepth > 1000 ? 'CRITICAL' : 'HIGH',
      impact: '↓ Queue, ↑ Disponibilidade',
      risk: 'Aumento marginal de custo compute.',
      benefit: 'Reduz latência ponta-a-ponta de tarefas em background.',
      confidence: c, confidenceBand: band(c),
      evidence: [`queue=${i.queueDepth}`, `success=${((i.workerSuccessRate ?? 0) * 100).toFixed(1)}%`],
      causeId: 'worker-capacity',
    });
  }
  if ((i.storagePct ?? 0) > 75) {
    const c = conf(80, q);
    out.push({
      id: 'expand-storage',
      title: 'Expandir Storage',
      description: 'Aumentar quota antes de atingir limite operacional.',
      priority: (i.storagePct ?? 0) > 90 ? 'CRITICAL' : 'HIGH',
      impact: '↑ Escalabilidade',
      risk: 'Custo mensal adicional.',
      benefit: 'Evita paragens por falta de espaço.',
      confidence: c, confidenceBand: band(c),
      evidence: [`storage=${i.storagePct}%`, `growth=${i.storageGrowthGbPerDay.toFixed(2)} GB/dia`],
    });
  }
  if (i.telemetryPerDay > 5000) {
    const c = conf(70, q);
    out.push({
      id: 'archive-logs',
      title: 'Arquivar Logs / Limpar Telemetria',
      description: 'Aplicar retenção a telemetry_events e system_errors antigos.',
      priority: 'MEDIUM',
      impact: '↓ Storage, ↓ Custo',
      risk: 'Perda de histórico granular fora da janela retida.',
      benefit: 'Reduz pressão em storage e queries.',
      confidence: c, confidenceBand: band(c),
      evidence: [`telemetry=${i.telemetryPerDay.toFixed(0)}/dia`],
    });
  }
  if ((i.rpcP95Ms ?? 0) > 800) {
    const c = conf(75, q);
    out.push({
      id: 'read-replica',
      title: 'Criar Read Replica',
      description: 'Descarregar leitura de dashboards e relatórios.',
      priority: 'HIGH',
      impact: '↓ Latência, ↑ Disponibilidade',
      risk: 'Complexidade operacional e custo.',
      benefit: 'Reduz p95 de RPCs quentes.',
      confidence: c, confidenceBand: band(c),
      evidence: [`p95=${i.rpcP95Ms}ms`],
      causeId: 'rpc-saturation',
    });
  }
  if (i.dlq > 20) {
    const c = conf(78, q);
    out.push({
      id: 'partition-table',
      title: 'Particionar tabela / Rever DLQ',
      description: 'Particionar background_tasks por data e reprocessar DLQ.',
      priority: 'MEDIUM',
      impact: '↓ Latência, ↓ Queue',
      risk: 'Requer migração cuidadosa.',
      benefit: 'Melhora throughput de fila.',
      confidence: c, confidenceBand: band(c),
      evidence: [`dlq=${i.dlq}`],
    });
  }
  if (i.telemetryPerDay > 20000) {
    const c = conf(60, q);
    out.push({
      id: 'reduce-polling',
      title: 'Reduzir polling',
      description: 'Aumentar intervalos de refetch em hooks live não críticos.',
      priority: 'LOW',
      impact: '↓ Custo, ↓ Workers',
      risk: 'Dados menos frescos.',
      benefit: 'Reduz volume de eventos telemetry.',
      confidence: c, confidenceBand: band(c),
      evidence: [`telemetry=${i.telemetryPerDay.toFixed(0)}/dia`],
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence);
}

export interface ExecutiveSummary {
  situation: string;
  strengths: string[];
  criticals: string[];
  futureRisks: string[];
  priorityRecs: string[];
  capacityOutlook: string;
  enterpriseReadiness: 'READY' | 'AT_RISK' | 'NOT_READY';
  avgConfidence: number;
}

export function buildExecutiveSummary(
  recs: Recommendation[],
  causes: RootCause[],
  score: number,
): ExecutiveSummary {
  const criticals = [
    ...causes.filter(c => c.severity === 'CRITICAL').map(c => c.title),
    ...recs.filter(r => r.priority === 'CRITICAL').map(r => r.title),
  ];
  const strengths: string[] = [];
  if (score >= 80) strengths.push('Score enterprise saudável');
  if (recs.length === 0) strengths.push('Sem recomendações urgentes');
  const avg = recs.length
    ? Math.round(recs.reduce((s, r) => s + r.confidence, 0) / recs.length)
    : 0;
  const readiness: ExecutiveSummary['enterpriseReadiness'] =
    criticals.length === 0 && score >= 80 ? 'READY'
    : criticals.length > 2 || score < 60 ? 'NOT_READY'
    : 'AT_RISK';
  return {
    situation: `Score atual ${score}/100 com ${recs.length} recomendações e ${causes.length} causas prováveis.`,
    strengths: strengths.length ? strengths : ['Operação estável nos limites atuais.'],
    criticals: criticals.length ? criticals : ['Sem eventos críticos ativos.'],
    futureRisks: recs.filter(r => r.priority === 'HIGH' || r.priority === 'CRITICAL').map(r => r.title),
    priorityRecs: recs.slice(0, 5).map(r => `${r.title} (${r.confidenceBand})`),
    capacityOutlook: 'Ver Capacity Center para projeções detalhadas.',
    enterpriseReadiness: readiness,
    avgConfidence: avg,
  };
}
