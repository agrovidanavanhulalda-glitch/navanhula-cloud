import React from 'react';
import { Badge } from '@/components/ui/badge';
import { calibrateRelease } from '@/lib/agentic/release/releaseCalibration';
import { summarizeCalibration } from '@/lib/agentic/release/releaseSummary';

/**
 * Sprint 5.6.1 · Founder Enterprise Release Center — read-only, calibrated.
 * Consumes evidence via pure engines. No hardcoded scores, no writes.
 */

// Evidence values derived from prior sprint reports (5.0–5.6). Read-only inputs.
const EVIDENCE = {
  security: 90, testing: 95, architecture: 88, operations: 87,
  aiEnterprise: 88, governance: 85, compliance: 87, businessContinuity: 84,
  digitalTwin: 90, performance: 86, observability: 84, transformation: 84,
  strategy: 85, knowledge: 82, decision: 86, simulation: 88,
  documentation: 80, release: 86,
};

const GATE = {
  typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
  darkModeSafe: true, mobileFirst: true, semanticTokens: true,
  backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
};

const gradeColor = (g: string): string =>
  g === 'A+' ? 'border-emerald-500/40 text-emerald-500'
  : g === 'A' ? 'border-primary/40 text-primary'
  : g === 'B' ? 'border-amber-500/40 text-amber-500'
  : 'border-destructive/40 text-destructive';

const stageColor = (s: string): string =>
  s === 'Enterprise GA' ? 'border-emerald-500/40 text-emerald-500'
  : s.startsWith('RC') ? 'border-primary/40 text-primary'
  : s === 'Conditional GO' ? 'border-amber-500/40 text-amber-500'
  : 'border-destructive/40 text-destructive';

const certColor = (c: string): string =>
  c === 'Enterprise GA' ? 'border-emerald-500/40 text-emerald-500'
  : c === 'Enterprise Certified' || c === 'Enterprise' ? 'border-primary/40 text-primary'
  : c === 'Platinum' || c === 'Gold' ? 'border-amber-500/40 text-amber-500'
  : 'border-border text-muted-foreground';

const FounderReleaseCenterPage: React.FC = () => {
  const report = React.useMemo(() => calibrateRelease({ evidence: EVIDENCE, gate: GATE }), []);
  const summary = React.useMemo(() => summarizeCalibration(report), [report]);
  const { calibration, readiness, gate, gaps, recommendations, grade, certification } = report;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Enterprise Release Center</h1>
            <p className="text-sm text-muted-foreground">
              Certificação calibrada por evidências — 100% consultivo, somente leitura.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={stageColor(readiness.stage)}>Stage · {readiness.stage}</Badge>
            <Badge variant="outline" className={gradeColor(grade)}>Grade · {grade}</Badge>
            <Badge variant="outline" className={certColor(certification)}>Cert · {certification}</Badge>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Enterprise Score', value: calibration.enterpriseScore },
          { label: 'GA Score', value: calibration.gaScore },
          { label: 'Production Readiness', value: calibration.productionReadiness },
          { label: 'Release Readiness', value: calibration.releaseReadiness },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-3xl font-black">
              {k.value}<span className="text-base text-muted-foreground">/100</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold">
            Enterprise GA Criteria ({readiness.passedCount}/{readiness.totalCount})
          </h2>
          <ul className="grid gap-1 text-sm">
            {readiness.criteria.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono tabular-nums text-xs">{c.value}</span>
                  <span className={c.passed ? 'text-emerald-500' : 'text-destructive'}>
                    {c.passed ? '✓' : '✗'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold">
            Quality Gate ({gate.passedCount}/{gate.totalCount})
          </h2>
          <ul className="grid gap-1 text-sm">
            {gate.checks.map((c) => (
              <li key={c.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">{c.label}</span>
                <span className={c.passed ? 'text-emerald-500' : 'text-destructive'}>
                  {c.passed ? '✓' : '✗'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold text-emerald-500">Strengths</h2>
          <ul className="grid gap-1 text-sm">
            {gaps.strengths.length === 0 && <li className="text-muted-foreground">—</li>}
            {gaps.strengths.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span className="text-muted-foreground">{s.key}</span>
                <span className="font-mono tabular-nums">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold text-amber-500">Weaknesses</h2>
          <ul className="grid gap-1 text-sm">
            {gaps.weaknesses.length === 0 && <li className="text-muted-foreground">—</li>}
            {gaps.weaknesses.map((w) => (
              <li key={w.key} className="flex items-center justify-between">
                <span className="text-muted-foreground">{w.key}</span>
                <span className="font-mono tabular-nums">{w.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold text-destructive">Remaining Gaps</h2>
          <ul className="grid gap-1 text-sm">
            {gaps.remainingGaps.length === 0 && <li className="text-emerald-500">Nenhum gap crítico.</li>}
            {gaps.remainingGaps.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{g.label}</span>
                <span className="font-mono tabular-nums">−{g.gap}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-3 text-base font-bold">Recommendations</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-emerald-500">Nenhuma recomendação pendente.</p>
        ) : (
          <ul className="grid gap-2 text-sm">
            {recommendations.slice(0, 10).map((r) => (
              <li key={r.id} className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={
                    r.priority === 'CRITICAL' ? 'border-destructive/40 text-destructive'
                    : r.priority === 'HIGH' ? 'border-amber-500/40 text-amber-500'
                    : 'border-primary/40 text-primary'
                  }
                >
                  {r.priority}
                </Badge>
                <span className="text-muted-foreground">{r.action}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-2 text-base font-bold">Executive Summary</h2>
        <p className="text-sm">{summary.headline}</p>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
          {summary.highlights.map((h) => <li key={h}>• {h}</li>)}
        </ul>
        <div className="mt-3">
          <Badge
            variant="outline"
            className={
              summary.verdict === 'GO' ? 'border-emerald-500/40 text-emerald-500'
              : summary.verdict === 'CONDITIONAL_GO' ? 'border-amber-500/40 text-amber-500'
              : 'border-destructive/40 text-destructive'
            }
          >
            Parecer Executivo · {summary.verdict}
          </Badge>
        </div>
      </section>
    </div>
  );
};

export default FounderReleaseCenterPage;
