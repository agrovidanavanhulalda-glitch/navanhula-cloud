import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // AUTH: this function is cron-driven; require CRON_SECRET (or service-role) bearer
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isService = authHeader === `Bearer ${serviceKey}`;
    if (!isCron && !isService) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);


    // Fetch all documents with expiration dates
    const { data: docs, error: docsError } = await supabase
      .from("obligation_documents")
      .select("id, company_id, file_name, expiration_date, alert_level, last_alert_sent_at, obligation_id")
      .not("expiration_date", "is", null);

    if (docsError) throw docsError;
    if (!docs || docs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let alertsCreated = 0;

    for (const doc of docs) {
      const expDate = new Date(doc.expiration_date);
      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      let newLevel = "none";
      if (diffDays <= 0) newLevel = "expired";
      else if (diffDays <= 7) newLevel = "urgent";
      else if (diffDays <= 30) newLevel = "warning";

      // Skip if no alert needed
      if (newLevel === "none") {
        if (doc.alert_level !== "none") {
          await supabase
            .from("obligation_documents")
            .update({ alert_level: "none" })
            .eq("id", doc.id);
        }
        continue;
      }

      // Skip if same alert was sent within 24h
      if (
        doc.last_alert_sent_at &&
        doc.alert_level === newLevel
      ) {
        const lastSent = new Date(doc.last_alert_sent_at);
        const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) continue;
      }

      // Update document alert status
      await supabase
        .from("obligation_documents")
        .update({
          alert_level: newLevel,
          last_alert_sent_at: now.toISOString(),
        })
        .eq("id", doc.id);

      // Get company admins to notify
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_id", doc.company_id);

      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", doc.company_id)
        .single();

      const statusText =
        newLevel === "expired"
          ? "EXPIRADO"
          : newLevel === "urgent"
          ? "expira em " + diffDays + " dias"
          : "expira em " + diffDays + " dias";

      const icon =
        newLevel === "expired" ? "🔴" : newLevel === "urgent" ? "🟡" : "⚠️";

      const title = `${icon} Documento ${newLevel === "expired" ? "expirado" : "a expirar"}`;
      const message = `O documento "${doc.file_name}" da empresa ${company?.name || ""} está ${statusText}. Data de expiração: ${doc.expiration_date}.`;

      // Create notifications for each admin
      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            type: newLevel === "expired" ? "error" : "warning",
            title,
            message,
            category: "compliance",
            link: "/compliance",
          });
          alertsCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: docs.length, alerts_created: alertsCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
