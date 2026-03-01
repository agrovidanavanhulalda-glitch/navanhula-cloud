import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// E-mola (Movitel) API configuration
const EMOLA_BASE_URL = Deno.env.get("EMOLA_BASE_URL") || "https://api.emola.co.mz";
const EMOLA_API_KEY = Deno.env.get("EMOLA_API_KEY") || "";
const EMOLA_API_SECRET = Deno.env.get("EMOLA_API_SECRET") || "";
const EMOLA_MERCHANT_ID = Deno.env.get("EMOLA_MERCHANT_ID") || "";

async function getEmolaAuthToken(): Promise<string> {
  if (!EMOLA_API_KEY || !EMOLA_API_SECRET) {
    throw new Error("E-mola API credentials not configured");
  }

  const response = await fetch(`${EMOLA_BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: EMOLA_API_KEY,
      api_secret: EMOLA_API_SECRET,
    }),
  });

  const result = await response.json();
  if (!result.access_token) {
    throw new Error("Failed to obtain E-mola auth token");
  }
  return result.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate
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

    const { subscription_id, phone_number, amount } = await req.json();

    if (!subscription_id || !phone_number) {
      return new Response(
        JSON.stringify({ error: "subscription_id e phone_number são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone (Movitel: 86/87)
    const cleanPhone = phone_number.replace(/\D/g, "");
    if (!/^(258)?(86|87)\d{7}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Número E-mola inválido. Use formato: 86/87XXXXXXX" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = cleanPhone.startsWith("258") ? cleanPhone : `258${cleanPhone}`;

    // Fetch subscription
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
    const transactionRef = `NAV-E-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create pending transaction
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
        payment_method: "emola",
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

    // Check if credentials are configured
    if (!EMOLA_API_KEY || !EMOLA_API_SECRET) {
      console.warn("E-mola credentials not configured. Returning test response.");
      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: tx.id,
          reference: transactionRef,
          status: "pending",
          message: "Pagamento E-mola iniciado (modo teste - credenciais não configuradas). Configure EMOLA_API_KEY, EMOLA_API_SECRET e EMOLA_MERCHANT_ID.",
          test_mode: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Real E-mola API call
    const authToken = await getEmolaAuthToken();

    const emolaPayload = {
      merchant_id: EMOLA_MERCHANT_ID,
      customer_msisdn: formattedPhone,
      amount: paymentAmount,
      reference: transactionRef,
      description: `NAVANHULA POS - Assinatura mensal`,
    };

    console.log("Calling E-mola API:", JSON.stringify({ ...emolaPayload, customer_msisdn: "***" }));

    const emolaResponse = await fetch(`${EMOLA_BASE_URL}/payments/c2b`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(emolaPayload),
    });

    const emolaResult = await emolaResponse.json();
    console.log("E-mola response:", JSON.stringify(emolaResult));

    if (emolaResult.status === "success" || emolaResult.code === "0") {
      // Update transaction
      await serviceClient
        .from("payment_transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          reference_id: emolaResult.transaction_id || transactionRef,
        })
        .eq("id", tx.id);

      // Renew subscription
      await serviceClient.rpc("process_subscription_payment", {
        p_subscription_id: subscription_id,
        p_payment_method: "emola",
        p_reference_id: emolaResult.transaction_id || transactionRef,
        p_phone_number: formattedPhone,
      });

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: tx.id,
          reference: emolaResult.transaction_id || transactionRef,
          status: "completed",
          message: "Pagamento E-mola processado com sucesso!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await serviceClient
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("id", tx.id);

      return new Response(
        JSON.stringify({
          success: false,
          transaction_id: tx.id,
          error: emolaResult.message || "Pagamento E-mola falhou",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("E-mola payment error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno no processamento E-mola", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
