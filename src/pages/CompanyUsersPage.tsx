import React, { useState } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, Plus, Building2, Shield } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';

const CompanyUsersPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ user_id: '', role: 'seller' });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_users')
        .select('*, profiles:user_id(full_name, email)')
        .eq('company_id', companyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('company_users').insert({
        company_id: companyId!,
        user_id: form.user_id,
        role: form.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users'] });
      setShowAdd(false);
      toast.success('Membro adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar membro'),
  });

  const roleLabels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    manager: 'Gestor',
    seller: 'Vendedor',
    accountant: 'Contabilista',
  };

  const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    owner: 'destructive',
    admin: 'default',
    manager: 'secondary',
    seller: 'outline',
    accountant: 'secondary',
  };

  return (
    <PermissionGate module="settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Equipa da Empresa</h1>
            <p className="text-sm text-muted-foreground">Gerir utilizadores e permissões multi-empresa</p>
          </div>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Adicionar Membro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>ID do Utilizador</Label><Input value={form.user_id} onChange={e => setForm({ ...form, user_id: e.target.value })} placeholder="UUID do utilizador" /></div>
                <div>
                  <Label>Cargo</Label>
                  <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gestor</SelectItem>
                      <SelectItem value="seller">Vendedor</SelectItem>
                      <SelectItem value="accountant">Contabilista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => addMember.mutate()} disabled={!form.user_id}>Adicionar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">Total Membros</p><p className="text-2xl font-bold">{members.length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">Administradores</p><p className="text-2xl font-bold">{members.filter((m: any) => m.role === 'admin' || m.role === 'owner').length}</p></div>
          </CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">Empresa</p><p className="text-lg font-bold truncate">{company?.name}</p></div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Membros</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
                ) : members.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum membro encontrado</TableCell></TableRow>
                ) : members.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{(m as any).profiles?.full_name || '-'}</TableCell>
                    <TableCell className="text-sm">{(m as any).profiles?.email || '-'}</TableCell>
                    <TableCell><Badge variant={roleBadgeVariant[m.role] || 'outline'}>{roleLabels[m.role] || m.role}</Badge></TableCell>
                    <TableCell><Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status === 'active' ? 'Ativo' : m.status}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString('pt-MZ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PermissionGate>
  );
};

export default CompanyUsersPage;
