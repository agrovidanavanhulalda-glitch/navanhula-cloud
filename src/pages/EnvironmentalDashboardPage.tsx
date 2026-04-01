import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Thermometer, Droplets, Wind, Cloud, Sun, Satellite,
  RefreshCw, AlertTriangle, Leaf, Activity, CloudRain,
  TrendingUp, TrendingDown, Loader2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from "recharts";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const EnvironmentalDashboardPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch climate data
  const { data: climateData, isLoading: loadingClimate } = useQuery({
    queryKey: ["climate-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_climaticos")
        .select("*")
        .order("data", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch satellite data
  const { data: satelliteData, isLoading: loadingSatellite } = useQuery({
    queryKey: ["satellite-data"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dados_satelite")
        .select("*")
        .order("data", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // Fetch environmental alerts
  const { data: envAlerts } = useQuery({
    queryKey: ["env-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights_ia")
        .select("*")
        .contains("dados", { source: "climate" })
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        // fallback: get all recent alerts
        const { data: all } = await supabase
          .from("insights_ia")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        return (all || []).filter((a: any) => {
          const d = a.dados as any;
          return d?.source === "climate" || d?.source === "satellite";
        });
      }
      return data;
    },
  });

  // Collect data mutation
  const collectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("collect-environmental-data");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["climate-data"] });
      queryClient.invalidateQueries({ queryKey: ["satellite-data"] });
      queryClient.invalidateQueries({ queryKey: ["env-alerts"] });
      toast({
        title: "✅ Dados coletados",
        description: `Clima e satélite atualizados. ${data?.alerts_generated || 0} alertas gerados.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const latest = climateData?.[0];
  const latestSat = satelliteData?.[0];

  const climateChartData = (climateData || [])
    .slice(0, 24)
    .reverse()
    .map((d: any) => ({
      hora: format(new Date(d.data), "HH:mm"),
      temp: d.temperatura,
      humidade: d.humidade,
      vento: d.vento,
    }));

  const satelliteChartData = (satelliteData || [])
    .slice(0, 14)
    .reverse()
    .map((d: any) => ({
      data: format(new Date(d.data), "dd/MM"),
      ndvi: d.ndvi,
      stress: d.indice_stress,
      radiacao: d.radiacao_solar,
    }));

  const getStressColor = (val: number | null) => {
    if (!val) return "text-muted-foreground";
    if (val < 0.3) return "text-green-600";
    if (val < 0.5) return "text-yellow-600";
    if (val < 0.7) return "text-orange-600";
    return "text-red-600";
  };

  const getStressLabel = (val: number | null) => {
    if (!val) return "Sem dados";
    if (val < 0.3) return "Baixo";
    if (val < 0.5) return "Moderado";
    if (val < 0.7) return "Elevado";
    return "Crítico";
  };

  const getNdviLabel = (val: number | null) => {
    if (!val) return "Sem dados";
    if (val > 0.6) return "Saudável";
    if (val > 0.4) return "Moderado";
    if (val > 0.3) return "Atenção";
    return "Crítico";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-7 w-7 text-primary" />
            Ambiente & Clima
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados climáticos e de satélite em tempo real
          </p>
        </div>
        <Button
          onClick={() => collectMutation.mutate()}
          disabled={collectMutation.isPending}
        >
          {collectMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Atualizar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Thermometer className="h-6 w-6 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">
              {latest?.temperatura ? `${Math.round(latest.temperatura)}°C` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Temperatura</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Droplets className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">
              {latest?.humidade ? `${Math.round(latest.humidade)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Humidade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Wind className="h-6 w-6 mx-auto mb-1 text-teal-500" />
            <p className="text-2xl font-bold">
              {latest?.vento ? `${latest.vento} m/s` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Vento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CloudRain className="h-6 w-6 mx-auto mb-1 text-indigo-500" />
            <p className="text-2xl font-bold">
              {latest?.chuva !== undefined ? `${latest.chuva} mm` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Chuva</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Leaf className={`h-6 w-6 mx-auto mb-1 ${latestSat?.ndvi && latestSat.ndvi > 0.4 ? "text-green-500" : "text-orange-500"}`} />
            <p className="text-2xl font-bold">
              {latestSat?.ndvi ? latestSat.ndvi.toFixed(2) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">NDVI</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className={`h-6 w-6 mx-auto mb-1 ${getStressColor(latestSat?.indice_stress)}`} />
            <p className="text-2xl font-bold">
              {latestSat?.indice_stress ? getStressLabel(latestSat.indice_stress) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Stress</p>
          </CardContent>
        </Card>
      </div>

      {/* Current conditions summary */}
      {latest && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex flex-wrap items-center gap-4">
            {latest.icone && (
              <img
                src={`https://openweathermap.org/img/wn/${latest.icone}@2x.png`}
                alt="weather"
                className="w-16 h-16"
              />
            )}
            <div>
              <p className="font-semibold capitalize">{latest.descricao || "Condições atuais"}</p>
              <p className="text-sm text-muted-foreground">
                Pressão: {latest.pressao || "—"} hPa •
                Atualizado: {format(new Date(latest.data), "dd/MM HH:mm", { locale: pt })}
              </p>
            </div>
            {latestSat && (
              <div className="ml-auto flex gap-3">
                <Badge variant={latestSat.ndvi && latestSat.ndvi > 0.4 ? "default" : "destructive"}>
                  NDVI: {getNdviLabel(latestSat.ndvi)}
                </Badge>
                <Badge variant={latestSat.indice_stress && latestSat.indice_stress < 0.5 ? "default" : "destructive"}>
                  Stress: {getStressLabel(latestSat.indice_stress)}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="clima" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clima">☁️ Clima</TabsTrigger>
          <TabsTrigger value="satelite">🛰️ Satélite</TabsTrigger>
          <TabsTrigger value="alertas">⚠️ Alertas</TabsTrigger>
          <TabsTrigger value="historico">📊 Histórico</TabsTrigger>
        </TabsList>

        {/* CLIMA TAB */}
        <TabsContent value="clima" className="space-y-4">
          {climateChartData.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Temperatura (°C)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={climateChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="temp" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Temp °C" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Humidade (%) & Vento (m/s)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={climateChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hora" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="humidade" stroke="#3b82f6" name="Humidade %" />
                      <Line type="monotone" dataKey="vento" stroke="#14b8a6" name="Vento m/s" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum dado climático. Clique "Atualizar Dados" para começar.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SATELITE TAB */}
        <TabsContent value="satelite" className="space-y-4">
          {satelliteChartData.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">NDVI — Índice de Vegetação</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={satelliteChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" fontSize={12} />
                      <YAxis domain={[0, 1]} fontSize={12} />
                      <Tooltip />
                      <Area type="monotone" dataKey="ndvi" stroke="#22c55e" fill="#22c55e20" name="NDVI" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Índice de Stress Ambiental</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={satelliteChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" fontSize={12} />
                      <YAxis domain={[0, 1]} fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="stress" fill="hsl(var(--primary))" name="Stress" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Satellite className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum dado de satélite. Clique "Atualizar Dados" para coletar.</p>
              </CardContent>
            </Card>
          )}

          {/* Satellite details table */}
          {satelliteData && satelliteData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dados Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-right p-2">NDVI</th>
                        <th className="text-right p-2">Temp Solo</th>
                        <th className="text-right p-2">Radiação</th>
                        <th className="text-right p-2">Evapotrans.</th>
                        <th className="text-right p-2">Stress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {satelliteData.slice(0, 10).map((s: any) => (
                        <tr key={s.id} className="border-b">
                          <td className="p-2">{format(new Date(s.data), "dd/MM/yyyy")}</td>
                          <td className="p-2 text-right font-mono">{s.ndvi?.toFixed(2) || "—"}</td>
                          <td className="p-2 text-right font-mono">{s.temperatura_solo ? `${s.temperatura_solo.toFixed(1)}°C` : "—"}</td>
                          <td className="p-2 text-right font-mono">{s.radiacao_solar?.toFixed(1) || "—"}</td>
                          <td className="p-2 text-right font-mono">{s.evapotranspiracao?.toFixed(2) || "—"}</td>
                          <td className={`p-2 text-right font-bold ${getStressColor(s.indice_stress)}`}>
                            {getStressLabel(s.indice_stress)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ALERTAS TAB */}
        <TabsContent value="alertas" className="space-y-3">
          {envAlerts && envAlerts.length > 0 ? (
            envAlerts.map((alert: any) => (
              <Card
                key={alert.id}
                className={
                  alert.nivel === "critico"
                    ? "border-destructive/50 bg-destructive/5"
                    : alert.nivel === "warning"
                    ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10"
                    : ""
                }
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      alert.nivel === "critico"
                        ? "text-destructive"
                        : alert.nivel === "warning"
                        ? "text-yellow-600"
                        : "text-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.mensagem}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: pt })} •
                      Fonte: {(alert.dados as any)?.source || "sistema"}
                    </p>
                  </div>
                  <Badge variant={alert.nivel === "critico" ? "destructive" : "secondary"}>
                    {alert.nivel}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum alerta ambiental ativo.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HISTORICO TAB */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico Climático</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Data/Hora</th>
                      <th className="text-right p-2">Temp</th>
                      <th className="text-right p-2">Humidade</th>
                      <th className="text-right p-2">Chuva</th>
                      <th className="text-right p-2">Vento</th>
                      <th className="text-left p-2">Condição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(climateData || []).slice(0, 20).map((c: any) => (
                      <tr key={c.id} className="border-b">
                        <td className="p-2">{format(new Date(c.data), "dd/MM HH:mm")}</td>
                        <td className="p-2 text-right font-mono">{c.temperatura ? `${c.temperatura.toFixed(1)}°C` : "—"}</td>
                        <td className="p-2 text-right font-mono">{c.humidade ? `${c.humidade}%` : "—"}</td>
                        <td className="p-2 text-right font-mono">{c.chuva || 0} mm</td>
                        <td className="p-2 text-right font-mono">{c.vento || 0} m/s</td>
                        <td className="p-2 capitalize">{c.descricao || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnvironmentalDashboardPage;
