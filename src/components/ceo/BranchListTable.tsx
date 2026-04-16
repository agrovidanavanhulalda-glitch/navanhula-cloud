import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lock, Unlock, Building2, Users, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const toggleStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await (supabase as any).rpc('toggle_company_status', {
        p_company_id: id,
        p_active: !active,
      });
      if (error) throw error;
      toast.success(active ? 'Empresa bloqueada' : 'Empresa desbloqueada');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erro');
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
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Cidade</TableHead>
            <TableHead className="text-right">Receita Mensal</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Stock</TableHead>
            <TableHead className="text-right hidden md:table-cell">Usuários</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {branches.map(b => (
            <TableRow key={b.id}>
              <TableCell className="font-medium">{b.name}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant={b.company_type === 'branch' ? 'default' : 'secondary'}>
                  {b.company_type === 'branch' ? 'Filial' : 'Cliente'}
                </Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{b.city || '—'}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(b.total_revenue)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <Package className="w-3 h-3 text-muted-foreground" /> {b.total_stock}
                </span>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                <span className="flex items-center justify-end gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" /> {b.total_users}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={b.is_active ? 'default' : 'destructive'} className="text-[10px]">
                  {b.is_active ? 'Ativo' : 'Bloqueado'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleStatus(b.id, b.is_active)}
                  title={b.is_active ? 'Bloquear' : 'Desbloquear'}
                >
                  {b.is_active ? <Lock className="w-4 h-4 text-destructive" /> : <Unlock className="w-4 h-4 text-success" />}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default BranchListTable;
