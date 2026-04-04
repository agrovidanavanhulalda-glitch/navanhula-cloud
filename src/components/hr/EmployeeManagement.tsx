import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, UserPlus, Edit2, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Employee {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string;
  department: string;
  hire_date: string;
  termination_date: string | null;
  base_salary: number;
  commission_rate: number;
  inss_number: string | null;
  nuit: string | null;
  bank_name: string | null;
  bank_account: string | null;
  status: string;
  store_id: string | null;
}

const DEPARTMENTS = ['Operações', 'Vendas', 'Administração', 'Logística', 'Financeiro'];
const POSITIONS = ['Vendedor', 'Gerente', 'Caixa', 'Estoquista', 'Motorista', 'Contador', 'Auxiliar'];

const EmployeeManagement: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', position: 'Vendedor',
    department: 'Operações', hire_date: new Date().toISOString().split('T')[0],
    base_salary: '', commission_rate: '0', inss_number: '', nuit: '', bank_name: '', bank_account: ''
  });

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('full_name');
    if (!error) setEmployees((data as unknown as Employee[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadEmployees(); }, []);

  const resetForm = () => {
    setForm({ full_name: '', email: '', phone: '', position: 'Vendedor', department: 'Operações', hire_date: new Date().toISOString().split('T')[0], base_salary: '', commission_rate: '0', inss_number: '', nuit: '', bank_name: '', bank_account: '' });
    setEditingEmployee(null);
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      full_name: emp.full_name, email: emp.email || '', phone: emp.phone || '',
      position: emp.position, department: emp.department, hire_date: emp.hire_date,
      base_salary: String(emp.base_salary), commission_rate: String(emp.commission_rate || 0),
      inss_number: emp.inss_number || '',
      nuit: emp.nuit || '', bank_name: emp.bank_name || '', bank_account: emp.bank_account || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.base_salary) {
      toast.error('Nome e salário base são obrigatórios');
      return;
    }
    if (!company) return;

    const payload = {
      company_id: company.id,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
      position: form.position,
      department: form.department,
      hire_date: form.hire_date,
      base_salary: parseFloat(form.base_salary),
      commission_rate: parseFloat(form.commission_rate) || 0,
      inss_number: form.inss_number || null,
      nuit: form.nuit || null,
      bank_name: form.bank_name || null,
      bank_account: form.bank_account || null,
    };

    let error;
    if (editingEmployee) {
      ({ error } = await supabase.from('employees').update(payload as any).eq('id', editingEmployee.id));
    } else {
      ({ error } = await supabase.from('employees').insert(payload as any));
    }

    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success(editingEmployee ? 'Funcionário atualizado' : 'Funcionário adicionado');
    setDialogOpen(false);
    resetForm();
    loadEmployees();
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalPayroll = activeEmployees.reduce((s, e) => s + Number(e.base_salary), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Gestão de Funcionários</h3>
          <Badge variant="secondary">{activeEmployees.length} ativos</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="w-4 h-4 mr-2" /> Novo Funcionário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><Label>Salário Base (MT) *</Label><Input type="number" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Comissão (%)</Label><Input type="number" step="0.5" min="0" max="100" value={form.commission_rate} onChange={e => setForm(f => ({ ...f, commission_rate: e.target.value }))} placeholder="Ex: 5" /></div>
                <div><Label>Data de Admissão</Label><Input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cargo</Label>
                  <Select value={form.position} onValueChange={v => setForm(f => ({ ...f, position: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Departamento</Label>
                  <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nº INSS</Label><Input value={form.inss_number} onChange={e => setForm(f => ({ ...f, inss_number: e.target.value }))} /></div>
                <div><Label>NUIT</Label><Input value={form.nuit} onChange={e => setForm(f => ({ ...f, nuit: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>NUIT</Label><Input value={form.nuit} onChange={e => setForm(f => ({ ...f, nuit: e.target.value }))} /></div>
                <div><Label>Banco</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="Ex: BCI, Millennium" /></div>
              </div>
              <div><Label>Nº Conta Bancária</Label><Input value={form.bank_account} onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))} /></div>
              <Button onClick={handleSave} className="w-full mt-2">
                {editingEmployee ? 'Atualizar' : 'Adicionar'} Funcionário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Funcionários</p><p className="text-xl font-bold">{activeEmployees.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Folha Salarial</p><p className="text-xl font-bold text-primary">{formatCurrency(totalPayroll)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">INSS Empresa (3%)</p><p className="text-xl font-bold text-warning">{formatCurrency(totalPayroll * 0.03)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo Total Estimado</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalPayroll * 1.03)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Cargo</th>
                  <th className="text-left p-3">Departamento</th>
                  <th className="text-right p-3">Salário Base</th>
                  <th className="text-center p-3">Comissão</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Acções</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-medium">{emp.full_name}</td>
                    <td className="p-3">{emp.position}</td>
                    <td className="p-3">{emp.department}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(emp.base_salary)}</td>
                    <td className="p-3 text-center">
                      {emp.commission_rate > 0 ? (
                        <Badge variant="outline">{emp.commission_rate}%</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                        {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(emp)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum funcionário cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;
