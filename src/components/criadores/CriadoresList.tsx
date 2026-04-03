import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Search, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface Props {
  criadores: any[];
  isLoading: boolean;
  onEdit: (id: string) => void;
  onRefresh: () => void;
}

const CriadoresList: React.FC<Props> = ({ criadores, isLoading, onEdit, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterProvincia, setFilterProvincia] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');

  const filtered = criadores.filter(c => {
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.telefone?.includes(search);
    const matchProv = filterProvincia === 'all' || c.provincia === filterProvincia;
    const matchTipo = filterTipo === 'all' || c.tipo_producao === filterTipo;
    return matchSearch && matchProv && matchTipo;
  });

  const provincias = [...new Set(criadores.map(c => c.provincia).filter(Boolean))];

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('criadores' as any).delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover criador');
    } else {
      toast.success('Criador removido');
      onRefresh();
    }
  };

  const renderStars = (n: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  if (isLoading) {
    return <Card><CardContent className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lista de Criadores ({filtered.length})</CardTitle>
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterProvincia} onValueChange={setFilterProvincia}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Província" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {provincias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="corte">Corte</SelectItem>
              <SelectItem value="postura">Postura</SelectItem>
              <SelectItem value="misto">Misto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Província</TableHead>
              <TableHead>Capacidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Confiabilidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum criador encontrado</TableCell></TableRow>
            ) : filtered.map(c => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.telefone}</TableCell>
                <TableCell>{c.provincia || '-'}</TableCell>
                <TableCell>{c.capacidade?.toLocaleString() || 0}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{c.tipo_producao}</Badge></TableCell>
                <TableCell>{renderStars(c.confiabilidade || 0)}</TableCell>
                <TableCell>
                  <Badge variant={c.status === 'ativo' ? 'default' : 'secondary'} className="capitalize">{c.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(c.id)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover criador?</AlertDialogTitle>
                          <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(c.id)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CriadoresList;
