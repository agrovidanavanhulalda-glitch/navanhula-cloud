import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Truck, Plus, Phone, UserCheck, UserX, Search, Pencil, Package } from 'lucide-react';

interface Driver {
  id: string;
  nome: string;
  telefone: string | null;
  status: string;
  created_at: string;
  total_entregas: number;
  entregas_concluidas: number;
}

const DriversPage: React.FC = () => {
  const { company } = useAuth();
  const companyId = company?.id;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [deactivateTarget, setDeactivateTarget] = useState<Driver | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (companyId) fetchDrivers();
  }, [companyId]);

  const fetchDrivers = async () => {
    setLoading(true);
    // Fetch drivers
    const { data: driversData, error } = await supabase
      .from('delivery_drivers')
      .select('*')
      .eq('company_id', companyId!)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar entregadores');
      setLoading(false);
      return;
    }

    // Fetch delivery counts from agro_orders
    const { data: ordersData } = await supabase
      .from('agro_orders')
      .select('driver_id, delivery_status')
      .eq('company_id', companyId!)
      .not('driver_id', 'is', null);

    const countMap: Record<string, { total: number; concluidas: number }> = {};
    (ordersData || []).forEach((o: any) => {
      if (!o.driver_id) return;
      if (!countMap[o.driver_id]) countMap[o.driver_id] = { total: 0, concluidas: 0 };
      countMap[o.driver_id].total++;
      if (o.delivery_status === 'entregue') countMap[o.driver_id].concluidas++;
    });

    const enriched: Driver[] = ((driversData as any[]) || []).map(d => ({
      ...d,
      total_entregas: countMap[d.id]?.total || 0,
      entregas_concluidas: countMap[d.id]?.concluidas || 0,
    }));

    setDrivers(enriched);
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingDriver(null);
    setNome('');
    setTelefone('');
    setDialogOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setNome(driver.nome);
    setTelefone(driver.telefone || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!telefone.trim()) { toast.error('Telefone é obrigatório'); return; }
    setSaving(true);

    if (editingDriver) {
      const { error } = await supabase
        .from('delivery_drivers')
        .update({ nome: nome.trim(), telefone: telefone.trim() } as any)
        .eq('id', editingDriver.id);
      if (error) toast.error('Erro ao atualizar entregador');
      else { toast.success('Entregador atualizado!'); setDialogOpen(false); fetchDrivers(); }
    } else {
      const { error } = await supabase
        .from('delivery_drivers')
        .insert({ nome: nome.trim(), telefone: telefone.trim(), company_id: companyId! } as any);
      if (error) toast.error('Erro ao criar entregador');
      else { toast.success('Entregador criado!'); setDialogOpen(false); fetchDrivers(); }
    }
    setSaving(false);
  };

  const handleToggleStatus = async (driver: Driver) => {
    const newStatus = driver.status === 'disponivel' ? 'inativo' : 'disponivel';

    // If deactivating and has active orders, block
    if (newStatus === 'inativo' && driver.total_entregas > driver.entregas_concluidas) {
      // Check if there are non-completed orders
      const { data: activeOrders } = await supabase
        .from('agro_orders')
        .select('id')
        .eq('driver_id', driver.id)
        .not('delivery_status', 'eq', 'entregue')
        .not('status', 'eq', 'cancelado')
        .limit(1);

      if (activeOrders && activeOrders.length > 0) {
        toast.error('Este entregador possui pedidos em andamento. Conclua ou reatribua antes de desativar.');
        return;
      }
    }

    if (newStatus === 'inativo') {
      setDeactivateTarget(driver);
      return;
    }

    await updateStatus(driver.id, newStatus);
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    await updateStatus(deactivateTarget.id, 'inativo');
    setDeactivateTarget(null);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ status: newStatus } as any)
      .eq('id', id);
    if (error) toast.error('Erro ao atualizar status');
    else { toast.success('Status atualizado'); fetchDrivers(); }
  };

  const filtered = useMemo(() => {
    return drivers.filter(d => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (searchQuery && !d.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [drivers, statusFilter, searchQuery]);

  const available = drivers.filter(d => d.status === 'disponivel').length;
  const delivering = drivers.filter(d => d.status === 'em_entrega').length;
  const inactive = drivers.filter(d => d.status === 'inativo').length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-primary" /> Entregadores
          </h1>
          <p className="text-sm text-muted-foreground">Gestão da equipa de entregas</p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1">
          <Plus className="w-4 h-4" /> Novo Entregador
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{inactive}</p>
          <p className="text-xs text-muted-foreground">Inativos</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="disponivel">Disponíveis</SelectItem>
            <SelectItem value="em_entrega">Em Entrega</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground">
              <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum entregador encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Entregas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => {
                  const statusBadge = d.status === 'disponivel'
                    ? { label: 'Disponível', variant: 'default' as const }
                    : d.status === 'em_entrega'
                    ? { label: 'Em Entrega', variant: 'secondary' as const }
                    : { label: 'Inativo', variant: 'destructive' as const };

                  return (
                    <TableRow key={d.id} className={d.status === 'inativo' ? 'opacity-60' : ''}>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell>
                        {d.telefone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" /> {d.telefone}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="flex items-center justify-center gap-1 text-sm">
                          <Package className="w-3 h-3 text-muted-foreground" />
                          {d.entregas_concluidas}/{d.total_entregas}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(d)} className="gap-1">
                            <Pencil className="w-3 h-3" /> Editar
                          </Button>
                          {d.status !== 'inativo' ? (
                            <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleToggleStatus(d)}>
                              <UserX className="w-3 h-3" /> Desativar
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleToggleStatus(d)}>
                              <UserCheck className="w-3 h-3" /> Ativar
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Entregador' : 'Novo Entregador'}</DialogTitle>
            <DialogDescription>
              {editingDriver ? 'Atualize os dados do entregador.' : 'Preencha os dados para adicionar um entregador.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+258 84..." />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingDriver ? 'Guardar Alterações' : 'Criar Entregador'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar entregador?</AlertDialogTitle>
            <AlertDialogDescription>
              O entregador "{deactivateTarget?.nome}" será marcado como inativo e não poderá receber novos pedidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeactivate}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriversPage;
