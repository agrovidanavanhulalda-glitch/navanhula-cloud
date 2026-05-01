import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Package, ArrowRightLeft, CheckCircle, XCircle, Clock, Search,
  Building2, Send, RefreshCw, Eye,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/formatters';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
};

// ─── Global Stock Tab ───────────────────────────────────────
function GlobalStockTab({ userId }: { userId: string }) {
  const [search, setSearch] = useState('');

  const { data: stockSummary = [], isLoading } = useQuery({
    queryKey: ['global-stock-summary', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_global_stock_summary', { p_user_id: userId });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });

  const filtered = stockSummary.filter((s: any) =>
    s.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.product_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = stockSummary.reduce((acc: number, s: any) => acc + Number(s.total_value || 0), 0);
  const totalItems = stockSummary.reduce((acc: number, s: any) => acc + Number(s.total_quantity || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Produtos Únicos</p>
          <p className="text-2xl font-bold">{stockSummary.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total em Estoque</p>
          <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Valor Global (Custo)</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-right">Qtd Total</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Filiais</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
            ) : filtered.map((item: any) => (
              <TableRow key={item.product_id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{item.product_code}</TableCell>
                <TableCell className="text-right font-bold">{Number(item.total_quantity).toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(item.total_value))}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">{item.branch_count}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ─── Transfers Tab ──────────────────────────────────────────
function BranchTransfersTab({ userId, companyId, isMaster }: { userId: string; companyId: string; isMaster: boolean }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [toCompanyId, setToCompanyId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  // Load companies for transfer target
  const { data: companies = [] } = useQuery({
    queryKey: ['branch-companies', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, company_type')
        .neq('id', companyId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: isMaster,
  });

  // Load products
  const { data: products = [] } = useQuery({
    queryKey: ['transfer-products', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, code, cost_price')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Load transfers
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['branch-stock-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_stock_transfers')
        .select('*, from_company:from_company_id(name), to_company:to_company_id(name), product:product_id(name, code)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const createTransfer = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity);
      if (!toCompanyId || !productId || isNaN(qty) || qty <= 0) throw new Error('Preencha todos os campos');
      const prod = products.find((p: any) => p.id === productId);
      const { error } = await supabase.from('branch_stock_transfers').insert({
        from_company_id: companyId,
        to_company_id: toCompanyId,
        product_id: productId,
        quantity: qty,
        unit_cost: prod?.cost_price || 0,
        requested_by: userId,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transferência criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['branch-stock-transfers'] });
      setShowDialog(false);
      setToCompanyId('');
      setProductId('');
      setQuantity('');
      setNotes('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const confirmTransfer = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const { data, error } = await supabase.rpc('confirm_branch_transfer', {
        p_transfer_id: id,
        p_action: action,
        p_user_id: userId,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.message || 'Erro');
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'confirmed' ? 'Transferência confirmada' : 'Transferência rejeitada');
      queryClient.invalidateQueries({ queryKey: ['branch-stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['global-stock-summary'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pendingCount = transfers.filter((t: any) => t.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {isMaster && (
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Send className="w-4 h-4 mr-1" /> Nova Transferência
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
        ) : transfers.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-50" />
            Nenhuma transferência entre filiais
          </CardContent></Card>
        ) : transfers.map((t: any) => {
          const st = statusMap[t.status] || statusMap.pending;
          const canAction = t.status === 'pending' && (
            isMaster || t.to_company_id === companyId
          );
          return (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {canAction && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => confirmTransfer.mutate({ id: t.id, action: 'confirmed' })}
                        disabled={confirmTransfer.isPending}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Confirmar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => confirmTransfer.mutate({ id: t.id, action: 'rejected' })}
                        disabled={confirmTransfer.isPending}>
                        <XCircle className="w-3 h-3 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{t.from_company?.name}</span>
                  <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{t.to_company?.name}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t.product?.name} ({t.product?.code}) — <span className="font-bold">{t.quantity}</span> unidades
                </div>
                {t.notes && <p className="text-xs text-muted-foreground mt-1">{t.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Transfer Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transferência entre Filiais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={toCompanyId} onValueChange={setToCompanyId}>
                <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} <span className="text-xs text-muted-foreground">({c.company_type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => createTransfer.mutate()} disabled={createTransfer.isPending}>
              {createTransfer.isPending ? 'Enviando...' : 'Enviar Transferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
const BranchInventoryPage: React.FC = () => {
  const { user, company } = useAuth();
  const isMaster = company?.is_system_owner === true || company?.company_type === 'master';

  if (!user || !company) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" />
          Estoque Multi-Filial
        </h1>
        <p className="text-muted-foreground">
          {isMaster ? 'Visão global consolidada de todas as filiais' : 'Transferências entre empresas'}
        </p>
      </div>

      <Tabs defaultValue={isMaster ? 'global' : 'transfers'}>
        <TabsList>
          {isMaster && <TabsTrigger value="global"><Eye className="w-4 h-4 mr-1" /> Estoque Global</TabsTrigger>}
          <TabsTrigger value="transfers"><ArrowRightLeft className="w-4 h-4 mr-1" /> Transferências</TabsTrigger>
        </TabsList>

        {isMaster && (
          <TabsContent value="global">
            <GlobalStockTab userId={user.id} />
          </TabsContent>
        )}

        <TabsContent value="transfers">
          <BranchTransfersTab
            userId={user.id}
            companyId={company.id}
            isMaster={isMaster}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BranchInventoryPage;
