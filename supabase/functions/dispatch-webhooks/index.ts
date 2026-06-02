import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deliverWebhook(
  supabase: any,
  delivery: any,
  webhook: any,
): Promise<void> {
  const payload = JSON.stringify(delivery.payload);
  const signature = await signPayload(payload, webhook.secret || webhook.id);
  const attempt = (delivery.attempt_count || 0) + 1;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Webhook-Event": delivery.event_type,
        "X-Delivery-Id": delivery.id,
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const statusCode = response.status;
    await response.text(); // consume body

    if (statusCode >= 200 && statusCode < 300) {
      await supabase
        .from("webhook_deliveries")
        .update({
          status: "delivered",
          status_code: statusCode,
          attempt_count: attempt,
          signature,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);
    } else {
      await scheduleRetry(supabase, delivery.id, attempt, delivery.max_attempts || 3, statusCode, signature);
    }
  } catch (err: any) {
    await scheduleRetry(supabase, delivery.id, attempt, delivery.max_attempts || 3, 0, signature, err.message);
  }
}

async function scheduleRetry(
  supabase: any,
  deliveryId: string,
  attempt: number,
  maxAttempts: number,
  statusCode: number,
  signature: string,
  errorMsg?: string,
) {
  if (attempt >= maxAttempts) {
    await supabase
      .from("webhook_deliveries")
      .update({
        status: "failed",
        status_code: statusCode || null,
        attempt_count: attempt,
        signature,
      })
      .eq("id", deliveryId);
  } else {
    // Exponential backoff: 30s, 120s, 480s
    const delayMs = 30000 * Math.pow(4, attempt - 1);
    const nextRetry = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from("webhook_deliveries")
      .update({
        status: "failed",
        status_code: statusCode || null,
        attempt_count: attempt,
        signature,
        next_retry_at: nextRetry,
      })
      .eq("id", deliveryId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // AUTH: Require CRON_SECRET (for cron-driven retry mode) or authenticated user (for dispatch mode)
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
  let callerUserId: string | null = null;
  let callerCompanyId: string | null = null;

  if (!isCron) {
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    callerUserId = claimsData.claims.sub as string;
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", callerUserId)
      .maybeSingle();
    callerCompanyId = profile?.company_id || null;
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { event_type, company_id, payload } = body;

    // Mode 1: Dispatch a new event to all active webhooks for a company
    if (event_type && company_id && payload) {
      // Enforce: non-cron callers can only dispatch for their own company
      if (!isCron && company_id !== callerCompanyId) {
        return new Response(JSON.stringify({ error: "Forbidden: cannot dispatch for another company" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: webhooks } = await supabase
        .from("webhooks")
        .select("*")
        .eq("company_id", company_id)
        .eq("is_active", true)
        .contains("events", [event_type]);


      if (!webhooks || webhooks.length === 0) {
        return new Response(
          JSON.stringify({ success: true, delivered: 0, message: "No matching webhooks" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const deliveries = [];
      for (const wh of webhooks) {
        const { data: del } = await supabase
          .from("webhook_deliveries")
          .insert({
            webhook_id: wh.id,
            company_id,
            event_type,
            payload,
            status: "pending",
            attempt_count: 0,
            max_attempts: 3,
          })
          .select()
          .single();

        if (del) {
          deliveries.push(deliverWebhook(supabase, del, wh));
        }
      }

      await Promise.allSettled(deliveries);

      return new Response(
        JSON.stringify({ success: true, delivered: deliveries.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mode 2: Retry failed deliveries (called by cron)
    const { data: retryable } = await supabase
      .from("webhook_deliveries")
      .select("*, webhooks(*)")
      .eq("status", "failed")
      .lt("attempt_count", 3)
      .lte("next_retry_at", new Date().toISOString())
      .limit(20);

    if (retryable && retryable.length > 0) {
      const retries = retryable.map((d: any) =>
        deliverWebhook(supabase, d, d.webhooks),
      );
      await Promise.allSettled(retries);
    }

    return new Response(
      JSON.stringify({ success: true, retried: retryable?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
