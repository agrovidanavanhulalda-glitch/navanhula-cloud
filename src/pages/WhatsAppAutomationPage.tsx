import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AppBreadcrumb from '@/components/layout/AppBreadcrumb';
import {
  MessageCircle, Send, Users, BarChart3, Copy, ExternalLink,
  Phone, Plus, Search, Filter, Zap, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import {
  WHATSAPP_TEMPLATES,
  fillTemplate,
  buildWhatsAppUrl,
  getLeadStatusLabel,
  type WhatsAppTemplate,
  type WhatsAppLead,
  type LeadStatus,
} from '@/lib/whatsappTemplates';

// Demo leads for illustration
const demoLeads: WhatsAppLead[] = [
  { id: '1', name: 'João Silva', phone: '258841234567', status: 'hot', lastContact: '2026-04-05', source: 'WhatsApp', notes: 'Quer comprar 50 frangos', messagesCount: 8 },
  { id: '2', name: 'Maria Santos', phone: '258842345678', status: 'warm', lastContact: '2026-04-03', source: 'Landing Page', notes: 'Criadora interessada', messagesCount: 3 },
  { id: '3', name: 'Carlos Tembe', phone: '258843456789', status: 'cold', lastContact: '2026-03-28', source: 'WhatsApp', notes: 'Não respondeu último contacto', messagesCount: 1 },
  { id: '4', name: 'Ana Mondlane', phone: '258844567890', status: 'hot', lastContact: '2026-04-04', source: 'Referência', notes: 'Restaurante — compra recorrente', messagesCount: 12 },
  { id: '5', name: 'Pedro Machava', phone: '258845678901', status: 'warm', lastContact: '2026-04-01', source: 'WhatsApp', notes: 'Entregador potencial', messagesCount: 5 },
];

const WhatsAppAutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [customPhone, setCustomPhone] = useState('');
  const [searchLead, setSearchLead] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSelectTemplate = (t: WhatsAppTemplate) => {
    setSelectedTemplate(t);
    const defaults: Record<string, string> = {};
    t.variables.forEach(v => { defaults[v] = ''; });
    setTemplateValues(defaults);
  };

  const previewMessage = selectedTemplate ? fillTemplate(selectedTemplate, templateValues) : '';

  const handleSendWhatsApp = () => {
    if (!customPhone.trim()) {
      toast.error('Insira o número de telefone.');
      return;
    }
    const url = buildWhatsAppUrl(customPhone, previewMessage);
    window.open(url, '_blank');
    toast.success('Abrindo WhatsApp...');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(previewMessage);
    toast.success('Mensagem copiada!');
  };

  const filteredLeads = demoLeads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchLead.toLowerCase()) || l.phone.includes(searchLead);
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: demoLeads.length,
    hot: demoLeads.filter(l => l.status === 'hot').length,
    warm: demoLeads.filter(l => l.status === 'warm').length,
    cold: demoLeads.filter(l => l.status === 'cold').length,
    messages: demoLeads.reduce((s, l) => s + l.messagesCount, 0),
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AppBreadcrumb />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[hsl(142,70%,45%)]" />
            WhatsApp Automação
          </h1>
          <p className="text-sm text-muted-foreground">Gere leads, converta clientes e automatize comunicação</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-primary' },
          { label: 'Quentes 🔥', value: stats.hot, icon: Zap, color: 'text-destructive' },
          { label: 'Mornos ⚡', value: stats.warm, icon: Clock, color: 'text-warning' },
          { label: 'Frios ❄️', value: stats.cold, icon: AlertTriangle, color: 'text-muted-foreground' },
          { label: 'Mensagens', value: stats.messages, icon: Send, color: 'text-[hsl(142,70%,45%)]' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="gap-2"><Send className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="leads" className="gap-2"><Users className="h-4 w-4" />Leads CRM</TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2"><BarChart3 className="h-4 w-4" />Campanhas</TabsTrigger>
        </TabsList>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Template list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Modelos de Mensagem</CardTitle>
                <CardDescription>Selecione um template para personalizar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {WHATSAPP_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{t.name}</span>
                      <Badge variant="secondary" className="text-xs capitalize">{t.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {t.message.slice(0, 80)}...
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Template editor & preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {selectedTemplate ? `Editar: ${selectedTemplate.name}` : 'Selecione um template'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate ? (
                  <>
                    {selectedTemplate.variables.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Variáveis:</p>
                        {selectedTemplate.variables.map(v => (
                          <div key={v}>
                            <label className="text-xs text-muted-foreground">{`{{${v}}}`}</label>
                            <Input
                              placeholder={v}
                              value={templateValues[v] || ''}
                              onChange={e => setTemplateValues(prev => ({ ...prev, [v]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                      <div className="bg-[hsl(142,70%,45%)]/10 rounded-2xl p-4 text-sm whitespace-pre-wrap border border-[hsl(142,70%,45%)]/20">
                        {previewMessage}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Enviar para:</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="258 84 XXX XXXX"
                            value={customPhone}
                            onChange={e => setCustomPhone(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button onClick={handleSendWhatsApp} className="gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)]">
                          <ExternalLink className="h-4 w-4" /> Enviar
                        </Button>
                      </div>
                    </div>

                    <Button variant="outline" onClick={handleCopyMessage} className="w-full gap-2">
                      <Copy className="h-4 w-4" /> Copiar Mensagem
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                    <p>Selecione um template à esquerda para começar</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Leads WhatsApp</CardTitle>
                  <CardDescription>Gerencie contactos e pipeline de vendas</CardDescription>
                </div>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Lead
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={searchLead}
                    onChange={e => setSearchLead(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="hot">🔥 Quentes</SelectItem>
                    <SelectItem value="warm">⚡ Mornos</SelectItem>
                    <SelectItem value="cold">❄️ Frios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{lead.name}</span>
                        <span className="text-xs">{getLeadStatusLabel(lead.status)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
                        <span>{lead.messagesCount} msgs</span>
                        <span>Último: {lead.lastContact}</span>
                      </div>
                      {lead.notes && <p className="text-xs text-muted-foreground mt-1 italic">{lead.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const url = buildWhatsAppUrl(lead.phone, `Olá ${lead.name}! `);
                          window.open(url, '_blank');
                        }}
                      >
                        <MessageCircle className="h-4 w-4 text-[hsl(142,70%,45%)]" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setActiveTab('templates');
                          setCustomPhone(lead.phone);
                          toast.info('Selecione um template para enviar.');
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Automated Flows */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Fluxos Automáticos
                </CardTitle>
                <CardDescription>Sequências de mensagens programadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Boas-vindas a novo lead', steps: 3, status: 'active' },
                  { name: 'Follow-up após 48h', steps: 2, status: 'active' },
                  { name: 'Carrinho abandonado', steps: 2, status: 'active' },
                  { name: 'Oferta semanal', steps: 1, status: 'paused' },
                  { name: 'Resumo mensal para criadores', steps: 1, status: 'draft' },
                ].map(flow => (
                  <div key={flow.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{flow.name}</p>
                      <p className="text-xs text-muted-foreground">{flow.steps} etapa{flow.steps > 1 ? 's' : ''}</p>
                    </div>
                    <Badge variant={flow.status === 'active' ? 'default' : flow.status === 'paused' ? 'secondary' : 'outline'}>
                      {flow.status === 'active' ? '✅ Ativo' : flow.status === 'paused' ? '⏸️ Pausado' : '📝 Rascunho'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Broadcast lists */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-[hsl(142,70%,45%)]" />
                  Listas de Transmissão
                </CardTitle>
                <CardDescription>Envie mensagens em massa segmentadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Todos os Compradores', count: 45, lastSent: '2026-04-04' },
                  { name: 'Criadores Ativos', count: 28, lastSent: '2026-04-02' },
                  { name: 'Leads Quentes', count: 12, lastSent: '2026-04-05' },
                  { name: 'Restaurantes & Revendas', count: 18, lastSent: '2026-03-30' },
                ].map(list => (
                  <div key={list.name} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{list.name}</p>
                      <p className="text-xs text-muted-foreground">{list.count} contactos · Último envio: {list.lastSent}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Send className="h-3 w-3" /> Enviar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Campaign metrics */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Métricas de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Mensagens Enviadas', value: '1.247', change: '+18%' },
                    { label: 'Taxa de Resposta', value: '62%', change: '+5%' },
                    { label: 'Leads Convertidos', value: '34', change: '+12%' },
                    { label: 'Receita via WhatsApp', value: '245.000 MT', change: '+22%' },
                  ].map(m => (
                    <div key={m.label} className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{m.value}</p>
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <span className="text-xs font-medium text-[hsl(142,70%,45%)]">{m.change}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppAutomationPage;
