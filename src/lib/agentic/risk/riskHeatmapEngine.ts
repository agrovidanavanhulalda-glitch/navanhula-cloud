/**
 * Sprint 5.2 · Risk Heatmap Engine (pure).
 * 5x5 heatmap: rows=impact bucket, cols=probability bucket.
 */
import type { NormalizedRisk } from './enterpriseRiskEngine';

export interface HeatmapCell {
  row: number; // 0-4 (impact)
  col: number; // 0-4 (probability)
  count: number;
  ids: string[];
}

export interface Heatmap {
  cells: HeatmapCell[]; // length 25
  max: number;
}

const bucket = (v: number): number => Math.min(4, Math.max(0, Math.floor(v / 20)));

export function buildHeatmap(list: NormalizedRisk[]): Heatmap {
  const cells: HeatmapCell[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) cells.push({ row: r, col: c, count: 0, ids: [] });
  }
  for (const r of list) {
    const row = bucket(r.impact);
    const col = bucket(r.probability);
    const idx = row * 5 + col;
    cells[idx].count++;
    cells[idx].ids.push(r.id);
  }
  for (const c of cells) c.ids.sort();
  const max = cells.reduce((m, c) => (c.count > m ? c.count : m), 0);
  return { cells, max };
}
