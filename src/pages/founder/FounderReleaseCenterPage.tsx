import React from 'react';
import { Badge } from '@/components/ui/badge';
import { computeRelease } from '@/lib/agentic/release/releaseEngine';

/**
 * Sprint 5.6 · Founder Enterprise Release Center — read-only, consultive.
 * No writes, no queries, no persistence. Pure engines only.
 */
const DEFAULT_SCORE = {
  architecture: 88, security: 90, performance: 86, observability: 84,
  compliance: 87, governance: 85, continuity: 82, digitalTwin: 90,
  aiEnterprise: 88, operations: 87, transformation: 84, risk: 83,
  decision: 86, knowledge: 82, simulation: 88, strategy: 85,
  policy: 84, capability: 87, executiveAnalytics: 89, testing: 92, recovery: 84,
};

const DEFAULT_GATE = {
  typecheckClean: true, testsGreen: true, zeroRegressions: true, readOnly: true,
  darkModeSafe: true, mobileFirst: true, semanticTokens: true,
  backwardCompatible: true, protectedModulesUntouched: true, consultiveOnly: true,
};

const gradeColor = (grade: string): string => {
  if (grade === 'A+') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40';
  if (grade === 'A') return 'bg-primary/15 text-primary border-primary/40';
  if (grade === 'B') return 'bg-amber-500/15 text-amber-500 border-amber-500/40';
  return 'bg-destructive/15 text-destructive border-destructive/40';
};

const statusColor = (s: string): string => {
  if (s === 'GA') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40';
  if (s === 'RC') return 'bg-primary/15 text-primary border-primary/40';
  if (s === 'BETA') return 'bg-amber-500/15 text-amber-500 border-amber-500/40';
  return 'bg-muted text-muted-foreground border-border';
};

const FounderReleaseCenterPage: React.FC = () => {
  const report = React.useMemo(
    () => computeRelease({ score: DEFAULT_SCORE, gate: DEFAULT_GATE, version: 'GA-1.0.0', now: 0 }),
    [],
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border/60 bg-card/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Enterprise Release Center</h1>
            <p className="text-sm text-muted-foreground">
              General Availability readiness — 100% consultivo, somente leitura.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusColor(report.status)}>
              Release · {report.status}
            </Badge>
            <Badge variant="outline" className={gradeColor(report.score.grade)}>
              Grade · {report.score.grade}
            </Badge>
            <Badge variant="outline" className="border-border">
              Maturity · {report.maturity.level}
            </Badge>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Overall GA Score', value: report.score.overall },
          { label: 'Production Readiness', value: report.readiness.productionReadiness },
          { label: 'GA Readiness', value: report.readiness.gaReadiness },
          { label: 'Enterprise Readiness', value: report.readiness.enterpriseReadiness },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-3xl font-black">{k.value}<span className="text-base text-muted-foreground">/100</span></div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-5">
          <h2 className="mb-3 text-base font-bold">Enterprise Readiness Dimensions</h2>
          <ul className="grid gap-1 text-sm">
            {Object.entries(report.score.dimensions).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-mono tabular-nums">{v}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-3 text-base font-bold">Quality Gate ({report.gate.passedCount}/{report.gate.totalCount})</h2>
            <ul className="grid gap-1 text-sm">
              {report.gate.checks.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className={c.passed ? 'text-emerald-500' : 'text-destructive'}>
                    {c.passed ? '✓' : '✗'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/40 p-5">
            <h2 className="mb-3 text-base font-bold">Release Checklist</h2>
            <ul className="grid gap-1 text-sm">
              {report.checklist.items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    <span className="mr-2 rounded border border-border px-1 text-[10px] uppercase">{c.severity}</span>
                    {c.label}
                  </span>
                  <span className={c.passed ? 'text-emerald-500' : 'text-destructive'}>
                    {c.passed ? '✓' : '✗'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-3 text-base font-bold">Certifications</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {report.certifications.certifications.map((c) => (
            <div key={c.id} className="rounded-lg border border-border/60 bg-background/50 p-3">
              <div className="text-sm font-semibold">{c.name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-mono text-sm">{c.score}</span>
                <Badge
                  variant="outline"
                  className={
                    c.status === 'CERTIFIED'
                      ? 'border-emerald-500/40 text-emerald-500'
                      : c.status === 'CONDITIONAL'
                        ? 'border-amber-500/40 text-amber-500'
                        : 'border-destructive/40 text-destructive'
                  }
                >
                  {c.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-3 text-base font-bold">Release Notes · {report.notes.version}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{report.notes.summary}</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(report.notes.timelines)
            .filter(([, items]) => items.length > 0)
            .map(([name, items]) => (
              <div key={name} className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{name} timeline</div>
                <ul className="grid gap-1 text-sm">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Sprint {s.id}</span>
                      <span className="text-right">{s.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <h2 className="mb-2 text-base font-bold">Executive Summary</h2>
        <p className="text-sm">{report.summary.headline}</p>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
          {report.summary.highlights.map((h) => <li key={h}>• {h}</li>)}
        </ul>
        <div className="mt-3">
          <Badge
            variant="outline"
            className={
              report.summary.verdict === 'GO'
                ? 'border-emerald-500/40 text-emerald-500'
                : report.summary.verdict === 'CONDITIONAL_GO'
                  ? 'border-amber-500/40 text-amber-500'
                  : 'border-destructive/40 text-destructive'
            }
          >
            Parecer Executivo · {report.summary.verdict}
          </Badge>
        </div>
      </section>
    </div>
  );
};

export default FounderReleaseCenterPage;
