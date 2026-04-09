import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Shield, Plus, FileUp, Trash2, Eye, AlertTriangle, Filter, MessageCircle, Bell } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ComplianceDashboard from '@/components/compliance/ComplianceDashboard';
import { format, differenceInDays, parseISO } from 'date-fns';
import { buildWhatsAppUrl } from '@/lib/whatsappTemplates';

interface Obligation {
  id: string;
  company_id: string;
  name: string;
  type: string;
  frequency: string;
  due_date: string;
  status: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface ObligationDoc {
  id: string;
  obligation_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  notes: string | null;
  created_at: string;
  expiration_date: string | null;
  alert_level: string | null;
}

const typeOptions = [
  { value: 'inss', label: 'INSS' },
  { value: 'imposto', label: 'Imposto' },
  { value: 'licenca', label: 'Licença' },
  { value: 'contrato', label: 'Contrato' },
];

const frequencyOptions = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'anual', label: 'Anual' },
  { value: 'unico', label: 'Único' },
];

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'pago', label: 'Pago' },
  { value: 'atrasado', label: 'Atrasado' },
];

const getStatusBadge = (status: string, dueDate: string) => {
  const days = differenceInDays(parseISO(dueDate), new Date());
  const effectiveStatus = status === 'pendente' && days < 0 ? 'atrasado' : status;

  switch (effectiveStatus) {
    case 'pago':
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Pago</Badge>;
    case 'atrasado':
      return <Badge variant="destructive">Atrasado</Badge>;
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Pendente</Badge>;
  }
};

const getDocExpirationBadge = (doc: ObligationDoc) => {
  if (!doc.expiration_date) return null;
  const days = differenceInDays(parseISO(doc.expiration_date), new Date());
  if (days <= 0) return <Badge variant="destructive" className="text-[10px] px-1.5">🔴 Expirado</Badge>;
  if (days <= 7) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 text-[10px] px-1.5">🟡 {days}d</Badge>;
  if (days <= 30) return <Badge className="bg-blue-500/15 text-blue-700 border-blue-200 text-[10px] px-1.5">⚠️ {days}d</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 text-[10px] px-1.5">🟢 Válido</Badge>;
};

const getAlertInfo = (dueDate: string, status: string) => {
  if (status === 'pago') return null;
  const days = differenceInDays(parseISO(dueDate), new Date());
  if (days < 0) return { text: `Atrasado ${Math.abs(days)} dias`, level: 'destructive' as const };
  if (days === 0) return { text: 'Vence hoje!', level: 'destructive' as const };
  if (days <= 3) return { text: `Vence em ${days} dias`, level: 'warning' as const };
  if (days <= 7) return { text: `Vence em ${days} dias`, level: 'info' as const };
  return null;
};

