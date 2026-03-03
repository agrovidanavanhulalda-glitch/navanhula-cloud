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
      "authorization, x-client-info, apikey, content-type, x-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// Verify webhook signature using HMAC-SHA256
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedSig === signature;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const signature = req.headers.get("x-signature");
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!signature) {
      console.warn("Webhook rejected: missing x-signature header", {
        ip: req.headers.get("x-forwarded-for"),
        ua: req.headers.get("user-agent"),
      });
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.warn("Webhook rejected: invalid signature", {
        ip: req.headers.get("x-forwarded-for"),
        ua: req.headers.get("user-agent"),
      });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = JSON.parse(rawBody);
    const { provider, reference_id, transaction_id, status, amount } = body;

    if (!reference_id || !provider) {
      return new Response(
        JSON.stringify({ error: "reference_id and provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tx, error: txError } = await serviceClient
      .from("payment_transactions")
      .select("*, subscriptions(*)")
      .eq("reference_id", reference_id)
      .eq("status", "pending")
      .single();

    if (txError || !tx) {
      return new Response(
        JSON.stringify({ error: "Transaction not found", reference_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSuccess = status === "success" || status === "completed" || status === "0" || status === "INS-0";

    if (isSuccess) {
      await serviceClient
        .from("payment_transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          reference_id: transaction_id || reference_id,
        })
        .eq("id", tx.id);

      const paymentMethod = provider === "mpesa" ? "mpesa" : "emola";
      await serviceClient.rpc("process_subscription_payment", {
        p_subscription_id: tx.subscription_id,
        p_payment_method: paymentMethod,
        p_reference_id: transaction_id || reference_id,
        p_phone_number: tx.phone_number,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Payment confirmed and subscription renewed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await serviceClient
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("id", tx.id);

      return new Response(
        JSON.stringify({ success: false, message: "Payment marked as failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "Internal webhook error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
