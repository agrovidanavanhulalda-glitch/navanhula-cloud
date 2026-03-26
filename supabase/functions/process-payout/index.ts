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
  ip_address?: string;
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
      ip_address: data.ip_address || null,
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
    // Auth check
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
    const userId = claimsData.claims.sub as string;

    const { payout_id, provider } = await req.json();
    if (!payout_id) {
      return new Response(JSON.stringify({ error: "payout_id é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Get payout details
    const { data: payout, error: payoutError } = await serviceClient
      .from("payouts")
      .select("*")
      .eq("id", payout_id)
      .eq("status", "pending")
      .single();

    if (payoutError || !payout) {
      return new Response(JSON.stringify({ error: "Levantamento não encontrado ou já processado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify user belongs to same company
    const { data: profile } = await serviceClient.from("profiles").select("company_id").eq("id", userId).single();
    if (!profile || profile.company_id !== payout.company_id) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payoutProvider = provider || payout.payment_method || "mpesa";
    const payoutRef = `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Test mode - no real API keys
    if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
      await logPayment(serviceClient, {
        company_id: payout.company_id,
        provider: payoutProvider, action: "payout",
        request_payload: { payout_id, amount: payout.net_amount, phone: payout.phone_number, reference: payoutRef },
        status: "success",
        response_payload: { test_mode: true, message: "Payout simulated" },
        ip_address: clientIp,
      });

      await serviceClient.from("payouts").update({
        status: "completed",
        processed_at: new Date().toISOString(),
        processed_by: userId,
      }).eq("id", payout_id);

      return new Response(JSON.stringify({
        success: true,
        payout_id,
        status: "completed",
        message: "Levantamento processado (modo teste)",
        test_mode: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Real payout via M-Pesa B2C
    if (payoutProvider === "mpesa") {
      const bearerToken = await getMpesaBearerToken();
      const b2cPayload = {
        input_TransactionReference: payoutRef,
        input_CustomerMSISDN: payout.phone_number,
        input_Amount: payout.net_amount.toString(),
        input_ThirdPartyReference: `NAVPAY-${payout_id.substring(0, 8)}`,
        input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
      };

      await logPayment(serviceClient, {
        company_id: payout.company_id,
        provider: "mpesa", action: "payout",
        request_payload: b2cPayload,
        status: "sent", ip_address: clientIp,
      });

      const mpesaResponse = await fetch(`${MPESA_BASE_URL}:18352/ipg/v1x/b2cPayment/singleStage/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}`, Origin: ALLOWED_ORIGINS[0] },
        body: JSON.stringify(b2cPayload),
      });
      const mpesaResult = await mpesaResponse.json();

      await logPayment(serviceClient, {
        company_id: payout.company_id,
        provider: "mpesa", action: "payout",
        response_payload: mpesaResult, http_status: mpesaResponse.status,
        status: mpesaResult.output_ResponseCode === "INS-0" ? "success" : "error",
        error_message: mpesaResult.output_ResponseCode !== "INS-0" ? mpesaResult.output_ResponseDesc : null,
        ip_address: clientIp,
      });

      if (mpesaResult.output_ResponseCode === "INS-0") {
        await serviceClient.from("payouts").update({
          status: "completed",
          processed_at: new Date().toISOString(),
          processed_by: userId,
          notes: `Provider TX: ${mpesaResult.output_TransactionID || payoutRef}`,
        }).eq("id", payout_id);

        return new Response(JSON.stringify({
          success: true, payout_id, status: "completed",
          reference: mpesaResult.output_TransactionID || payoutRef,
          message: "Levantamento M-Pesa processado com sucesso!",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else {
        // Revert: mark payout as failed but don't restore wallet (manual review)
        await serviceClient.from("payouts").update({
          status: "failed",
          notes: mpesaResult.output_ResponseDesc || "M-Pesa B2C failed",
        }).eq("id", payout_id);

        return new Response(JSON.stringify({
          success: false, payout_id,
          error: mpesaResult.output_ResponseDesc || "Levantamento M-Pesa falhou",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Unsupported provider for payout
    return new Response(JSON.stringify({ error: `Provider "${payoutProvider}" não suportado para levantamentos` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Payout error:", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Erro interno no processamento do levantamento" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
