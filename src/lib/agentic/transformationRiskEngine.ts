/**
 * Sprint 5.1 · Transformation Risk Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';

export interface RiskItem {
  id: string;
  name: string;
  risk: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RiskReport {
  items: RiskItem[];
  avgRisk: number;
  critical: number;
  high: number;
  rating: 'CONTROLLED' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
}

export function assessRisks(items: TransformationItem[] = []): RiskReport {
  const list = Array.isArray(items) ? items : [];
  const risks: RiskItem[] = list.map((i) => {
    const level: RiskItem['level'] =
      i.risk >= 80 ? 'CRITICAL' :
      i.risk >= 60 ? 'HIGH' :
      i.risk >= 35 ? 'MEDIUM' : 'LOW';
    return { id: i.id, name: i.name, risk: i.risk, level };
  }).sort((a, b) => b.risk - a.risk || a.id.localeCompare(b.id));
  const avgRisk = list.length === 0 ? 0 : Math.round(list.reduce((s, i) => s + i.risk, 0) / list.length);
  const critical = risks.filter((r) => r.level === 'CRITICAL').length;
  const high = risks.filter((r) => r.level === 'HIGH').length;
  const rating: RiskReport['rating'] =
    avgRisk >= 75 ? 'CRITICAL' :
    avgRisk >= 55 ? 'HIGH' :
    avgRisk >= 30 ? 'ELEVATED' : 'CONTROLLED';
  return { items: risks, avgRisk, critical, high, rating };
}
