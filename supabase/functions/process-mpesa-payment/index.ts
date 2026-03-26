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
  if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) throw new Error("M-Pesa API credentials not configured");
  const pemContents = MPESA_PUBLIC_KEY.replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const publicKey = await crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-1" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, new TextEncoder().encode(MPESA_API_KEY));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

async function logPayment(serviceClient: any, data: {
  transaction_id?: string;
  company_id: string;
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
      company_id: data.company_id,
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

    const { subscription_id, phone_number, amount } = await req.json();
    if (!subscription_id || !phone_number) {
      return new Response(JSON.stringify({ error: "subscription_id e phone_number são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cleanPhone = phone_number.replace(/\D/g, "");
    if (!/^(258)?(84|85)\d{7}$/.test(cleanPhone)) {
      return new Response(JSON.stringify({ error: "Número M-Pesa inválido. Use formato: 84/85XXXXXXX" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const formattedPhone = cleanPhone.startsWith("258") ? cleanPhone : `258${cleanPhone}`;

    const { data: sub, error: subError } = await supabase.from("subscriptions").select("*").eq("id", subscription_id).single();
    if (subError || !sub) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paymentAmount = amount || sub.price_monthly;
    const transactionRef = `NAV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: tx, error: txError } = await serviceClient.from("payment_transactions").insert({
      subscription_id, company_id: sub.company_id, amount: paymentAmount,
      payment_method: "mpesa", phone_number: formattedPhone,
      reference_id: transactionRef, status: "pending"
    }).select().single();

    if (txError) {
      return new Response(JSON.stringify({ error: "Erro ao criar transação" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Test mode
    if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
      await logPayment(serviceClient, {
        transaction_id: tx.id, company_id: sub.company_id,
        provider: "mpesa", action: "initiate",
        request_payload: { phone: formattedPhone, amount: paymentAmount, reference: transactionRef },
        status: "success", ip_address: clientIp,
        response_payload: { test_mode: true },
      });
      return new Response(JSON.stringify({ success: true, transaction_id: tx.id, reference: transactionRef, status: "pending", message: "Pagamento M-Pesa iniciado (modo teste).", test_mode: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Real M-Pesa call
    const bearerToken = await getMpesaBearerToken();
    const mpesaPayload = {
      input_TransactionReference: transactionRef,
      input_CustomerMSISDN: formattedPhone,
      input_Amount: paymentAmount.toString(),
      input_ThirdPartyReference: `NAVPOS-${tx.id.substring(0, 8)}`,
      input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
    };

    await logPayment(serviceClient, {
      transaction_id: tx.id, company_id: sub.company_id,
      provider: "mpesa", action: "initiate",
      request_payload: { ...mpesaPayload, phone: formattedPhone },
      status: "sent", ip_address: clientIp,
    });

    const mpesaResponse = await fetch(`${MPESA_BASE_URL}:18352/ipg/v1x/c2bPayment/singleStage/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}`, Origin: ALLOWED_ORIGINS[0] },
      body: JSON.stringify(mpesaPayload),
    });
    const mpesaResult = await mpesaResponse.json();

    await logPayment(serviceClient, {
      transaction_id: tx.id, company_id: sub.company_id,
      provider: "mpesa", action: "initiate",
      response_payload: mpesaResult, http_status: mpesaResponse.status,
      status: mpesaResult.output_ResponseCode === "INS-0" ? "success" : "error",
      error_message: mpesaResult.output_ResponseCode !== "INS-0" ? mpesaResult.output_ResponseDesc : null,
      ip_address: clientIp,
    });

    if (mpesaResult.output_ResponseCode === "INS-0") {
      await serviceClient.from("payment_transactions").update({
        status: "completed",
        paid_at: new Date().toISOString(),
        provider_transaction_id: mpesaResult.output_TransactionID || null,
        provider_response: mpesaResult,
        reference_id: mpesaResult.output_TransactionID || transactionRef,
      }).eq("id", tx.id);

      await serviceClient.rpc("process_subscription_payment", {
        p_subscription_id: subscription_id,
        p_payment_method: "mpesa",
        p_reference_id: mpesaResult.output_TransactionID || transactionRef,
        p_phone_number: formattedPhone,
      });

      return new Response(JSON.stringify({ success: true, transaction_id: tx.id, reference: mpesaResult.output_TransactionID || transactionRef, status: "completed", message: "Pagamento M-Pesa processado com sucesso!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await serviceClient.from("payment_transactions").update({
        status: "failed",
        provider_response: mpesaResult,
      }).eq("id", tx.id);

      return new Response(JSON.stringify({ success: false, transaction_id: tx.id, error: mpesaResult.output_ResponseDesc || "Pagamento M-Pesa falhou" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    console.error("M-Pesa error:", error);
    return new Response(JSON.stringify({ error: "Erro interno no processamento M-Pesa" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
