/**
 * Sprint 2.4 · Optional RPC wrapper with passive metrics.
 * Fire-and-forget: never blocks, never throws, never modifies RPC result.
 *
 * USAGE (opt-in only — no existing call sites are changed):
 *   const { data, error } = await rpcWithMetrics('pos_complete_sale', { ... });
 */
import { supabase } from '@/integrations/supabase/client';
import { recordTelemetry } from './buffer';

function safeSize(v: unknown): number | undefined {
  try {
    if (v == null) return 0;
    return JSON.stringify(v).length;
  } catch {
    return undefined;
  }
}

export async function rpcWithMetrics<T = unknown>(
  name: string,
  params?: Record<string, unknown>,
  opts?: { timeoutMs?: number }
): Promise<{ data: T | null; error: unknown }> {
  const t0 =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  const payload_size = safeSize(params);
  let timedOut = false;

  const rpcPromise = (supabase.rpc as any)(name, params) as Promise<{
    data: T | null;
    error: unknown;
  }>;

  const withTimeout = opts?.timeoutMs
    ? Promise.race([
        rpcPromise,
        new Promise<{ data: null; error: { message: string } }>(resolve =>
          setTimeout(() => {
            timedOut = true;
            resolve({ data: null, error: { message: 'RPC_TIMEOUT' } });
          }, opts.timeoutMs)
        ),
      ])
    : rpcPromise;

  let result: { data: T | null; error: unknown } = { data: null, error: null };
  try {
    result = await withTimeout;
  } catch (e) {
    result = { data: null, error: e };
  }

  const t1 =
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  // Fire-and-forget instrumentation — cannot affect caller
  try {
    recordTelemetry({
      kind: 'rpc',
      name,
      duration_ms: Math.max(0, t1 - t0),
      success: !result.error,
      error_code: result.error
        ? String((result.error as any)?.message ?? 'ERROR').slice(0, 120)
        : null,
      timeout: timedOut,
      payload_size,
      response_size: safeSize(result.data),
    });
  } catch {
    /* swallow */
  }

  return result;
}
