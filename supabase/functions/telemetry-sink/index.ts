// Sprint 2.6 · Server-side telemetry sink (passive, fire-and-forget)
// Accepts batched telemetry events from the client buffer and persists them
// into public.telemetry_events using service-role. Never blocks callers.
// Contract: POST { events: TelemetryEvent[] } → { ok: true, inserted: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BATCH = 500;
const KINDS = new Set(["rpc", "realtime", "storage", "edge_function", "sync", "worker"]);

interface IncomingEvent {
  kind?: string;
  name?: string;
  duration_ms?: number;
  success?: boolean;
  error_code?: string | null;
  retries?: number;
  timeout?: boolean;
  payload_size?: number;
  response_size?: number;
  request_id?: string;
  ts?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "content-type": "application/json" },
    });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Resolve caller identity (best-effort, never blocks insert)
    let userId: string | null = null;
    let companyId: string | null = null;
    const auth = req.headers.get("Authorization") ?? "";
    if (auth.startsWith("Bearer ")) {
      try {
        const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
        userId = u?.user?.id ?? null;
        if (userId) {
          const { data: prof } = await supabase
            .from("profiles").select("company_id").eq("id", userId).maybeSingle();
          companyId = (prof as { company_id?: string } | null)?.company_id ?? null;
        }
      } catch { /* ignore */ }
    }

    const body = await req.json().catch(() => ({}));
    const events: IncomingEvent[] = Array.isArray(body?.events) ? body.events : [];
    const clipped = events.slice(0, MAX_BATCH);

    const rows = clipped
      .filter((e) => typeof e?.name === "string" && KINDS.has(String(e?.kind)))
      .map((e) => ({
        kind: String(e.kind),
        name: String(e.name).slice(0, 200),
        duration_ms: Math.max(0, Math.min(600_000, Math.floor(Number(e.duration_ms) || 0))),
        success: e.success !== false,
        error_code: e.error_code ? String(e.error_code).slice(0, 200) : null,
        retries: Math.max(0, Math.floor(Number(e.retries) || 0)),
        timeout: !!e.timeout,
        payload_size: e.payload_size != null ? Math.max(0, Math.floor(e.payload_size)) : null,
        response_size: e.response_size != null ? Math.max(0, Math.floor(e.response_size)) : null,
        user_id: userId,
        company_id: companyId,
        request_id: e.request_id ? String(e.request_id).slice(0, 80) : null,
        event_ts: e.ts ? new Date(Number(e.ts)).toISOString() : new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { error } = await supabase.from("telemetry_events").insert(rows);
    if (error) {
      // Never propagate to caller; log server-side only.
      console.error("[telemetry-sink] insert error:", error.message);
      return new Response(JSON.stringify({ ok: true, inserted: 0, degraded: true }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    console.error("[telemetry-sink] fatal:", (e as Error)?.message);
    // Fire-and-forget contract: always return 200 so client buffer is not disrupted.
    return new Response(JSON.stringify({ ok: true, inserted: 0, degraded: true }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
