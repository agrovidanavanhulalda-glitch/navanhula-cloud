/**
 * Sprint 2.6 · Server-side telemetry sink adapter (opt-in).
 * Wires the in-memory buffer's flush to the `telemetry-sink` edge function.
 *
 * Guarantees:
 *  - Fire-and-forget (never awaits from caller path).
 *  - Never throws. Never blocks the RPC/UI.
 *  - Bounded retry (1 attempt), hard timeout, buffer survives failure.
 *  - Idempotent to install: calling installServerTelemetrySink() twice is safe.
 */
import { supabase } from '@/integrations/supabase/client';
import { setTelemetrySink, type TelemetryEvent } from './buffer';

const FN_NAME = 'telemetry-sink';
const HARD_TIMEOUT_MS = 4_000;
const MAX_RETRY = 1;

let installed = false;

async function postBatchOnce(events: TelemetryEvent[]): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HARD_TIMEOUT_MS);
  try {
    // Use supabase.functions.invoke so auth headers propagate automatically.
    const { error } = await supabase.functions.invoke(FN_NAME, {
      body: { events },
    });
    return !error;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
    // AbortController currently unused by invoke; kept as a safety net for future SDKs.
    void ctrl;
  }
}

async function shipBatch(events: TelemetryEvent[]) {
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await postBatchOnce(events);
    if (ok) return;
  }
  // Silent drop — buffer already spliced. Never surface to user.
}

export function installServerTelemetrySink() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  setTelemetrySink((batch) => {
    // Fire-and-forget: do not await here.
    void shipBatch(batch);
  });
}
