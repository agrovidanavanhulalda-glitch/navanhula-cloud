import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, Activity, Clock, User, ArrowRight, Shield, 
  Key, AlertCircle, CheckCircle2, Database, Hash, Search,
  History, UserPlus, Fingerprint
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface AuditLog {
  id: string;
  user_id: string | null;
  company_id: string | null;
  store_id: string | null;
  action: string;
  table_name: string;
  details?: any;
  new_data?: any;
  old_data?: any;
  created_at: string;
  query_text?: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface AuthFlowLog {
  id: string;
  transaction_id: string | number; // Accept both for transition
  user_id: string | null;
  email: string | null;
  step: string;
  status: 'success' | 'failure' | 'started';
  metadata: any;
  error_message: string | null;
  created_at: string;
}

interface AuthEventLog {
  id: string;
  transaction_id: string;
  event_type: string;
  actor_id: string | null;
  target_user_id: string;
  company_id: string | null;
  branch_id: string | null;
  role_key: string;
  metadata: any;
  status: string;
  error_message: string | null;
  created_at: string;
}

const SystemAuditPage: React.FC = () => {
  const [authSearch, setAuthSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          id, user_id, company_id, store_id, action, table_name,
          details, new_data, old_data, created_at, query_text,
          profiles (full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as any[]).map(log => ({
        ...log,
        profiles: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
      })) as AuditLog[];
    },
  });

  const { data: authFlowLogs, isLoading: isAuthLoading } = useQuery({
    queryKey: ["auth-flow-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_flow_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuthFlowLog[];
    },
  });

  const { data: authEventLogs, isLoading: isEventsLoading } = useQuery({
    queryKey: ["auth-event-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_event_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuthEventLog[];
    },
  });

  const filteredAuthLogs = authFlowLogs?.filter(log => 
    !authSearch || 
    log.email?.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.step.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.transaction_id?.toString().includes(authSearch)
  );

  const filteredEventLogs = authEventLogs?.filter(log =>
    !eventSearch ||
    log.role_key?.toLowerCase().includes(eventSearch.toLowerCase()) ||
    log.event_type.toLowerCase().includes(eventSearch.toLowerCase()) ||
    log.transaction_id.includes(eventSearch) ||
    log.target_user_id.includes(eventSearch)
  );

  const getStepLabel = (step: string) => {
    const labels: Record<string, string> = {
      'trigger_started': 'Início do Fluxo',
      'profile_created': 'Criação de Perfil',
      'company_user_created': 'Vínculo com Empresa',
      'user_role_created': 'Atribuição de Cargo',
      'trigger_completed': 'Fluxo Concluído',
      'profile_failed': 'Falha no Perfil',
      'company_user_failed': 'Falha no Vínculo',
      'user_role_failed': 'Falha no Cargo',
      'trigger_failed': 'Falha Crítica'
    };
    return labels[step] || step;
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'user_creation_start': 'Início de Criação',
      'user_creation_complete': 'Criação Concluída',
      'invite_accept_attempt': 'Tentativa de Convite',
      'invite_accept_success': 'Convite Aceite',
      'profile_creation_failed': 'Erro no Perfil',
      'company_user_creation_failed': 'Erro no Vínculo',
      'user_role_creation_failed': 'Erro no Cargo'
    };
    return labels[type] || type;
  };

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Ações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
              <Key className="w-4 h-4" />
              Eventos Auth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{authEventLogs?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              Falhas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {(authEventLogs?.filter(l => l.status === 'failure').length || 0) + (authFlowLogs?.filter(l => l.status === 'failure').length || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <Fingerprint className="w-4 h-4" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">Auditadas</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="events" className="gap-2">
            <History className="w-4 h-4" /> Ciclo de Vida (Roles)
          </TabsTrigger>
          <TabsTrigger value="auth" className="gap-2">
            <Key className="w-4 h-4" /> Fluxo Técnico
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Database className="w-4 h-4" /> Auditoria DB
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-primary" />
                Auditoria de Criação e Cargos (Role Keys)
              </CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="TX ID, Role, User ID..." 
                  className="pl-9 h-9"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {isEventsLoading ? (
                  <div className="text-center py-10">Carregando eventos...</div>
                ) : filteredEventLogs?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Nenhum evento detalhado encontrado.</div>
                ) : (
                  <div className="space-y-4">
                    {filteredEventLogs?.map((log) => (
                      <div key={log.id} className={`p-4 rounded-lg border bg-card hover:shadow-sm transition-all ${log.status === 'failure' ? 'border-red-200 bg-red-50/20' : ''}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === 'success' ? 'default' : log.status === 'failure' ? 'destructive' : 'secondary'}>
                              {log.status.toUpperCase()}
                            </Badge>
                            <span className="font-bold text-sm">{getEventTypeLabel(log.event_type)}</span>
                            <Badge variant="outline" className="font-mono text-primary border-primary/30">
                              {log.role_key}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              <Fingerprint className="w-3 h-3" /> {log.transaction_id.substring(0, 8)}...
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-3">
                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase text-[9px] font-bold">Target User</p>
                            <p className="font-mono truncate">{log.target_user_id}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase text-[9px] font-bold">Actor (Admin)</p>
                            <p className="font-mono truncate">{log.actor_id || 'Self/System'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground uppercase text-[9px] font-bold">Company / Branch</p>
                            <p className="truncate">{log.company_id ? `Co: ${log.company_id.substring(0,8)}...` : '-'} / {log.branch_id ? `Br: ${log.branch_id.substring(0,8)}...` : '-'}</p>
                          </div>
                        </div>

                        {log.error_message && (
                          <div className="mb-3 p-2 rounded bg-red-50 border border-red-100 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 font-medium">{log.error_message}</p>
                          </div>
                        )}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-2">
                            <details className="cursor-pointer group">
                              <summary className="text-[10px] text-muted-foreground uppercase font-bold group-open:mb-2">Ver Metadados Técnicos</summary>
                              <pre className="p-3 rounded bg-muted/50 text-[10px] font-mono overflow-auto max-h-40">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Logs Técnicos de Autenticação
              </CardTitle>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por email ou TX..." 
                  className="pl-9 h-8 text-xs"
                  value={authSearch}
                  onChange={(e) => setAuthSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {isAuthLoading ? (
                  <div className="text-center py-10">Carregando logs técnicos...</div>
                ) : filteredAuthLogs?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">Nenhum log encontrado.</div>
                ) : (
                  <div className="space-y-3">
                    {filteredAuthLogs?.map((log) => (
                      <div key={log.id} className={`p-3 rounded-lg border text-xs ${log.status === 'failure' ? 'border-red-200 bg-red-50/10' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === 'failure' ? 'destructive' : 'outline'} className="text-[9px]">
                              {log.status.toUpperCase()}
                            </Badge>
                            <span className="font-semibold">{getStepLabel(log.step)}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(log.created_at), "HH:mm:ss")}</span>
                        </div>
                        <p className="text-muted-foreground truncate">{log.email}</p>
                        {log.error_message && <p className="text-red-600 mt-1 font-medium">{log.error_message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Operações na Base de Dados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {isLoading ? (
                  <div className="text-center py-10">Carregando auditoria...</div>
                ) : (
                  <div className="space-y-4">
                    {logs?.map((log) => (
                      <div key={log.id} className="p-4 rounded-lg border bg-card hover:shadow-sm transition-all text-xs">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.action === 'DELETE' ? 'destructive' : log.action === 'INSERT' ? 'default' : 'outline'} className="text-[10px]">
                              {log.action}
                            </Badge>
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <span className="font-bold text-primary">{log.table_name}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(log.created_at), "dd MMM, HH:mm", { locale: pt })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-3 h-3" />
                          <span>{log.profiles?.full_name || 'Sistema'}</span>
                        </div>
                        <div className="p-2 rounded bg-muted/50 font-mono text-[10px] max-h-24 overflow-auto">
                          {JSON.stringify(log.new_data || log.details || log.old_data)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemAuditPage;
