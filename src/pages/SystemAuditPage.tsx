import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, AlertTriangle, XCircle, RefreshCw, CheckCircle2, Clock, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  module: string;
  severity: string;
  check_name: string;
  message: string;
  action_taken: string | null;
  status: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

const MODULE_LABELS: Record<string, string> = {
  finance: "Financeiro",
  hr: "RH / Payroll",
  pos: "PDV / Estoque",
  documents: "Documentos Fiscais",
  compliance: "Compliance",
};

const SEVERITY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  info: { icon: <CheckCircle2 className="w-4 h-4" />, color: "bg-green-500/10 text-green-700 border-green-200", label: "OK" },
  warning: { icon: <AlertTriangle className="w-4 h-4" />, color: "bg-yellow-500/10 text-yellow-700 border-yellow-200", label: "Aviso" },
  critical: { icon: <XCircle className="w-4 h-4" />, color: "bg-red-500/10 text-red-700 border-red-200", label: "Crítico" },
};

const SystemAuditPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["system-audit-logs", moduleFilter],
    queryFn: async () => {
      let query = supabase
        .from("system_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (moduleFilter !== "all") query = query.eq("module", moduleFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const runAudit = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/system-audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao executar auditoria");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["system-audit-logs"] });
      toast.success(`Auditoria concluída: ${data.total_checks} verificações, ${data.auto_resolved} corrigidas automaticamente.`);
    },
    onError: () => toast.error("Erro ao executar auditoria do sistema."),
  });

  // Apply client-side filters
  const filteredLogs = (logs || []).filter((l) => {
    if (severityFilter !== "all" && l.severity !== severityFilter) return false;
    if (searchText && !l.message.toLowerCase().includes(searchText.toLowerCase()) && !l.check_name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // Module summary from latest batch
  const latestBatch = logs && logs.length > 0 ? logs[0]?.created_at : null;
  const latestLogs = latestBatch
    ? logs?.filter((l) => Math.abs(new Date(l.created_at).getTime() - new Date(latestBatch).getTime()) < 5000)
    : [];

  const moduleStatus = Object.keys(MODULE_LABELS).map((mod) => {
    const modLogs = latestLogs?.filter((l) => l.module === mod) || [];
    const hasCritical = modLogs.some((l) => l.severity === "critical");
    const hasWarning = modLogs.some((l) => l.severity === "warning");
    const severity = hasCritical ? "critical" : hasWarning ? "warning" : "info";
    return { module: mod, severity, count: modLogs.length };
  });

  // Summary stats
  const totalCritical = latestLogs?.filter((l) => l.severity === "critical").length || 0;
  const totalWarnings = latestLogs?.filter((l) => l.severity === "warning").length || 0;
  const totalResolved = latestLogs?.filter((l) => l.status === "auto_resolved").length || 0;

  const exportCSV = () => {
    if (!filteredLogs.length) return;
    const header = "Data,Módulo,Severidade,Verificação,Mensagem,Status,Ação\n";
    const rows = filteredLogs.map((l) =>
      `"${format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}","${MODULE_LABELS[l.module] || l.module}","${l.severity}","${l.check_name}","${l.message}","${l.status}","${l.action_taken || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Agente de Auditoria MAX
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema auto-regenerativo — monitoramento contínuo de todos os módulos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} disabled={!filteredLogs.length}>
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
          <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending} size="lg">
            {runAudit.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Executar Auditoria
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{totalCritical}</p>
            <p className="text-xs text-muted-foreground">Críticos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{totalWarnings}</p>
            <p className="text-xs text-muted-foreground">Avisos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalResolved}</p>
            <p className="text-xs text-muted-foreground">Auto-corrigidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{latestLogs?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Verificações</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {moduleStatus.map((ms) => {
          const cfg = SEVERITY_CONFIG[ms.severity];
          return (
            <Card
              key={ms.module}
              className={`cursor-pointer border transition-all hover:shadow-md ${moduleFilter === ms.module ? "ring-2 ring-primary" : ""}`}
              onClick={() => setModuleFilter(moduleFilter === ms.module ? "all" : ms.module)}
            >
              <CardContent className="p-4 text-center">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </div>
                <p className="text-sm font-semibold mt-2">{MODULE_LABELS[ms.module]}</p>
                <p className="text-xs text-muted-foreground">{ms.count} verificações</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timestamp + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {latestBatch && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Última auditoria: {format(new Date(latestBatch), "dd/MM/yyyy HH:mm:ss")}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="info">OK</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Pesquisar..."
            className="w-[200px] h-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Logs de Auditoria
            {moduleFilter !== "all" && <Badge variant="secondary" className="ml-2">{MODULE_LABELS[moduleFilter]}</Badge>}
            {severityFilter !== "all" && <Badge variant="outline" className="ml-2">{severityFilter}</Badge>}
            <span className="text-sm font-normal text-muted-foreground ml-2">({filteredLogs.length} resultados)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum log encontrado. Execute a primeira auditoria.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const cfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;
                  return (
                    <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
                      <div className="mt-0.5">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">{MODULE_LABELS[log.module] || log.module}</Badge>
                          <span className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm")}</span>
                          {log.status === "auto_resolved" && <Badge className="bg-green-600 text-white text-[10px]">Auto-corrigido</Badge>}
                          {log.status === "needs_manual" && <Badge variant="destructive" className="text-[10px]">Ação Manual</Badge>}
                        </div>
                        <p className="text-sm font-medium mt-1">{log.message}</p>
                        {log.action_taken && <p className="text-xs text-green-700 mt-1">✅ {log.action_taken}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAuditPage;
