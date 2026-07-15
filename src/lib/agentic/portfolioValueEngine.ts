/**
 * Sprint 5.1 · Portfolio Value Engine (pure).
 */
import type { TransformationItem } from './transformationEngine';

export interface PortfolioValueReport {
  totalInvestment: number;
  totalValue: number;
  netValue: number;
  roi: number; // %
  capacityUsage: number; // 0-100
  balance: 'CONCENTRATED' | 'BALANCED' | 'DIVERSIFIED';
}

export function analyzePortfolioValue(items: TransformationItem[] = []): PortfolioValueReport {
  const list = Array.isArray(items) ? items : [];
  const totalInvestment = list.reduce((s, i) => s + i.investment, 0);
  const totalValue = list.reduce((s, i) => s + i.value, 0);
  const netValue = totalValue - totalInvestment;
  const roi = totalInvestment === 0
    ? (totalValue > 0 ? 100 : 0)
    : Math.max(-200, Math.min(500, Math.round((netValue / totalInvestment) * 100)));
  const capacityUsage = Math.max(0, Math.min(100, list.length * 8));
  const pillars = new Set(list.map((i) => i.pillar));
  const balance: PortfolioValueReport['balance'] =
    pillars.size >= 4 ? 'DIVERSIFIED' :
    pillars.size >= 2 ? 'BALANCED' : 'CONCENTRATED';
  return { totalInvestment, totalValue, netValue, roi, capacityUsage, balance };
}
