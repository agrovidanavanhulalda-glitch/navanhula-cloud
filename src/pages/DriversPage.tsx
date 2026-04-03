import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Truck, Plus, Phone, UserCheck, UserX } from 'lucide-react';

interface Driver {
  id: string;
  nome: string;
  telefone: string | null;
  status: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  disponivel: { label: 'Disponível', variant: 'default' },
  em_entrega: { label: 'Em Entrega', variant: 'secondary' },
  inativo: { label: 'Inativo', variant: 'destructive' },
};

const DriversPage: React.FC = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (companyId) fetchDrivers();
  }, [companyId]);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar entregadores');
    } else {
      setDrivers((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('delivery_drivers')
      .insert({ nome: nome.trim(), telefone: telefone.trim() || null, company_id: companyId! } as any);

    if (error) {
      toast.error('Erro ao criar entregador');
    } else {
      toast.success('Entregador criado!');
      setNome(''); setTelefone(''); setDialogOpen(false);
      fetchDrivers();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ status: newStatus } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado');
      fetchDrivers();
    }
  };

  const available = drivers.filter(d => d.status === 'disponivel').length;
  const delivering = drivers.filter(d => d.status === 'em_entrega').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Entregadores
          </h1>
          <p className="text-sm text-muted-foreground">Gestão da equipa de entregas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1"><Plus className="w-4 h-4" /> Novo Entregador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar Entregador</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+258 84..." />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Entregador'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{drivers.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{available}</p>
          <p className="text-xs text-muted-foreground">Disponíveis</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{delivering}</p>
          <p className="text-xs text-muted-foreground">Em Entrega</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum entregador cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map(d => {
                  const s = statusMap[d.status] || statusMap.disponivel;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell>
                        {d.telefone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" /> {d.telefone}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {d.status !== 'disponivel' && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(d.id, 'disponivel')} className="gap-1">
                              <UserCheck className="w-3 h-3" /> Disponível
                            </Button>
                          )}
                          {d.status !== 'inativo' && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleStatusChange(d.id, 'inativo')}>
                              <UserX className="w-3 h-3" /> Inativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriversPage;
