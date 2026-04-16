import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function validateApiKey(supabase: any, apiKey: string) {
  // Hash the key with SHA-256 and compare
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("id, company_id, permissions, is_active, rate_limit")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !keyRecord) return null;

  // Update last_used_at
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRecord.id);

  return keyRecord;
}

async function logRequest(supabase: any, companyId: string, apiKeyId: string, endpoint: string, method: string, statusCode: number, ip: string, startTime: number) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Expected: /public-api/{resource}
  const resource = pathParts[pathParts.length - 1] || "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Auth via X-API-Key header
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return jsonResponse({ error: "Missing X-API-Key header" }, 401);
  }

  const keyRecord = await validateApiKey(supabase, apiKey);
  if (!keyRecord) {
    return jsonResponse({ error: "Invalid or inactive API key" }, 403);
  }

  const companyId = keyRecord.company_id;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
  let statusCode = 200;

  try {
    // Rate limit check (simple: count requests in last minute)
    const { count } = await supabase
      .from("api_request_logs")
      .select("*", { count: "exact", head: true })
      .eq("api_key_id", keyRecord.id)
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

    if ((count || 0) >= keyRecord.rate_limit) {
      statusCode = 429;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return jsonResponse({ error: "Rate limit exceeded", limit: keyRecord.rate_limit, window: "60s" }, 429);
    }

    let result: any;

    if (resource === "products" && req.method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, cost_price, stock, sku, barcode, category_id, is_active, created_at")
        .eq("company_id", companyId)
        .range(offset, offset + limit - 1)
        .order("name");
      if (error) throw error;
      result = { data, pagination: { limit, offset } };

    } else if (resource === "sales" && req.method === "GET") {
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      let query = supabase
        .from("sales")
        .select("id, total, payment_method, status, customer_name, created_at, seller_id")
        .eq("company_id", companyId);
      if (from) query = query.gte("created_at", from);
      if (to) query = query.lte("created_at", to);
      const { data, error } = await query.range(offset, offset + limit - 1).order("created_at", { ascending: false });
      if (error) throw error;
      result = { data, pagination: { limit, offset } };

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

      result = {
        period: { from, to },
        revenue,
        expenses,
        profit: revenue - expenses,
        accounts_payable: payables,
        accounts_receivable: receivables,
      };

    } else if (resource === "currencies" && req.method === "GET") {
      const { data, error } = await supabase.from("currencies").select("*").eq("is_active", true).order("code");
      if (error) throw error;
      result = { data };

    } else {
      statusCode = 404;
      await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
      return jsonResponse({
        error: "Unknown endpoint",
        available: ["GET /products", "GET /sales", "GET /finance", "GET /currencies"],
      }, 404);
    }

    await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
    return jsonResponse(result);

  } catch (err) {
    statusCode = 500;
    await logRequest(supabase, companyId, keyRecord.id, resource, req.method, statusCode, ip, startTime);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
