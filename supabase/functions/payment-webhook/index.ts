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

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return expectedSig === signature;
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

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const clientIp = req.headers.get("x-forwarded-for") || "unknown";

  try {
    const rawBody = await req.text();
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
      await logPayment(serviceClient, {
        provider: "webhook", action: "webhook_received",
        request_payload: { headers: { ip: clientIp, ua: req.headers.get("user-agent") } },
        status: "error", error_message: "Missing x-signature header",
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      await logPayment(serviceClient, {
        provider: "webhook", action: "webhook_received",
        request_payload: { headers: { ip: clientIp, ua: req.headers.get("user-agent") } },
        status: "error", error_message: "Invalid signature",
        ip_address: clientIp,
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

    const { data: tx, error: txError } = await serviceClient
      .from("payment_transactions")
      .select("*, subscriptions(*)")
      .eq("reference_id", reference_id)
      .eq("status", "pending")
      .single();

    if (txError || !tx) {
      await logPayment(serviceClient, {
        provider, action: "webhook_received",
        request_payload: body,
        status: "error", error_message: `Transaction not found: ${reference_id}`,
        ip_address: clientIp,
      });
      return new Response(
        JSON.stringify({ error: "Transaction not found", reference_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSuccess = status === "success" || status === "completed" || status === "0" || status === "INS-0";

    await logPayment(serviceClient, {
      transaction_id: tx.id, company_id: tx.company_id,
      provider, action: "webhook_received",
      request_payload: body,
      status: isSuccess ? "success" : "error",
      error_message: isSuccess ? null : `Payment status: ${status}`,
      ip_address: clientIp,
    });

    if (isSuccess) {
      await serviceClient
        .from("payment_transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          provider_transaction_id: transaction_id || null,
          provider_response: body,
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
        .update({ status: "failed", provider_response: body })
        .eq("id", tx.id);

      return new Response(
        JSON.stringify({ success: false, message: "Payment marked as failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal webhook error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
