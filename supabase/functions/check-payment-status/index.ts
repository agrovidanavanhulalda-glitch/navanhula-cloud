import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://navanhula-pos-sync.lovable.app",
  "https://id-preview--96bf4b01-7d5a-4048-be5b-3c9cc612c7be.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const MPESA_BASE_URL = Deno.env.get("MPESA_BASE_URL") || "https://api.vm.co.mz";
const MPESA_API_KEY = Deno.env.get("MPESA_API_KEY") || "";
const MPESA_PUBLIC_KEY = Deno.env.get("MPESA_PUBLIC_KEY") || "";
const MPESA_SERVICE_PROVIDER_CODE = Deno.env.get("MPESA_SERVICE_PROVIDER_CODE") || "";

async function getMpesaBearerToken(): Promise<string> {
  const pemContents = MPESA_PUBLIC_KEY.replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const publicKey = await crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-1" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, new TextEncoder().encode(MPESA_API_KEY));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function logPayment(serviceClient: any, data: {
  transaction_id?: string;
  company_id?: string;
  provider: string;
  action: string;
  request_payload?: any;
  response_payload?: any;
  http_status?: number;
  status: string;
  error_message?: string;
}) {
  try {
    await serviceClient.from("payment_logs").insert({
      transaction_id: data.transaction_id || null,
      company_id: data.company_id || null,
      provider: data.provider,
      action: data.action,
      request_payload: data.request_payload || null,
      response_payload: data.response_payload || null,
      http_status: data.http_status || null,
      status: data.status,
      error_message: data.error_message || null,
    });
  } catch (e) {
    console.error("Failed to write payment log:", e);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Mode 1: Check a specific transaction
    const body = await req.json().catch(() => ({}));
    
    if (body.transaction_id) {
      const { data: tx } = await serviceClient
        .from("payment_transactions")
        .select("*")
        .eq("id", body.transaction_id)
        .single();

      if (!tx) {
        return new Response(JSON.stringify({ error: "Transação não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (tx.status !== "pending") {
        return new Response(JSON.stringify({ status: tx.status, message: "Transação já finalizada" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check with provider (M-Pesa query)
      if (tx.payment_method === "mpesa" && MPESA_API_KEY && MPESA_PUBLIC_KEY) {
        const bearerToken = await getMpesaBearerToken();
        const queryPayload = {
          input_QueryReference: tx.reference_id,
          input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
          input_ThirdPartyReference: `NAVCHK-${tx.id.substring(0, 8)}`,
        };

        const queryResponse = await fetch(`${MPESA_BASE_URL}:18352/ipg/v1x/queryTransactionStatus/`, {
          method: "GET",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}` },
        });
        const queryResult = await queryResponse.json();

        await logPayment(serviceClient, {
          transaction_id: tx.id, company_id: tx.company_id,
          provider: "mpesa", action: "status_check",
          request_payload: queryPayload,
          response_payload: queryResult,
          http_status: queryResponse.status,
          status: queryResult.output_ResponseCode === "INS-0" ? "success" : "error",
        });

        // Update retry counter
        await serviceClient.from("payment_transactions").update({
          retry_count: (tx.retry_count || 0) + 1,
          last_checked_at: new Date().toISOString(),
          provider_response: queryResult,
        }).eq("id", tx.id);

        if (queryResult.output_ResponseCode === "INS-0") {
          await serviceClient.from("payment_transactions").update({
            status: "completed",
            paid_at: new Date().toISOString(),
            provider_transaction_id: queryResult.output_TransactionID,
          }).eq("id", tx.id);

          await serviceClient.rpc("process_subscription_payment", {
            p_subscription_id: tx.subscription_id,
            p_payment_method: "mpesa",
            p_reference_id: queryResult.output_TransactionID || tx.reference_id,
            p_phone_number: tx.phone_number,
          });

          return new Response(JSON.stringify({ status: "completed", message: "Pagamento confirmado via verificação" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      // Update retry count
      await serviceClient.from("payment_transactions").update({
        retry_count: (tx.retry_count || 0) + 1,
        last_checked_at: new Date().toISOString(),
      }).eq("id", tx.id);

      // Auto-fail after 10 retries
      if ((tx.retry_count || 0) >= 10) {
        await serviceClient.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
        return new Response(JSON.stringify({ status: "failed", message: "Transação expirada após múltiplas verificações" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ status: "pending", retry_count: (tx.retry_count || 0) + 1, message: "Ainda aguardando confirmação" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mode 2: Batch check all stale pending transactions (called by cron)
    const { data: staleTxs } = await serviceClient
      .from("payment_transactions")
      .select("id, reference_id, payment_method, retry_count, company_id")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // older than 5 min
      .lt("retry_count", 10)
      .limit(20);

    const results = [];
    for (const tx of staleTxs || []) {
      await serviceClient.from("payment_transactions").update({
        retry_count: (tx.retry_count || 0) + 1,
        last_checked_at: new Date().toISOString(),
      }).eq("id", tx.id);

      // Auto-fail if too many retries
      if ((tx.retry_count || 0) >= 9) {
        await serviceClient.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
        results.push({ id: tx.id, action: "auto_failed" });
      } else {
        results.push({ id: tx.id, action: "retry_incremented", retry_count: (tx.retry_count || 0) + 1 });
      }
    }

    return new Response(JSON.stringify({ checked: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Check payment status error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
