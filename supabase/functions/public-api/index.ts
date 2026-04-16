import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/* ── Standardised response ── */
function ok(data: unknown, meta?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
function fail(error: string, status = 400, details?: unknown) {
  return new Response(
    JSON.stringify({ success: false, error, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

/* ── Auth helpers ── */
async function validateApiKey(supabase: any, apiKey: string) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("id, company_id, permissions, is_active, rate_limit")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !keyRecord) return null;

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id);

  return keyRecord;
}

async function logRequest(
  supabase: any,
  companyId: string,
  apiKeyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  ip: string,
  startTime: number,
) {
  await supabase.from("api_request_logs").insert({
    company_id: companyId,
    api_key_id: apiKeyId,
    endpoint,
    method,
    status_code: statusCode,
    ip_address: ip,
    response_time_ms: Date.now() - startTime,
  });
}

/* ── Parse route: /public-api/v1/{resource} or /public-api/{resource} ── */
function parseRoute(url: URL): { version: string; resource: string } {
  const parts = url.pathname.split("/").filter(Boolean);
  // parts might be ["public-api", "v1", "products"] or ["public-api", "products"]
  const fnIdx = parts.indexOf("public-api");
  const after = parts.slice(fnIdx + 1);

  if (after[0]?.startsWith("v")) {
    return { version: after[0], resource: after[1] || "" };
  }
  return { version: "v1", resource: after[0] || "" };
}

/* ── Pagination helper ── */
function parsePagination(url: URL) {
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50"), 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
  return { limit, offset };
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const { version, resource } = parseRoute(url);

  if (version !== "v1") {
    return fail("Unsupported API version. Use /v1/", 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Auth
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return fail("Missing X-API-Key header", 401);

  const keyRecord = await validateApiKey(supabase, apiKey);
  if (!keyRecord) return fail("Invalid or inactive API key", 403);

  const companyId = keyRecord.company_id;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  let statusCode = 200;

  try {
    // Rate limit (per-minute window)
    const { count } = await supabase
      .from("api_request_logs")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyRecord.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

    if ((count || 0) >= keyRecord.rate_limit) {
      statusCode = 429;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return fail("Rate limit exceeded", 429, {
        limit: keyRecord.rate_limit,
        window: "60s",
        retry_after_ms: 60000,
      });
    }

    /* ── ROUTES ── */
    if (resource === "products" && req.method === "GET") {
      const { limit, offset } = parsePagination(url);
      const search = url.searchParams.get("search");
      const category = url.searchParams.get("category_id");
      const active = url.searchParams.get("is_active");

      let query = supabase
        .from("products")
        .select("id, name, price, cost_price, stock, sku, barcode, category_id, is_active, created_at", { count: "exact" })
        .eq("company_id", companyId);

      if (search) query = query.ilike("name", `%${search}%`);
      if (category) query = query.eq("category_id", category);
      if (active !== null && active !== undefined) query = query.eq("is_active", active === "true");

      const { data, error, count: total } = await query
        .range(offset, offset + limit - 1)
        .order("name");

      if (error) throw error;

      statusCode = 200;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return ok(data, { pagination: { limit, offset, total: total || 0 } });

    } else if (resource === "sales" && req.method === "GET") {
      const { limit, offset } = parsePagination(url);
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const status = url.searchParams.get("status");

      let query = supabase
        .from("sales")
        .select("id, total, payment_method, status, customer_name, created_at, seller_id", { count: "exact" })
        .eq("company_id", companyId);

      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);
      if (status) query = query.eq("status", status);

      const { data, error, count: total } = await query
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;

      statusCode = 200;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return ok(data, { pagination: { limit, offset, total: total || 0 } });

    } else if (resource === "finance" && req.method === "GET") {
      const from = url.searchParams.get("from") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const to = url.searchParams.get("to") || new Date().toISOString();

      const [salesRes, expensesRes, apRes, arRes] = await Promise.all([
        supabase.from("sales").select("total").eq("company_id", companyId).gte("created_at", from).lte("created_at", to).eq("status", "completed"),
        supabase.from("financial_transactions").select("amount").eq("company_id", companyId).eq("type", "expense").gte("created_at", from).lte("created_at", to),
        supabase.from("accounts_payable").select("amount").eq("company_id", companyId).eq("status", "pending"),
        supabase.from("accounts_receivable").select("amount").eq("company_id", companyId).eq("status", "pending"),
      ]);

      const revenue = (salesRes.data || []).reduce((a: number, s: any) => a + (s.total || 0), 0);
      const expenses = (expensesRes.data || []).reduce((a: number, e: any) => a + (e.amount || 0), 0);
      const payables = (apRes.data || []).reduce((a: number, p: any) => a + (p.amount || 0), 0);
      const receivables = (arRes.data || []).reduce((a: number, r: any) => a + (r.amount || 0), 0);

      statusCode = 200;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return ok({
        period: { from, to },
        revenue,
        expenses,
        profit: revenue - expenses,
        accounts_payable: payables,
        accounts_receivable: receivables,
      });

    } else if (resource === "currencies" && req.method === "GET") {
      const { data, error } = await supabase.from("currencies").select("*").eq("is_active", true).order("code");
      if (error) throw error;

      statusCode = 200;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return ok(data);

    } else {
      statusCode = 404;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return fail("Unknown endpoint", 404, {
        available_endpoints: [
          "GET /v1/products?search=&category_id=&is_active=&limit=&offset=",
          "GET /v1/sales?from=&to=&status=&limit=&offset=",
          "GET /v1/finance?from=&to=",
          "GET /v1/currencies",
        ],
      });
    }
  } catch (err) {
    statusCode = 500;
    await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
    return fail("Internal server error", 500);
  }
});
