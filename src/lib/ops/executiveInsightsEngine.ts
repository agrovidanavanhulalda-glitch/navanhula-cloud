/**
 * Sprint 3.4 · Executive Insights Engine (pure, read-only).
 * Transforms live metrics into executive-level analysis.
 * No writes. No I/O. Pure functions only.
 */
import { buildPlatformForecast, type PlatformForecast } from './forecastEngine';
import { classifyPriority, type PriorityLevel } from './priorityEngine';

export interface ExecutiveMetricsInput {
  companies: number;
  users: number;
  sales30d: number;
  salesPerDay: number;
  fiscalDocs30d: number;
  fiscalPerDay: number;
  storageGb: number;
  storageGrowthGbPerDay: number;
  storagePct: number | null;
  telemetryPerDay: number;
  workersPerDay: number;
  workerSuccessRate: number | null;
  queueDepth: number;
  dlq: number;
  rpcP95Ms: number | null;
  errorRate: number | null;
  liveSourceOk: number; // 0..1
}

export interface ExecutiveInsight {
  title: string;
  description: string;
  level: PriorityLevel;
  score: number;
}

export interface ExecutiveReport {
  summary: string;
  businessHealth: number;
  growthScore: number;
  riskScore: number;
  operationalRisks: ExecutiveInsight[];
  recommendations: ExecutiveInsight[];
  priorityMatrix: ExecutiveInsight[];
  opportunities: ExecutiveInsight[];
  weeklyOutlook: string;
  monthlyForecast: string;
  forecast: PlatformForecast;
  confidenceScore: number;
  dataQualityScore: number;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function buildExecutiveReport(m: ExecutiveMetricsInput): ExecutiveReport {
  const dataQualityScore = Math.round(clamp(m.liveSourceOk * 100));

  // Business Health blends success, error and queue signals.
  const successPct = (m.workerSuccessRate ?? 1) * 100;
  const errPenalty = (m.errorRate ?? 0) * 100;
  const queuePenalty = Math.min(30, m.queueDepth / 20);
  const dlqPenalty = Math.min(20, m.dlq);
  const businessHealth = Math.round(clamp(successPct - errPenalty - queuePenalty - dlqPenalty));

  // Growth score: velocity of sales, users, docs.
  const growthRaw =
    (m.salesPerDay > 0 ? 40 : 0) +
    (m.fiscalPerDay > 0 ? 30 : 0) +
    (m.users > 0 ? Math.min(30, m.users / 10) : 0);
  const growthScore = Math.round(clamp(growthRaw));

  // Risk score: higher = more risk.
  const storagePressure = (m.storagePct ?? 0);
  const p95Pressure = (m.rpcP95Ms ?? 0) > 800 ? 25 : (m.rpcP95Ms ?? 0) > 400 ? 12 : 0;
  const riskScore = Math.round(
    clamp(storagePressure * 0.5 + p95Pressure + dlqPenalty + queuePenalty),
  );

  const risks: ExecutiveInsight[] = [];
  if ((m.storagePct ?? 0) > 75) {
    const p = classifyPriority({ impact: 80, urgency: (m.storagePct ?? 0) > 90 ? 95 : 60, risk: 80, growth: 60, cost: 40 });
    risks.push({ title: 'Pressão de Storage', description: `Uso ${m.storagePct}% com crescimento ${m.storageGrowthGbPerDay.toFixed(2)} GB/dia.`, level: p.level, score: p.score });
  }
  if ((m.rpcP95Ms ?? 0) > 800) {
    const p = classifyPriority({ impact: 70, urgency: 75, risk: 65, growth: 40, cost: 30 });
    risks.push({ title: 'Latência RPC elevada', description: `p95 atual ${m.rpcP95Ms}ms acima do alvo.`, level: p.level, score: p.score });
  }
  if (m.queueDepth > 200) {
    const p = classifyPriority({ impact: 65, urgency: 70, risk: 60, growth: 30, cost: 40 });
    risks.push({ title: 'Fila de background alta', description: `Profundidade ${m.queueDepth}, DLQ ${m.dlq}.`, level: p.level, score: p.score });
  }
  if ((m.workerSuccessRate ?? 1) < 0.9) {
    const p = classifyPriority({ impact: 75, urgency: 80, risk: 70, growth: 20, cost: 20 });
    risks.push({ title: 'Baixa taxa de sucesso de workers', description: `${((m.workerSuccessRate ?? 0) * 100).toFixed(1)}% sucesso.`, level: p.level, score: p.score });
  }

  const recs: ExecutiveInsight[] = [];
  if ((m.storagePct ?? 0) > 75) recs.push({ title: 'Expandir Storage', description: 'Aumentar quota antes do limite operacional.', level: 'HIGH', score: 75 });
  if (m.telemetryPerDay > 5000) recs.push({ title: 'Aplicar retenção de telemetria', description: 'Reduzir custo e pressão de storage.', level: 'MEDIUM', score: 55 });
  if ((m.rpcP95Ms ?? 0) > 800) recs.push({ title: 'Introduzir Read Replica', description: 'Descarregar leituras de dashboards.', level: 'HIGH', score: 72 });
  if (m.queueDepth > 200 || (m.workerSuccessRate ?? 1) < 0.9) recs.push({ title: 'Escalar Workers', description: 'Aumentar concorrência para reduzir fila.', level: 'HIGH', score: 78 });

  const opportunities: ExecutiveInsight[] = [];
  if (m.salesPerDay > 0) opportunities.push({ title: 'Aumentar conversão POS', description: `Vendas/dia atuais: ${m.salesPerDay.toFixed(1)}.`, level: 'MEDIUM', score: 60 });
  if (m.companies > 0) opportunities.push({ title: 'Cross-sell entre módulos', description: `${m.companies} empresas ativas na plataforma.`, level: 'LOW', score: 35 });

  const priorityMatrix = [...risks, ...recs].sort((a, b) => b.score - a.score).slice(0, 8);

  const forecast = buildPlatformForecast({
    companies: { current: m.companies, perDay: 0 },
    users: { current: m.users, perDay: 0 },
    sales: { current: m.sales30d, perDay: m.salesPerDay },
    revenue: { current: 0, perDay: 0 },
    fiscalDocs: { current: m.fiscalDocs30d, perDay: m.fiscalPerDay },
    storageGb: { current: m.storageGb, perDay: m.storageGrowthGbPerDay },
    workers: { current: 0, perDay: m.workersPerDay },
    telemetry: { current: 0, perDay: m.telemetryPerDay },
  });

  const confidenceScore = Math.round(clamp(dataQualityScore * 0.7 + (risks.length === 0 ? 30 : 15)));

  const summary =
    `Plataforma opera com Business Health ${businessHealth}/100, Growth ${growthScore}/100 e Risk ${riskScore}/100. ` +
    `${risks.length} riscos ativos, ${recs.length} recomendações prioritárias.`;

  const weeklyOutlook =
    `Próximos 7 dias: +${(m.salesPerDay * 7).toFixed(0)} vendas, ` +
    `+${(m.fiscalPerDay * 7).toFixed(0)} documentos fiscais, ` +
    `+${(m.storageGrowthGbPerDay * 7).toFixed(2)} GB de storage.`;

  const monthlyForecast =
    `Projeção 30 dias: ${forecast.sales.d30.toFixed(0)} vendas acumuladas, ` +
    `${forecast.fiscalDocs.d30.toFixed(0)} documentos, ` +
    `${forecast.storageGb.d30.toFixed(2)} GB de storage.`;

  return {
    summary,
    businessHealth,
    growthScore,
    riskScore,
    operationalRisks: risks,
    recommendations: recs,
    priorityMatrix,
    opportunities,
    weeklyOutlook,
    monthlyForecast,
    forecast,
    confidenceScore,
    dataQualityScore,
  };
}
