import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, TrendingUp, Target, ArrowRight, Phone, Mail, Building2, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  contacted: { label: 'Contactado', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  demo: { label: 'Demonstração', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  converted: { label: 'Convertido', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  lost: { label: 'Perdido', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const PIPELINE_STAGES = ['new', 'contacted', 'demo', 'converted'];

const LeadsPipelinePage: React.FC = () => {
  const { company } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [form, setForm] = useState({ name: '', business_name: '', phone: '', email: '', notes: '' });

  const fetchLeads = useCallback(async () => {
    if (!company?.id) return;
    const sb = supabase as any;
    const { data } = await sb
      .from('leads')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleCreate = async () => {
    if (!form.name.trim() || !company?.id) return;
    const { error } = await (supabase as any).from('leads').insert({
      company_id: company.id,
      name: form.name.trim(),
      business_name: form.business_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (error) { toast.error('Erro ao criar lead'); return; }
    toast.success('Lead adicionado!');
    setForm({ name: '', business_name: '', phone: '', email: '', notes: '' });
    setShowForm(false);
    fetchLeads();
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: Record<string, any> = { status };
    if (status === 'converted') updates.converted_at = new Date().toISOString();
    await (supabase as any).from('leads').update(updates).eq('id', id);
    fetchLeads();
    toast.success(`Status atualizado para ${STATUS_CONFIG[status]?.label}`);
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.business_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    converted: leads.filter(l => l.status === 'converted').length,
    rate: leads.length ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline de Vendas</h1>
          <p className="text-sm text-muted-foreground">Gerir leads e converter clientes</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Lead</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do contacto" /></div>
              <div><Label>Empresa</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="Nome da empresa" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+258..." /></div>
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." /></div>
              </div>
              <div><Label>Notas</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
              <Button onClick={handleCreate} className="w-full" disabled={!form.name.trim()}>Adicionar Lead</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-bold text-foreground">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Novos</p><p className="text-2xl font-bold text-primary">{stats.new}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Convertidos</p><p className="text-2xl font-bold text-[hsl(var(--success))]">{stats.converted}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Taxa Conversão</p><p className="text-2xl font-bold text-foreground">{stats.rate}%</p></Card>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Funil</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>

        {/* Pipeline View */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {PIPELINE_STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.status === stage);
              const cfg = STATUS_CONFIG[stage];
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                    <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30 border border-border">
                    {stageLeads.map(lead => (
                      <Card key={lead.id} className="p-3 space-y-2 cursor-pointer hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm text-foreground truncate">{lead.name}</p>
                          <a 
                            href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}?text=Olá%20${encodeURIComponent(lead.name)},%20falo%20da%20NAVANHULA%20CLOUD...`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-green-100 rounded text-green-600"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {lead.business_name && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.business_name}</p>}
                        {lead.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</p>}
                        
                        <div className="flex gap-2 pt-1">
                          {stage !== 'converted' && (
                            <Button size="sm" variant="outline" className="flex-1 text-[10px] gap-1 h-6 px-1"
                              onClick={() => updateStatus(lead.id, PIPELINE_STAGES[PIPELINE_STAGES.indexOf(stage) + 1])}>
                              Avançar <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-[10px] h-6 px-1 text-destructive"
                            onClick={() => updateStatus(lead.id, 'lost')}>
                            Perder
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Pesquisar leads..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            {filtered.map(lead => (
              <Card key={lead.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{lead.name}</p>
                    <Badge className={`text-[10px] px-1.5 h-4 ${STATUS_CONFIG[lead.status]?.color}`}>{STATUS_CONFIG[lead.status]?.label}</Badge>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {lead.business_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{lead.business_name}</span>}
                    {lead.phone && (
                      <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-green-600 transition-colors">
                        <Phone className="w-3 h-3" />{lead.phone}
                      </a>
                    )}
                    {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" asChild>
                    <a href={`https://wa.me/${lead.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="w-4 h-4" />
                    </a>
                  </Button>
                  <Select value={lead.status} onValueChange={v => updateStatus(lead.id, v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhum lead encontrado</p>
                <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Adicionar Lead</Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeadsPipelinePage;
