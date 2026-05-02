import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Unlock, Building2, Users, Package, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface BranchRow {
  id: string;
  name: string;
  company_type: string;
  city: string | null;
  is_active: boolean;
  total_users: number;
  total_stores: number;
  total_revenue: number;
  total_stock: number;
  created_at: string;
}

interface Props {
  branches: BranchRow[];
  onRefresh: () => void;
}

const BranchListTable: React.FC<Props> = ({ branches, onRefresh }) => {
  const { refreshUserData } = useAuth();
  const navigate = useNavigate();

  const toggleStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !active })
        .eq('id', id);

      if (error) throw error;
      toast.success(active ? 'Empresa bloqueada' : 'Empresa desbloqueada');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
    }
  };

  const impersonate = async (companyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ company_id: companyId })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('A entrar como empresa...');
      await refreshUserData();
      navigate('/app/dashboard');
    } catch (err: any) {
      toast.error('Erro ao impersonar: ' + err.message);
    }
  };

  if (branches.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhuma filial ou cliente registrado</p>
        <p className="text-sm mt-1">Crie a primeira filial usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="font-bold text-[#0B3C5D]">Nome</TableHead>
            <TableHead className="hidden sm:table-cell font-bold text-[#0B3C5D]">Tipo</TableHead>
            <TableHead className="hidden md:table-cell font-bold text-[#0B3C5D]">Cidade</TableHead>
            <TableHead className="text-right font-bold text-[#0B3C5D]">Receita Mensal</TableHead>
            <TableHead className="text-right hidden sm:table-cell font-bold text-[#0B3C5D]">Stock</TableHead>
            <TableHead className="text-right hidden md:table-cell font-bold text-[#0B3C5D]">Usuários</TableHead>
            <TableHead className="font-bold text-[#0B3C5D]">Status</TableHead>
            <TableHead className="text-right font-bold text-[#0B3C5D]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map(b => (
            <TableRow key={b.id} className="hover:bg-primary/5 transition-colors">
              <TableCell className="font-semibold text-[#0B3C5D]">{b.name}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={b.company_type === 'branch' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                  {b.company_type === 'branch' ? 'Filial' : 'Cliente'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{b.city || '—'}</TableCell>
              <TableCell className="text-right font-bold text-[#1E5A8A]">{formatCurrency(b.total_revenue)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                <span className="flex items-center justify-end gap-1.5 text-sm">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" /> {b.total_stock}
                </span>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                <span className="flex items-center justify-end gap-1.5 text-sm">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" /> {b.total_users}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={b.is_active ? 'default' : 'destructive'} className="text-[9px] h-5">
                  {b.is_active ? 'ATIVO' : 'BLOQUEADO'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs gap-1 hover:bg-primary hover:text-white"
                    onClick={() => impersonate(b.id)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Entrar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleStatus(b.id, b.is_active)}
                    title={b.is_active ? 'Bloquear' : 'Desbloquear'}
                  >
                    {b.is_active ? <Lock className="w-4 h-4 text-destructive" /> : <Unlock className="w-4 h-4 text-success" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BranchListTable;
