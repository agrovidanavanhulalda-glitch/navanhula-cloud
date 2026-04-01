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
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

    if (!OPENWEATHER_API_KEY) throw new Error("OPENWEATHER_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
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

    // Get company coordinates
    const { data: company } = await supabase
      .from("companies")
      .select("latitude, longitude, city")
      .eq("id", companyId)
      .single();

    // Default to Nampula, Mozambique if no coordinates
    const lat = company?.latitude || -15.1165;
    const lon = company?.longitude || 39.2666;

    // ===== 1. OPENWEATHERMAP =====
    let climateData = null;
    try {
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${OPENWEATHER_API_KEY}`;
      const weatherRes = await fetch(weatherUrl);
      if (weatherRes.ok) {
        const w = await weatherRes.json();
        climateData = {
          company_id: companyId,
          temperatura: w.main?.temp,
          humidade: w.main?.humidity,
          chuva: w.rain?.["1h"] || w.rain?.["3h"] || 0,
          vento: w.wind?.speed,
          pressao: w.main?.pressure,
          descricao: w.weather?.[0]?.description,
          icone: w.weather?.[0]?.icon,
          fonte: "openweathermap",
        };

        await supabase.from("dados_climaticos").insert(climateData);
      } else {
        console.error("OpenWeather error:", weatherRes.status, await weatherRes.text());
      }
    } catch (e) {
      console.error("Climate fetch error:", e);
    }

    // ===== 2. NASA POWER API =====
    let satelliteData = null;
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 2); // NASA data has ~2 day delay
      const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, "");

      const nasaUrl = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,EVPTRNS,RH2M&community=AG&longitude=${lon}&latitude=${lat}&start=${dateStr}&end=${dateStr}&format=JSON`;
      const nasaRes = await fetch(nasaUrl);

      if (nasaRes.ok) {
        const nasa = await nasaRes.json();
        const params = nasa.properties?.parameter || {};

        const t2m = Object.values(params.T2M || {})[0] as number || null;
        const radiation = Object.values(params.ALLSKY_SFC_SW_DWN || {})[0] as number || null;
        const evap = Object.values(params.EVPTRNS || {})[0] as number || null;
        const rh = Object.values(params.RH2M || {})[0] as number || null;

        // Calculate stress index (composite of heat + humidity + low vegetation)
        let stressIndex = 0;
        if (t2m && t2m > 25) stressIndex += Math.min((t2m - 25) / 20, 0.4);
        if (rh && rh > 70) stressIndex += Math.min((rh - 70) / 60, 0.3);
        if (radiation && radiation > 25) stressIndex += Math.min((radiation - 25) / 20, 0.3);
        stressIndex = Math.min(stressIndex, 1);

        // Simulated NDVI based on environmental conditions
        let ndvi = 0.6; // base healthy
        if (t2m && t2m > 35) ndvi -= 0.15;
        if (rh && rh < 30) ndvi -= 0.2;
        if (evap && evap > 5) ndvi -= 0.1;
        ndvi = Math.max(0.1, Math.min(ndvi, 0.9));

        satelliteData = {
          company_id: companyId,
          ndvi: Math.round(ndvi * 100) / 100,
          temperatura_solo: t2m,
          radiacao_solar: radiation,
          evapotranspiracao: evap,
          indice_stress: Math.round(stressIndex * 100) / 100,
          fonte: "nasa_power",
        };

        await supabase.from("dados_satelite").insert(satelliteData);
      } else {
        console.error("NASA POWER error:", nasaRes.status, await nasaRes.text());
      }
    } catch (e) {
      console.error("Satellite fetch error:", e);
    }

    // ===== 3. EVALUATE ALERTS =====
    const { data: alertCount } = await supabase.rpc("evaluate_environmental_alerts", {
      p_company_id: companyId,
    });

    return new Response(JSON.stringify({
      success: true,
      climate: climateData,
      satellite: satelliteData,
      alerts_generated: alertCount || 0,
      coordinates: { lat, lon },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("collect-environmental-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
