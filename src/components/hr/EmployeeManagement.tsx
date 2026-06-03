import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, UserPlus, Edit2, Users, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useTranslation } from '@/contexts/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

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
  access_level?: string;
}

const DEPARTMENTS = ['Operações', 'Vendas', 'Administração', 'Logística', 'Financeiro'];
const POSITIONS = ['Vendedor', 'Gerente', 'Caixa', 'Estoquista', 'Motorista', 'Contador', 'Auxiliar'];
const ACCESS_LEVELS = [
  { value: 'seller', labelKey: 'hr.employee.role_seller' },
  { value: 'manager', labelKey: 'hr.employee.role_manager' },
  { value: 'admin', labelKey: 'hr.employee.role_admin' }
];

const EmployeeManagement: React.FC = () => {
  const { company } = useAuth();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const employeeSchema = z.object({
    full_name: z.string().min(3, t('hr.employee.required')),
    base_salary: z.string().min(1, t('hr.employee.required')).refine((val) => !isNaN(Number(val)) && Number(val) > 0, t('hr.employee.required')),
    commission_rate: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100), '0-100%'),
    hire_date: z.string().min(1, t('hr.employee.required')),
    email: z.string().email(t('hr.employee.invalid_email')).optional().or(z.literal('')),
    phone: z.string().optional(),
    position: z.string().min(1, t('hr.employee.required')),
    department: z.string().min(1, t('hr.employee.required')),
    inss_number: z.string().optional(),
    nuit: z.string().optional().refine((val) => !val || /^\d{9}$/.test(val), t('hr.employee.invalid_nuit')),
    bank_name: z.string().optional(),
    bank_account: z.string().optional(),
    access_level: z.string().min(1, t('hr.employee.required')),
  });

  type EmployeeFormValues = z.infer<typeof employeeSchema>;

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      full_name: '',
      base_salary: '',
      commission_rate: '0',
      hire_date: new Date().toISOString().split('T')[0],
      email: '',
      phone: '',
      position: 'Vendedor',
      department: 'Operações',
      inss_number: '',
      nuit: '',
      bank_name: '',
      bank_account: '',
      access_level: 'seller',
    },
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

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    form.reset({
      full_name: emp.full_name,
      base_salary: String(emp.base_salary),
      commission_rate: String(emp.commission_rate || 0),
      hire_date: emp.hire_date,
      email: emp.email || '',
      phone: emp.phone || '',
      position: emp.position,
      department: emp.department,
      inss_number: emp.inss_number || '',
      nuit: emp.nuit || '',
      bank_name: emp.bank_name || '',
      bank_account: emp.bank_account || '',
      access_level: emp.access_level || 'seller',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    if (!company) return;

    const payload = {
      company_id: company.id,
      full_name: values.full_name,
      email: values.email || null,
      phone: values.phone || null,
      position: values.position,
      department: values.department,
      hire_date: values.hire_date,
      base_salary: parseFloat(values.base_salary),
      commission_rate: parseFloat(values.commission_rate || '0'),
      inss_number: values.inss_number || null,
      nuit: values.nuit || null,
      bank_name: values.bank_name || null,
      bank_account: values.bank_account || null,
      status: 'active',
      access_level: values.access_level
    };

    let error;
    if (editingEmployee) {
      ({ error } = await supabase.from('employees').update(payload as any).eq('id', editingEmployee.id));
    } else {
      ({ error } = await supabase.from('employees').insert(payload as any));
    }

    if (error) { 
      toast.error(t('settings.messages.save_error') + ': ' + error.message); 
      return; 
    }
    
    toast.success(t('hr.employee.save_success'));
    setDialogOpen(false);
    form.reset();
    setEditingEmployee(null);
    loadEmployees();
  };

  const activeEmployees = employees.filter(e => e.status === 'active');
  const totalPayroll = activeEmployees.reduce((s, e) => s + Number(e.base_salary), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">{t('hr.employee.title')}</h3>
          <Badge variant="secondary">{activeEmployees.length} {t('common.active').toLowerCase()}</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { 
          setDialogOpen(o); 
          if (!o) {
            form.reset();
            setEditingEmployee(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><UserPlus className="w-4 h-4 mr-2" /> {t('hr.employee.new')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? t('hr.employee.edit') : t('hr.employee.new')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.full_name')} *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="base_salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.base_salary')} (MT) *</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.commission')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.5" min="0" max="100" {...field} placeholder="Ex: 5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hire_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.hire_date')} *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.email')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.phone')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.position')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cargo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.department')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um departamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="inss_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.inss')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nuit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.nuit')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="bank_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.bank')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: BCI, Millennium" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('hr.employee.account')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="access_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('hr.employee.access_level')} *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('hr.employee.access_level')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACCESS_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {t(level.labelKey as any)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                  {editingEmployee ? t('common.save') : t('common.add')} {t('nav.employees').toLowerCase()}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t('hr.employee.total')}</p><p className="text-xl font-bold">{activeEmployees.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{t('hr.employee.payroll')}</p><p className="text-xl font-bold text-primary">{formatCurrency(totalPayroll)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">INSS Empresa (3%)</p><p className="text-xl font-bold text-warning">{formatCurrency(totalPayroll * 0.03)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Custo Total Estimado</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalPayroll * 1.03)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">{t('common.name')}</th>
                  <th className="text-left p-3">{t('hr.employee.position')}</th>
                  <th className="text-left p-3">{t('hr.employee.access_level')}</th>
                  <th className="text-left p-3">{t('hr.employee.department')}</th>
                  <th className="text-right p-3">{t('hr.employee.base_salary')}</th>
                  <th className="text-center p-3">{t('hr.employee.commission')}</th>
                  <th className="text-center p-3">{t('common.status')}</th>
                  <th className="text-center p-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-medium">{emp.full_name}</td>
                    <td className="p-3">{emp.position}</td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {t(ACCESS_LEVELS.find(l => l.value === emp.access_level)?.labelKey as any || 'hr.employee.role_seller')}
                      </Badge>
                    </td>
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
                        {emp.status === 'active' ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(emp)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (confirm(t('hr.employee.delete_confirm'))) {
                              const { error } = await supabase.from('employees').delete().eq('id', emp.id);
                              if (error) toast.error(t('settings.messages.save_error') + ': ' + error.message);
                              else {
                                toast.success('Funcionário removido');
                                loadEmployees();
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum funcionário cadastrado</td></tr>
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