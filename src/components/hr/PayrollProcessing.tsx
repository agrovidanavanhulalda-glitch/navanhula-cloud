import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calculator, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Employee {
  id: string;
  full_name: string;
  base_salary: number;
  position: string;
  department: string;
  status: string;
}

interface PayrollRun {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  overtime_amount: number;
  bonus_amount: number;
  gross_salary: number;
  inss_employee: number;
  inss_employer: number;
  irps_amount: number;
  other_deductions: number;
  net_salary: number;
  total_cost: number;
  status: string;
  paid_at: string | null;
}

// Mozambique IRPS brackets (2024 simplified)
const calculateIRPS = (grossSalary: number, inssEmployee: number): number => {
  const taxableIncome = grossSalary - inssEmployee;
  if (taxableIncome <= 42000) return 0;
  if (taxableIncome <= 168000) return (taxableIncome - 42000) * 0.10;
  if (taxableIncome <= 504000) return 12600 + (taxableIncome - 168000) * 0.15;
  if (taxableIncome <= 1512000) return 63000 + (taxableIncome - 504000) * 0.20;
  return 264600 + (taxableIncome - 1512000) * 0.32;
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const PayrollProcessing: React.FC = () => {
  const { company, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    setLoading(true);
    const [empRes, payRes] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'active').order('full_name'),
      supabase.from('payroll_runs').select('*').eq('period_month', selectedMonth).eq('period_year', selectedYear).order('created_at', { ascending: false })
    ]);
    if (!empRes.error) setEmployees((empRes.data as unknown as Employee[]) || []);
    if (!payRes.error) setPayrollRuns((payRes.data as unknown as PayrollRun[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedMonth, selectedYear]);

  const processPayroll = async () => {
    if (!company || !user) return;
    setProcessing(true);

    try {
      const existingIds = new Set(payrollRuns.map(p => p.employee_id));
      const toProcess = employees.filter(e => !existingIds.has(e.id));

      if (toProcess.length === 0) {
        toast.info('Folha já processada para todos os funcionários neste período');
        setProcessing(false);
        return;
      }

      const records = toProcess.map(emp => {
        const grossSalary = emp.base_salary;
        const inssEmployee = grossSalary * 0.04; // 4% employee
        const inssEmployer = grossSalary * 0.03; // 3% employer
        const irps = calculateIRPS(grossSalary, inssEmployee);
        const netSalary = grossSalary - inssEmployee - irps;
        const totalCost = grossSalary + inssEmployer;

        return {
          company_id: company.id,
          employee_id: emp.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          base_salary: emp.base_salary,
          overtime_amount: 0,
          bonus_amount: 0,
          gross_salary: grossSalary,
          inss_employee: inssEmployee,
          inss_employer: inssEmployer,
          irps_amount: irps,
          other_deductions: 0,
          net_salary: netSalary,
          total_cost: totalCost,
          status: 'draft',
          created_by: user.id,
        };
      });

      const { error } = await supabase.from('payroll_runs').insert(records as any);
      if (error) throw error;
      toast.success(`Folha processada para ${records.length} funcionários`);
      loadData();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase.from('payroll_runs').update({ status: 'paid', paid_at: new Date().toISOString() } as any).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marcado como pago');
    loadData();
  };

  const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const totalNet = payrollRuns.reduce((s, p) => s + Number(p.net_salary), 0);
  const totalINSS = payrollRuns.reduce((s, p) => s + Number(p.inss_employee) + Number(p.inss_employer), 0);
  const totalIRPS = payrollRuns.reduce((s, p) => s + Number(p.irps_amount), 0);
  const totalCost = payrollRuns.reduce((s, p) => s + Number(p.total_cost), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Processamento de Salários</h3>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={processPayroll} disabled={processing || employees.length === 0}>
            <Calculator className="w-4 h-4 mr-2" /> {processing ? 'Processando...' : 'Processar Folha'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Salários Líquidos</p><p className="text-xl font-bold text-primary">{formatCurrency(totalNet)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">INSS Total (7%)</p><p className="text-xl font-bold text-warning">{formatCurrency(totalINSS)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">IRPS Total</p><p className="text-xl font-bold text-warning">{formatCurrency(totalIRPS)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo Total Empresa</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalCost)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Funcionário</th>
                  <th className="text-right p-3">Bruto</th>
                  <th className="text-right p-3">INSS (4%)</th>
                  <th className="text-right p-3">IRPS</th>
                  <th className="text-right p-3">Líquido</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Acção</th>
                </tr>
              </thead>
              <tbody>
                {payrollRuns.map(p => {
                  const emp = employeeMap[p.employee_id];
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 font-medium">{emp?.full_name || 'N/A'}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(p.gross_salary)}</td>
                      <td className="p-3 text-right font-mono text-warning">{formatCurrency(p.inss_employee)}</td>
                      <td className="p-3 text-right font-mono text-warning">{formatCurrency(p.irps_amount)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatCurrency(p.net_salary)}</td>
                      <td className="p-3 text-center">
                        <Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>
                          {p.status === 'paid' ? 'Pago' : 'Rascunho'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        {p.status !== 'paid' && (
                          <Button variant="ghost" size="sm" onClick={() => markAsPaid(p.id)}>
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payrollRuns.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhuma folha processada para {MONTHS[selectedMonth - 1]} {selectedYear}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Referência Legal - Moçambique</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">INSS (Segurança Social)</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Contribuição do Trabalhador: 4%</li>
                <li>Contribuição da Entidade Patronal: 3%</li>
                <li>Total: 7% sobre o salário bruto</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">IRPS (Imposto s/ Rendimento)</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                <li>Até 42.000 MT: Isento</li>
                <li>42.001 – 168.000 MT: 10%</li>
                <li>168.001 – 504.000 MT: 15%</li>
                <li>504.001 – 1.512.000 MT: 20%</li>
                <li>Acima de 1.512.000 MT: 32%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PayrollProcessing;
