import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // AUTH: require a valid Supabase user session before using the AI gateway
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { salesSummary, stockAlerts, topProducts, profitData, currency } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");


    const systemPrompt = `Você é o NAVANHULA AI, assistente de inteligência empresarial do NAVANHULA CLOUD ERP, especializado no mercado moçambicano.

Analise os dados fornecidos e gere insights acionáveis em português. Retorne EXATAMENTE um JSON com a estrutura abaixo, sem markdown ou texto extra:

{
  "salesAnalysis": { "summary": "string", "trend": "up|down|stable", "changePercent": number },
  "forecast": { "next7days": "string", "nextMonth": "string" },
  "stockAlerts": [{ "product": "string", "severity": "critical|warning|info", "message": "string", "suggestedAction": "string" }],
  "staleProducts": [{ "product": "string", "daysSinceLastSale": number, "suggestion": "string" }],
  "restockSuggestions": [{ "product": "string", "suggestedQuantity": number, "reason": "string" }],
  "profitInsights": { "topProfitable": "string", "leastProfitable": "string", "suggestion": "string" },
  "promotionSuggestions": [{ "product": "string", "reason": "string", "suggestedDiscount": string }],
  "dailyTip": "string"
}

Moeda: ${currency || 'MT'}. Seja direto e específico com números reais dos dados.`;

    const userPrompt = `Dados da empresa:

VENDAS (resumo): ${JSON.stringify(salesSummary)}

ALERTAS DE ESTOQUE: ${JSON.stringify(stockAlerts)}

TOP PRODUTOS: ${JSON.stringify(topProducts)}

DADOS DE LUCRO: ${JSON.stringify(profitData)}

Gere insights acionáveis baseados nestes dados reais.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos AI esgotados. Adicione créditos na sua conta." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    content = content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { dailyTip: content, salesAnalysis: null, forecast: null, stockAlerts: [], staleProducts: [], restockSuggestions: [], profitInsights: null, promotionSuggestions: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-business-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