const CompliancePage: React.FC = () => {
  const { company, user } = useAuth();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [detailObligation, setDetailObligation] = useState<Obligation | null>(null);
  const [docs, setDocs] = useState<ObligationDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docExpirationDate, setDocExpirationDate] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterExpiration, setFilterExpiration] = useState('all');

  // Form state
  const [form, setForm] = useState({
    name: '', type: 'imposto', frequency: 'mensal', due_date: '', status: 'pendente', amount: 0, notes: '',
  });

  const fetchObligations = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('obligations')
      .select('*')
      .eq('company_id', company.id)
      .order('due_date', { ascending: true });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else setObligations((data as unknown as Obligation[]) || []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchObligations(); }, [fetchObligations]);

  const fetchDocs = useCallback(async (obligationId: string) => {
    const { data } = await supabase
      .from('obligation_documents')
      .select('*')
      .eq('obligation_id', obligationId)
      .order('created_at', { ascending: false });
    setDocs((data as unknown as ObligationDoc[]) || []);
  }, []);

  const handleSave = async () => {
    if (!company?.id || !form.name.trim() || !form.due_date) {
      toast({ title: 'Erro', description: 'Preencha nome e data de vencimento.', variant: 'destructive' });
      return;
    }
    if (editingObligation) {
      const { error } = await supabase.from('obligations').update({
        name: form.name.trim(), type: form.type, frequency: form.frequency,
        due_date: form.due_date, status: form.status, amount: form.amount,
        notes: form.notes || null, updated_at: new Date().toISOString(),
      }).eq('id', editingObligation.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Obrigação atualizada' });
    } else {
      const { error } = await supabase.from('obligations').insert({
        company_id: company.id, name: form.name.trim(), type: form.type,
        frequency: form.frequency, due_date: form.due_date, status: form.status,
        amount: form.amount, notes: form.notes || null, created_by: user?.id,
      });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Obrigação criada' });
    }
    setDialogOpen(false);
    setEditingObligation(null);
    resetForm();
    fetchObligations();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('obligations').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Obrigação removida' }); fetchObligations(); }
  };

  const handleUpload = async (file: File, obligationId: string) => {
    if (!company?.id) return;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authUser = authData.user;

    if (authError || !authUser) {
      toast({ title: 'Sessão expirada', description: 'Faça login para enviar documentos.', variant: 'destructive' });
      return;
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Tipo inválido', description: 'Apenas PDF, PNG e JPEG são permitidos.', variant: 'destructive' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Tamanho máximo: 50MB.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${company.id}/${year}/${month}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabase.storage.from('compliance_documents').upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) {
      console.error('STORAGE ERROR:', uploadError.message);
      toast({ title: 'Erro ao acessar documento', description: 'Não foi possível enviar o documento.', variant: 'destructive' });
      setUploading(false);
      return;
    }

    const insertData = {
      obligation_id: obligationId, company_id: company.id,
      file_url: path, file_name: file.name,
      file_type: file.type, uploaded_by: authUser.id,
      ...(docExpirationDate ? { expiration_date: docExpirationDate, alert_level: 'none' } : {}),
    };

    const { error } = await supabase.from('obligation_documents').insert(insertData as any);

    if (error) {
      console.error('DB ERROR:', error.message);
      await supabase.storage.from('compliance_documents').remove([path]);
      toast({ title: 'Erro ao registrar documento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Documento anexado com sucesso' });
      setDocExpirationDate('');
      fetchDocs(obligationId);
    }
    setUploading(false);
  };

  const handleViewDoc = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('compliance_documents')
      .createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) {
      toast({ title: 'Erro ao acessar documento', description: 'Documento indisponível.', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDeleteDoc = async (docId: string, obligationId: string) => {
    const { error } = await supabase.from('obligation_documents').delete().eq('id', docId);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Documento removido' }); fetchDocs(obligationId); }
  };

  const handleSendWhatsAppAlert = (doc: ObligationDoc) => {
    if (!doc.expiration_date) return;
    const days = differenceInDays(parseISO(doc.expiration_date), new Date());
    const statusText = days <= 0 ? 'EXPIRADO' : `expira em ${days} dias`;
    const message = `⚠️ Atenção: O documento "${doc.file_name}" da empresa ${company?.name || ''} está ${statusText}.\n\nData de expiração: ${format(parseISO(doc.expiration_date), 'dd/MM/yyyy')}\n\nAcesse o sistema para atualizar.`;
    
    // Open WhatsApp with prefilled message (user picks the contact)
    const url = buildWhatsAppUrl('', message);
    // wa.me without phone opens WhatsApp to pick contact
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRunAlertCheck = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/check-document-alerts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Verificação concluída', description: `${data.alerts_created} alertas gerados.` });
      } else {
        toast({ title: 'Erro', description: data.error || 'Falha na verificação', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível executar verificação.', variant: 'destructive' });
    }
  };

  const resetForm = () => setForm({ name: '', type: 'imposto', frequency: 'mensal', due_date: '', status: 'pendente', amount: 0, notes: '' });

  const openEdit = (ob: Obligation) => {
    setEditingObligation(ob);
    setForm({ name: ob.name, type: ob.type, frequency: ob.frequency, due_date: ob.due_date, status: ob.status, amount: ob.amount, notes: ob.notes || '' });
    setDialogOpen(true);
  };

  const openDetail = (ob: Obligation) => {
    setDetailObligation(ob);
    fetchDocs(ob.id);
  };

  const filtered = obligations.filter(ob => {
    if (filterType !== 'all' && ob.type !== filterType) return false;
    if (filterStatus !== 'all') {
      const days = differenceInDays(parseISO(ob.due_date), new Date());
      const effective = ob.status === 'pendente' && days < 0 ? 'atrasado' : ob.status;
      if (effective !== filterStatus) return false;
    }
    return true;
  });

  const stats = {
    total: obligations.length,
    pendentes: obligations.filter(o => o.status === 'pendente' && differenceInDays(parseISO(o.due_date), new Date()) >= 0).length,
    pagas: obligations.filter(o => o.status === 'pago').length,
    atrasadas: obligations.filter(o => o.status !== 'pago' && differenceInDays(parseISO(o.due_date), new Date()) < 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Hub</h1>
            <p className="text-sm text-muted-foreground">Gestão de obrigações legais e documentos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRunAlertCheck}>
            <Bell className="h-4 w-4 mr-2" />
            Verificar Alertas
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingObligation(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nova Obrigação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingObligation ? 'Editar Obrigação' : 'Nova Obrigação'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: INSS Abril" maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Frequência</Label>
                    <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{frequencyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Data de Vencimento *</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Valor (MT)</Label>
                    <Input type="number" min={0} value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingObligation(null); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSave}>{editingObligation ? 'Atualizar' : 'Criar'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.pendentes}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.pagas}</p>
          <p className="text-xs text-muted-foreground">Pagas</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <p className="text-2xl font-bold text-destructive">{stats.atrasadas}</p>
          <p className="text-xs text-muted-foreground">Atrasadas</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {typeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alerta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma obrigação encontrada</TableCell></TableRow>
              ) : filtered.map(ob => {
                const alert = getAlertInfo(ob.due_date, ob.status);
                return (
                  <TableRow key={ob.id}>
                    <TableCell className="font-medium">{ob.name}</TableCell>
                    <TableCell className="capitalize">{typeOptions.find(t => t.value === ob.type)?.label || ob.type}</TableCell>
                    <TableCell className="capitalize">{frequencyOptions.find(f => f.value === ob.frequency)?.label || ob.frequency}</TableCell>
                    <TableCell>{format(parseISO(ob.due_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{ob.amount > 0 ? `${ob.amount.toLocaleString('pt-MZ')} MT` : '-'}</TableCell>
                    <TableCell>{getStatusBadge(ob.status, ob.due_date)}</TableCell>
                    <TableCell>
                      {alert && (
                        <span className={`text-xs font-medium ${alert.level === 'destructive' ? 'text-destructive' : alert.level === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                          <AlertTriangle className="h-3 w-3 inline mr-1" />{alert.text}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openDetail(ob)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(ob)}>Editar</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover obrigação?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ob.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      {detailObligation && (
        <Dialog open={!!detailObligation} onOpenChange={() => setDetailObligation(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {detailObligation.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Tipo:</span> <span className="capitalize ml-1">{typeOptions.find(t => t.value === detailObligation.type)?.label}</span></div>
                <div><span className="text-muted-foreground">Frequência:</span> <span className="capitalize ml-1">{frequencyOptions.find(f => f.value === detailObligation.frequency)?.label}</span></div>
                <div><span className="text-muted-foreground">Vencimento:</span> <span className="ml-1">{format(parseISO(detailObligation.due_date), 'dd/MM/yyyy')}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="ml-1">{getStatusBadge(detailObligation.status, detailObligation.due_date)}</span></div>
                {detailObligation.amount > 0 && <div><span className="text-muted-foreground">Valor:</span> <span className="ml-1">{detailObligation.amount.toLocaleString('pt-MZ')} MT</span></div>}
              </div>
              {detailObligation.notes && <p className="text-sm text-muted-foreground border-t pt-3">{detailObligation.notes}</p>}

              {/* Documents section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Documentos Anexos</h4>
                </div>

                {/* Upload area with expiration date */}
                <div className="flex flex-wrap gap-2 items-end mb-3 p-3 rounded-md border border-dashed">
                  <div className="grid gap-1">
                    <Label className="text-xs text-muted-foreground">Data de expiração</Label>
                    <Input type="date" className="h-8 text-xs w-[150px]" value={docExpirationDate} onChange={e => setDocExpirationDate(e.target.value)} />
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], detailObligation.id); e.target.value = ''; }}
                    />
                    <Button size="sm" variant="outline" asChild disabled={uploading}>
                      <span><FileUp className="h-3 w-3 mr-1" />{uploading ? 'Enviando...' : 'Anexar'}</span>
                    </Button>
                  </label>
                </div>

                {docs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum documento anexado.</p>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <button onClick={() => handleViewDoc(doc.file_url)} className="text-primary hover:underline truncate max-w-[160px] text-left">{doc.file_name}</button>
                          {getDocExpirationBadge(doc)}
                        </div>
                        <div className="flex items-center gap-1">
                          {doc.expiration_date && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" title="Enviar alerta via WhatsApp" onClick={() => handleSendWhatsAppAlert(doc)}>
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">{format(parseISO(doc.created_at), 'dd/MM/yy')}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDeleteDoc(doc.id, detailObligation.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CompliancePage;
