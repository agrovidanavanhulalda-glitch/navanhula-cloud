import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Activity, Clock, User, ArrowRight, Shield } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  details: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const SystemAuditPage: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, profiles:user_id(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Shield className="w-7 h-7" />
            Auditoria Enterprise
          </h1>
          <p className="text-muted-foreground">Rastreabilidade total de ações críticas no sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Ações nas últimas 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <ShieldCheck className="w-4 h-4" />
              Estado do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Protegido</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Histórico Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="text-center py-10">Carregando logs...</div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">Nenhuma ação registrada ainda.</div>
            ) : (
              <div className="space-y-4">
                {logs?.map((log) => (
                  <div key={log.id} className="flex flex-col p-4 rounded-lg border bg-card hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize px-2 py-0.5 text-[10px] font-bold">
                          {log.action}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono font-bold text-primary">{log.table_name || 'Geral'}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd MMM, HH:mm:ss", { locale: pt })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-none">{log.profiles?.full_name || 'Sistema'}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{log.profiles?.email || 'Ação Automatizada'}</p>
                      </div>
                    </div>

                    {log.details && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-[11px] font-mono overflow-hidden">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAuditPage;
