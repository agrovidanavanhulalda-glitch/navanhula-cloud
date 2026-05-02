import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  created_at: string;
  company_id: string;
  metadata: any;
}

const AuditLogList: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar logs..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell>
              </TableRow>
            ) : filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">
                  {new Date(log.created_at).toLocaleString('pt-MZ')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {log.entity_type || '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                  {log.metadata ? JSON.stringify(log.metadata) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AuditLogList;
