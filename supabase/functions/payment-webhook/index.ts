import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// This endpoint receives payment callbacks from M-Pesa and E-mola
// No JWT required - validated by reference matching
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { provider, reference_id, transaction_id, status, amount } = body;

    console.log(`Payment webhook received: provider=${provider}, ref=${reference_id}, status=${status}`);

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

    // Find the pending transaction by reference
    const { data: tx, error: txError } = await serviceClient
      .from("payment_transactions")
      .select("*, subscriptions(*)")
      .eq("reference_id", reference_id)
      .eq("status", "pending")
      .single();

    if (txError || !tx) {
      console.warn("Transaction not found for reference:", reference_id);
      return new Response(
        JSON.stringify({ error: "Transaction not found", reference_id }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSuccess = status === "success" || status === "completed" || status === "0" || status === "INS-0";

    if (isSuccess) {
      // Mark transaction as completed
      await serviceClient
        .from("payment_transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          reference_id: transaction_id || reference_id,
        })
        .eq("id", tx.id);

      // Renew subscription
      const paymentMethod = provider === "mpesa" ? "mpesa" : "emola";
      await serviceClient.rpc("process_subscription_payment", {
        p_subscription_id: tx.subscription_id,
        p_payment_method: paymentMethod,
        p_reference_id: transaction_id || reference_id,
        p_phone_number: tx.phone_number,
      });

      console.log(`Payment confirmed for subscription ${tx.subscription_id}`);

      return new Response(
        JSON.stringify({ success: true, message: "Payment confirmed and subscription renewed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Mark as failed
      await serviceClient
        .from("payment_transactions")
        .update({ status: "failed" })
        .eq("id", tx.id);

      console.log(`Payment failed for transaction ${tx.id}`);

      return new Response(
        JSON.stringify({ success: false, message: "Payment marked as failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(
      JSON.stringify({ error: "Internal webhook error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
