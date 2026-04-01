import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "Empresa não encontrada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = profile.company_id;

    // Get active batches
    const { data: batches } = await supabase
      .from("poultry_batches")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active");

    if (!batches || batches.length === 0) {
      return new Response(JSON.stringify({ insights: [], message: "Nenhum lote ativo encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run rule-based evaluation for each batch
    let totalInsights = 0;
    for (const batch of batches) {
      const { data } = await supabase.rpc("evaluate_poultry_insights", { p_batch_id: batch.id });
      totalInsights += (data || 0);
    }

    // Collect data for AI analysis
    const { data: dailyRecords } = await supabase
      .from("poultry_daily_records")
      .select("*")
      .eq("company_id", companyId)
      .order("record_date", { ascending: false })
      .limit(50);

    const { data: inputs } = await supabase
      .from("poultry_inputs")
      .select("*")
      .eq("company_id", companyId)
      .limit(50);

    const { data: opCosts } = await supabase
      .from("poultry_operational_costs")
      .select("*")
      .eq("company_id", companyId)
      .limit(50);

    // Collect environmental data
    const { data: climateRecords } = await supabase
      .from("dados_climaticos")
      .select("*")
      .eq("company_id", companyId)
      .order("data", { ascending: false })
      .limit(10);

    const { data: satelliteRecords } = await supabase
      .from("dados_satelite")
      .select("*")
      .eq("company_id", companyId)
      .order("data", { ascending: false })
      .limit(10);

    // Evaluate environmental alerts
    await supabase.rpc("evaluate_environmental_alerts", { p_company_id: companyId });

    // Call AI for advanced insights
    const systemPrompt = `Você é o NAVANHULA AI, especialista em avicultura e gestão de lotes de frangos em Moçambique.
Analise os dados fornecidos e gere insights avançados. Retorne EXATAMENTE um JSON com esta estrutura:

{
  "advanced_insights": [
    {
      "tipo": "alerta|recomendacao|previsao",
      "nivel": "info|warning|critico",
      "mensagem": "string clara e acionável",
      "dados": {}
    }
  ],
  "risk_level": "baixo|medio|alto",
  "predicted_outcomes": {
    "best_batch": "nome do melhor lote",
    "estimated_total_profit": number,
    "recommendation": "string"
  },
  "anomalies": [
    {
      "batch": "nome",
      "type": "mortalidade|consumo|custo",
      "description": "string"
    }
  ]
}

Seja específico com números reais. Moeda: MT.`;

    const userPrompt = `LOTES ATIVOS: ${JSON.stringify(batches)}
REGISTOS DIÁRIOS (últimos): ${JSON.stringify(dailyRecords?.slice(0, 20))}
INSUMOS: ${JSON.stringify(inputs?.slice(0, 20))}
CUSTOS OPERACIONAIS: ${JSON.stringify(opCosts?.slice(0, 20))}
CLIMA ATUAL: ${JSON.stringify(climateRecords?.slice(0, 5))}
DADOS SATÉLITE: ${JSON.stringify(satelliteRecords?.slice(0, 5))}

Gere insights avançados, detecte anomalias e faça previsões baseadas nestes dados reais. Considere as condições climáticas e ambientais na análise.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    let aiInsights = null;

    if (aiResponse.ok) {
      const aiResult = await aiResponse.json();
      let content = aiResult.choices?.[0]?.message?.content || "";
      content = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

      try {
        aiInsights = JSON.parse(content);

        // Save AI-generated insights to DB
        if (aiInsights.advanced_insights?.length) {
          for (const insight of aiInsights.advanced_insights) {
            await supabase.from("insights_ia").insert({
              company_id: companyId,
              batch_id: batches[0]?.id,
              tipo: insight.tipo || "recomendacao",
              mensagem: insight.mensagem,
              nivel: insight.nivel || "info",
              dados: insight.dados || {},
            });
          }
        }
      } catch {
        aiInsights = { raw: content };
      }
    } else {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", status, await aiResponse.text());
    }

    // Get latest insights from DB
    const { data: latestInsights } = await supabase
      .from("insights_ia")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Get ML features
    const { data: mlFeatures } = await supabase
      .from("ml_features")
      .select("*")
      .eq("company_id", companyId)
      .order("data", { ascending: false })
      .limit(30);

    return new Response(JSON.stringify({
      rule_based_insights: totalInsights,
      ai_insights: aiInsights,
      insights: latestInsights || [],
      ml_features: mlFeatures || [],
      batches_analyzed: batches.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("poultry-ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
