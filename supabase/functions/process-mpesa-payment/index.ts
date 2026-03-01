import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Vodacom M-Pesa Mozambique OpenAPI endpoints
const MPESA_BASE_URL = Deno.env.get("MPESA_BASE_URL") || "https://api.vm.co.mz";
const MPESA_API_KEY = Deno.env.get("MPESA_API_KEY") || "";
const MPESA_PUBLIC_KEY = Deno.env.get("MPESA_PUBLIC_KEY") || "";
const MPESA_SERVICE_PROVIDER_CODE = Deno.env.get("MPESA_SERVICE_PROVIDER_CODE") || "";

// Generate Bearer token from public key + API key (M-Pesa OpenAPI pattern)
async function getMpesaBearerToken(): Promise<string> {
  if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
    throw new Error("M-Pesa API credentials not configured");
  }

  // Import the RSA public key and encrypt the API key
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${MPESA_PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  
  const pemContents = MPESA_PUBLIC_KEY.replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const publicKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-1" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    new TextEncoder().encode(MPESA_API_KEY)
  );

  // Base64 encode the encrypted API key
  const token = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    const { subscription_id, phone_number, amount } = await req.json();

    if (!subscription_id || !phone_number) {
      return new Response(
        JSON.stringify({ error: "subscription_id e phone_number são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (Mozambique: 84/85 for Vodacom)
    const cleanPhone = phone_number.replace(/\D/g, "");
    if (!/^(258)?(84|85)\d{7}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Número M-Pesa inválido. Use formato: 84/85XXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = cleanPhone.startsWith("258") ? cleanPhone : `258${cleanPhone}`;

    // Fetch subscription to get amount
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .single();

    if (subError || !sub) {
      return new Response(
        JSON.stringify({ error: "Assinatura não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentAmount = amount || sub.price_monthly;
    const transactionRef = `NAV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create pending payment transaction
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tx, error: txError } = await serviceClient
      .from("payment_transactions")
      .insert({
        subscription_id,
        company_id: sub.company_id,
        amount: paymentAmount,
        payment_method: "mpesa",
        phone_number: formattedPhone,
        reference_id: transactionRef,
        status: "pending",
      })
      .select()
      .single();

    if (txError) {
      console.error("Error creating transaction:", txError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar transação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call M-Pesa C2B API
    if (!MPESA_API_KEY || !MPESA_PUBLIC_KEY) {
      // Credentials not configured - return simulated response for testing
      console.warn("M-Pesa credentials not configured. Returning test response.");
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: tx.id,
          reference: transactionRef,
          status: "pending",
          message: "Pagamento M-Pesa iniciado (modo teste - credenciais não configuradas). Configure MPESA_API_KEY, MPESA_PUBLIC_KEY e MPESA_SERVICE_PROVIDER_CODE.",
          test_mode: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real M-Pesa API call
    const bearerToken = await getMpesaBearerToken();

    const mpesaPayload = {
      input_TransactionReference: transactionRef,
      input_CustomerMSISDN: formattedPhone,
      input_Amount: paymentAmount.toString(),
      input_ThirdPartyReference: `NAVPOS-${tx.id.substring(0, 8)}`,
      input_ServiceProviderCode: MPESA_SERVICE_PROVIDER_CODE,
    };

    console.log("Calling M-Pesa C2B API:", JSON.stringify({ ...mpesaPayload, phone: "***" }));

    const mpesaResponse = await fetch(
      `${MPESA_BASE_URL}:18352/ipg/v1x/c2bPayment/singleStage/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
          Origin: "*",
        },
        body: JSON.stringify(mpesaPayload),
      }
    );

    const mpesaResult = await mpesaResponse.json();
    console.log("M-Pesa response:", JSON.stringify(mpesaResult));

    // M-Pesa success codes: INS-0 = success
    if (mpesaResult.output_ResponseCode === "INS-0") {
      // Update transaction as completed
      await serviceClient
        .from("payment_transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          reference_id: mpesaResult.output_TransactionID || transactionRef,
        })
        .eq("id", tx.id);

      // Renew subscription
      await serviceClient.rpc("process_subscription_payment", {
        p_subscription_id: subscription_id,
        p_payment_method: "mpesa",
        p_reference_id: mpesaResult.output_TransactionID || transactionRef,
        p_phone_number: formattedPhone,
      });

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: tx.id,
          reference: mpesaResult.output_TransactionID || transactionRef,
          status: "completed",
          message: "Pagamento M-Pesa processado com sucesso!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Payment failed
      await serviceClient
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("id", tx.id);

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: tx.id,
          error: mpesaResult.output_ResponseDesc || "Pagamento M-Pesa falhou",
          code: mpesaResult.output_ResponseCode,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("M-Pesa payment error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno no processamento M-Pesa", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
