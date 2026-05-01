import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
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
import { FileText, Download, Calendar } from 'lucide-react';
import { PermissionGate } from '@/components/auth/PermissionGate';
import PlanGate from '@/components/monetization/PlanGate';
import { formatCurrency } from '@/lib/formatters';

const TaxReportsPage = () => {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState({ start: '', end: '', type: 'monthly' });

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['tax-reports', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_reports')
        .select('*')
        .eq('company_id', companyId!)
        .order('period_end', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const generate = async () => {
    if (!period.start || !period.end) {
      toast.error('Selecione o período');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_tax_report', {
        p_company_id: companyId!,
        p_start: period.start,
        p_end: period.end,
        p_type: period.type,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tax-reports'] });
      toast.success(`Relatório gerado! Receita: ${formatCurrency((data as any)?.sales || 0)}`);
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'secondary',
    submitted: 'default',
    approved: 'default',
  };

  return (
    <PlanGate module="fiscal">
      <PermissionGate module="finance">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Relatórios Fiscais</h1>
              <p className="text-sm text-muted-foreground">Conformidade tributária e relatórios para governo</p>
            </div>
          </div>

          {/* Generate Report */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Gerar Relatório</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div><Label>Data Início</Label><Input type="date" value={period.start} onChange={e => setPeriod({ ...period, start: e.target.value })} /></div>
                <div><Label>Data Fim</Label><Input type="date" value={period.end} onChange={e => setPeriod({ ...period, end: e.target.value })} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={period.type} onValueChange={v => setPeriod({ ...period, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={generate} disabled={generating} className="gap-2">
                  <FileText className="w-4 h-4" /> {generating ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Reports List */}
          <Card>
            <CardHeader><CardTitle>Relatórios Gerados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Impostos</TableHead>
                    <TableHead>Despesas</TableHead>
                    <TableHead>Resultado Líquido</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center">Carregando...</TableCell></TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum relatório gerado</TableCell></TableRow>
                  ) : reports.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">
                        {new Date(r.period_start).toLocaleDateString('pt-MZ')} - {new Date(r.period_end).toLocaleDateString('pt-MZ')}
                      </TableCell>
                      <TableCell><Badge variant="outline">{r.report_type}</Badge></TableCell>
                      <TableCell className="font-medium">{formatCurrency(r.total_sales)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(r.total_tax)}</TableCell>
                      <TableCell>{formatCurrency(r.total_expenses)}</TableCell>
                      <TableCell className={r.net_result >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>
                        {formatCurrency(r.net_result)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[r.status] as any || 'secondary'}>
                          {r.status === 'draft' ? 'Rascunho' : r.status === 'submitted' ? 'Submetido' : 'Aprovado'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </PlanGate>
  );
};

export default TaxReportsPage;
