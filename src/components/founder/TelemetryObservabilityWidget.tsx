/**
 * Sprint 2.5 · Passive Telemetry Observability Widget (read-only).
 * Consumes the in-memory telemetry buffer via a sink hook.
 * Does not alter RPC contracts, UX, or business logic.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import {
  aggregate,
  setTelemetrySink,
  type Aggregate,
  type TelemetryEvent,
} from '@/lib/telemetry/buffer';

const WINDOW_MS = 5 * 60_000; // rolling 5 min

export const TelemetryObservabilityWidget: React.FC = () => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [lastFlush, setLastFlush] = useState<number | null>(null);

  useEffect(() => {
    setTelemetrySink((batch) => {
      setLastFlush(Date.now());
      setEvents((prev) => {
        const cutoff = Date.now() - WINDOW_MS;
        return [...prev, ...batch].filter((e) => e.ts >= cutoff);
      });
    });
    // Cleanup: reset sink to no-op
    return () => setTelemetrySink(() => {});
  }, []);

  const agg = aggregate(events);
  const rows = Object.entries(agg).sort((a, b) => b[1].count - a[1].count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Telemetria (janela 5 min · passiva)
          {lastFlush && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              Último flush: {new Date(lastFlush).toLocaleTimeString('pt-PT')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sem eventos ainda. A telemetria é opt-in; navegue pelo Founder para gerar amostras.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-1.5">Chamada</th>
                  <th className="text-right py-1.5">N</th>
                  <th className="text-right py-1.5">p50</th>
                  <th className="text-right py-1.5">p95</th>
                  <th className="text-right py-1.5">p99</th>
                  <th className="text-right py-1.5">Máx</th>
                  <th className="text-right py-1.5">Erros</th>
                  <th className="text-right py-1.5">Timeouts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([key, a]: [string, Aggregate]) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-1.5 font-mono truncate max-w-[240px]" title={key}>{key}</td>
                    <td className="text-right">{a.count}</td>
                    <td className="text-right">{a.p50.toFixed(0)} ms</td>
                    <td className="text-right">{a.p95.toFixed(0)} ms</td>
                    <td className="text-right">{a.p99.toFixed(0)} ms</td>
                    <td className="text-right">{a.max.toFixed(0)} ms</td>
                    <td className="text-right">
                      {a.errors > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">{a.errors}</Badge>
                      ) : 0}
                    </td>
                    <td className="text-right">
                      {a.timeouts > 0 ? (
                        <Badge variant="outline" className="text-[10px]">{a.timeouts}</Badge>
                      ) : 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelemetryObservabilityWidget;
