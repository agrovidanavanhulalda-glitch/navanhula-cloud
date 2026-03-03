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
  if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
    throw new Error("M-Pesa API credentials not configured");
  }
  const pemContents = MPESA_PUBLIC_KEY.replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const publicKey = await crypto.subtle.importKey("spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-1" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, new TextEncoder().encode(MPESA_API_KEY));
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
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
    const { data: tx, error: txError } = await serviceClient.from("payment_transactions").insert({ subscription_id, company_id: sub.company_id, amount: paymentAmount, payment_method: "mpesa", phone_number: formattedPhone, reference_id: transactionRef, status: "pending" }).select().single();

    if (txError) {
      return new Response(JSON.stringify({ error: "Erro ao criar transação" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
      return new Response(JSON.stringify({ success: true, transaction_id: tx.id, reference: transactionRef, status: "pending", message: "Pagamento M-Pesa iniciado (modo teste).", test_mode: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const bearerToken = await getMpesaBearerToken();
    const mpesaPayload = { input_TransactionReference: transactionRef, input_CustomerMSISDN: formattedPhone, input_Amount: paymentAmount.toString(), input_ThirdPartyReference: `NAVPOS-${tx.id.substring(0, 8)}`, input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE };

    const mpesaResponse = await fetch(`${MPESA_BASE_URL}:18352/ipg/v1x/c2bPayment/singleStage/`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearerToken}`, Origin: ALLOWED_ORIGINS[0] }, body: JSON.stringify(mpesaPayload) });
    const mpesaResult = await mpesaResponse.json();

    if (mpesaResult.output_ResponseCode === "INS-0") {
      await serviceClient.from("payment_transactions").update({ status: "completed", paid_at: new Date().toISOString(), reference_id: mpesaResult.output_TransactionID || transactionRef }).eq("id", tx.id);
      await serviceClient.rpc("process_subscription_payment", { p_subscription_id: subscription_id, p_payment_method: "mpesa", p_reference_id: mpesaResult.output_TransactionID || transactionRef, p_phone_number: formattedPhone });
      return new Response(JSON.stringify({ success: true, transaction_id: tx.id, reference: mpesaResult.output_TransactionID || transactionRef, status: "completed", message: "Pagamento M-Pesa processado com sucesso!" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await serviceClient.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
      return new Response(JSON.stringify({ success: false, transaction_id: tx.id, error: mpesaResult.output_ResponseDesc || "Pagamento M-Pesa falhou" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(JSON.stringify({ error: "Erro interno no processamento M-Pesa" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
