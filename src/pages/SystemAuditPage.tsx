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
  History, UserPlus, Fingerprint, Download, FileJson, FileText,
  Filter, Calendar as CalendarIcon, X, Globe, Building2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  format, startOfDay, endOfDay, isWithinInterval, parseISO, 
  subDays, startOfMonth, endOfMonth 
} from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { pt } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { cn } from "@/lib/utils";


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
  transaction_id: string | number;
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
  const [eventRoleFilter, setEventRoleFilter] = useState("all");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, timezone");
      if (error) throw error;
      return data;
    },
  });



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
        .limit(500);
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
        .limit(500);
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
        .limit(500);
      if (error) throw error;
      return data as AuthEventLog[];
    },
  });

  const isWithinDateRange = (dateString: string) => {
    const utcDate = parseISO(dateString);
    const date = toZonedTime(utcDate, timezone);
    
    // Check Date Range
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from ? startOfDay(dateRange.from) : undefined;
      const to = dateRange.to ? endOfDay(dateRange.to) : undefined;

      const zonedStartOfDay = startOfDay(date);

      if (from && to) {
        if (!isWithinInterval(zonedStartOfDay, { start: from, end: to })) return false;
      } else if (from && zonedStartOfDay < from) {
        return false;
      } else if (to && zonedStartOfDay > to) {
        return false;
      }
    }

    // Check Time Range
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeValue = hours * 60 + minutes;

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startValue = startH * 60 + startM;
    const endValue = endH * 60 + endM;

    return timeValue >= startValue && timeValue <= endValue;
  };


  const filteredAuthLogs = authFlowLogs?.filter(log => 
    (!authSearch || 
    log.email?.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.step.toLowerCase().includes(authSearch.toLowerCase()) ||
    log.transaction_id?.toString().includes(authSearch)) &&
    isWithinDateRange(log.created_at)
  );

  const filteredEventLogs = authEventLogs?.filter(log => {
    const matchesSearch = !eventSearch ||
      log.role_key?.toLowerCase().includes(eventSearch.toLowerCase()) ||
      log.event_type.toLowerCase().includes(eventSearch.toLowerCase()) ||
      log.transaction_id.includes(eventSearch) ||
      log.target_user_id.includes(eventSearch);
    
    const matchesRole = eventRoleFilter === "all" || log.role_key === eventRoleFilter;
    const matchesStatus = eventStatusFilter === "all" || log.status === eventStatusFilter;
    const matchesStore = selectedStoreId === "all" || log.branch_id === selectedStoreId;
    const matchesDate = isWithinDateRange(log.created_at);

    return matchesSearch && matchesRole && matchesStatus && matchesDate && matchesStore;
  });

  const filteredGeneralLogs = logs?.filter(log => {
    const matchesDate = isWithinDateRange(log.created_at);
    const matchesStore = selectedStoreId === "all" || log.store_id === selectedStoreId;
    return matchesDate && matchesStore;
  });

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    if (storeId !== "all") {
      const selectedStore = stores?.find(s => s.id === storeId);
      if (selectedStore?.timezone) {
        setTimezone(selectedStore.timezone);
      }
    }
  };


  const exportToExcel = (data: any[], fileName: string) => {
    const formattedData = data.map(item => ({
      ...item,
      created_at: formatInTimeZone(new Date(item.created_at), timezone, "dd/MM/yyyy HH:mm:ss"),
      profiles: item.profiles ? `${item.profiles.full_name} (${item.profiles.email})` : item.profiles,
      details: typeof item.details === 'object' ? JSON.stringify(item.details) : item.details,
      metadata: typeof item.metadata === 'object' ? JSON.stringify(item.metadata) : item.metadata,
      new_data: typeof item.new_data === 'object' ? JSON.stringify(item.new_data) : item.new_data,
      old_data: typeof item.old_data === 'object' ? JSON.stringify(item.old_data) : item.old_data,
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, `${fileName}_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  const exportToPDF = (data: any[], title: string, fileName: string, columns: string[]) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    
    const tableData = data.map(item => columns.map(col => {
      if (col === 'created_at') return formatInTimeZone(new Date(item[col]), timezone, "dd/MM/yyyy HH:mm");
      if (typeof item[col] === 'object') return JSON.stringify(item[col]).substring(0, 50);
      return String(item[col] || "");
    }));

    (doc as any).autoTable({
      head: [columns.map(c => c.replace('_', ' ').toUpperCase())],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
    });

    doc.save(`${fileName}_${format(new Date(), "dd-MM-yyyy")}.pdf`);
  };

  const setQuickRange = (range: 'today' | 'yesterday' | '7days' | 'month') => {
    const now = new Date();
    switch (range) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDateRange({ from: yesterday, to: yesterday });
        break;
      case '7days':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Shield className="w-7 h-7" />
            Auditoria Enterprise
          </h1>
          <p className="text-muted-foreground">Rastreabilidade total de ações críticas no sistema</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickRange('today')} className="h-9">Hoje</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('yesterday')} className="h-9">Ontem</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('7days')} className="h-9">7 Dias</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickRange('month')} className="h-9">Mês Atual</Button>
            <div className="w-px h-6 bg-border mx-2" />
          </div>
          <Popover>


            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yy")
                  )
                ) : (
                  <span>Filtrar por data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: any) => setDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                locale={pt}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-md border border-border/50">
            <div className="flex items-center gap-2 px-2">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={selectedStoreId} onValueChange={handleStoreChange}>
                <SelectTrigger className="w-[180px] h-8 text-xs border-none bg-transparent focus-visible:ring-0 px-1">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <div className="flex items-center gap-2 px-2">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="w-[180px] h-8 text-xs border-none bg-transparent focus-visible:ring-0 px-1">
                  <SelectValue placeholder="Timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (GMT)</SelectItem>
                  <SelectItem value="Africa/Maputo">Maputo (CAT)</SelectItem>
                  <SelectItem value="Europe/Lisbon">Lisboa (WET/WEST)</SelectItem>
                  <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                  <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                    Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <div className="flex items-center gap-2 px-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="w-[90px] h-8 text-xs border-none bg-transparent focus-visible:ring-0 px-1"
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="w-[90px] h-8 text-xs border-none bg-transparent focus-visible:ring-0 px-1"
              />
            </div>
          </div>
          {(dateRange.from || dateRange.to || startTime !== "00:00" || endTime !== "23:59") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setDateRange({ from: undefined, to: undefined });
                setStartTime("00:00");
                setEndTime("23:59");
              }}
              className="h-10 px-2 text-muted-foreground"
            >
              <X className="w-4 h-4 mr-2" /> Limpar
            </Button>
          )}

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
            <CardHeader className="flex flex-col space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Auditoria de Criação e Cargos
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToExcel(filteredEventLogs || [], "auditoria_eventos")}
                    className="gap-2"
                  >
                    <FileJson className="w-4 h-4" /> Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToPDF(
                      filteredEventLogs || [], 
                      "Relatório de Auditoria de Criação e Cargos", 
                      "auditoria_eventos",
                      ['created_at', 'event_type', 'role_key', 'status', 'target_user_id', 'transaction_id']
                    )}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Pesquisar utilizador, ID de transação..." 
                    className="pl-9"
                    value={eventSearch}
                    onChange={(e) => setEventSearch(e.target.value)}
                  />
                  {eventSearch && (
                    <button 
                      onClick={() => setEventSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                
                <Select value={eventRoleFilter} onValueChange={setEventRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cargo (Role)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Cargos</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="failure">Falha</SelectItem>
                  </SelectContent>
                </Select>
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
                              <Clock className="w-3 h-3" /> {formatInTimeZone(new Date(log.created_at), timezone, "dd/MM/yyyy HH:mm:ss")}
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
            <CardHeader className="flex flex-col space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Logs Técnicos de Autenticação
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => exportToExcel(filteredAuthLogs || [], "logs_autenticacao")}
                  >
                    <Download className="w-4 h-4 mr-2" /> Exportar
                  </Button>
                </div>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar por email, ID de transação ou passo..." 
                  className="pl-9"
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
                          <span className="text-[10px] text-muted-foreground">{formatInTimeZone(new Date(log.created_at), timezone, "HH:mm:ss")}</span>
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico de Operações na Base de Dados
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportToExcel(filteredGeneralLogs || [], "auditoria_db")}
              >
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {isLoading ? (
                  <div className="text-center py-10">Carregando auditoria...</div>
                ) : (
                  <div className="space-y-4">
                    {filteredGeneralLogs?.map((log) => (

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
                            {formatInTimeZone(new Date(log.created_at), timezone, "dd MMM, HH:mm")}
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
