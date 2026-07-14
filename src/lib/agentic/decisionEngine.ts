/**
 * Sprint 4.0 · Decision Engine (pure).
 * Scores confidence, impact, risk, cost of proposed agentic actions.
 */

export interface DecisionInput {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidenceCount: number;
  dataQuality: number; // 0..1
  timeSensitivityHours?: number;
}

export interface DecisionScore {
  confidence: number; // 0..100
  impact: number;     // 0..100
  risk: number;       // 0..100
  cost: number;       // 0..100
  urgency: number;    // 0..100
}

export function scoreDecision(i: DecisionInput): DecisionScore {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const sevMap: Record<DecisionInput['severity'], number> = { LOW: 20, MEDIUM: 50, HIGH: 75, CRITICAL: 95 };
  const sev = sevMap[i.severity];
  const confidence = clamp(60 * i.dataQuality + Math.min(30, i.evidenceCount * 5) + 10);
  const impact = clamp(sev);
  const risk = clamp(sev * 0.6 + (1 - i.dataQuality) * 40);
  const cost = clamp(20 + sev * 0.5);
  const urgency = clamp(sev + (i.timeSensitivityHours && i.timeSensitivityHours < 24 ? 20 : 0));
  return {
    confidence: Math.round(confidence),
    impact: Math.round(impact),
    risk: Math.round(risk),
    cost: Math.round(cost),
    urgency: Math.round(urgency),
  };
}
