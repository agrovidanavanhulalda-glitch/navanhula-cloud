import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';
import { Clock, UserCheck, Plus, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Employee {
  id: string;
  full_name: string;
  position: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  record_date: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
  late_minutes: number | null;
  notes: string | null;
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Presente', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'absent', label: 'Falta', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'late', label: 'Atraso', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'leave', label: 'Licença', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'holiday', label: 'Feriado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
];

const AttendanceManager: React.FC = () => {
  const { company, user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ employee_id: '', status: 'present', check_in: '08:00', check_out: '17:00', overtime_hours: 0, late_minutes: 0, notes: '' });

  const loadData = async () => {
    setLoading(true);
    const [empRes, recRes] = await Promise.all([
      supabase.from('employees').select('id, full_name, position').eq('status', 'active').order('full_name'),
      supabase.from('attendance').select('*').eq('record_date', selectedDate).order('created_at', { ascending: false }),
    ]);
    if (!empRes.error) setEmployees((empRes.data as any[]) || []);
    if (!recRes.error) setRecords((recRes.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedDate]);

  const addRecord = async () => {
    if (!company?.id || !form.employee_id) { toast.error('Selecione um funcionário'); return; }

    const hoursWorked = form.check_in && form.check_out
      ? (() => {
          const [inH, inM] = form.check_in.split(':').map(Number);
          const [outH, outM] = form.check_out.split(':').map(Number);
          return Math.max(0, (outH * 60 + outM - inH * 60 - inM) / 60);
        })()
      : null;

    const { error } = await supabase.from('attendance').insert({
      company_id: company.id,
      employee_id: form.employee_id,
      record_date: selectedDate,
      status: form.status,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      hours_worked: hoursWorked,
      overtime_hours: Number(form.overtime_hours) || 0,
      late_minutes: Number(form.late_minutes) || 0,
      notes: form.notes || null,
      created_by: user?.id,
    } as any);

    if (error) { toast.error(error.message); return; }
    toast.success('Presença registada');
    setDialogOpen(false);
    setForm({ employee_id: '', status: 'present', check_in: '08:00', check_out: '17:00', overtime_hours: 0, late_minutes: 0, notes: '' });
    loadData();
  };

  const markAllPresent = async () => {
    if (!company?.id || !user) return;
    const existingIds = new Set(records.map(r => r.employee_id));
    const toMark = employees.filter(e => !existingIds.has(e.id));
    if (toMark.length === 0) { toast.info('Todos já têm presença registada'); return; }

    const { error } = await supabase.from('attendance').insert(
      toMark.map(e => ({
        company_id: company.id,
        employee_id: e.id,
        record_date: selectedDate,
        status: 'present',
        check_in: '08:00',
        check_out: '17:00',
        hours_worked: 9,
        created_by: user.id,
      })) as any
    );
    if (error) { toast.error(error.message); return; }
    toast.success(`${toMark.length} presenças registadas`);
    loadData();
  };

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));
  const getStatusInfo = (s: string) => STATUS_OPTIONS.find(o => o.value === s) || STATUS_OPTIONS[0];

  const presentCount = records.filter(r => r.status === 'present').length;
  const absentCount = records.filter(r => r.status === 'absent').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Controlo de Presenças</h3>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-[160px]" />
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            <UserCheck className="w-4 h-4 mr-1" /> Marcar Todos
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Registar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registar Presença</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Funcionário</Label>
                  <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Entrada</Label><Input type="time" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} /></div>
                  <div><Label>Saída</Label><Input type="time" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Horas Extra</Label><Input type="number" value={form.overtime_hours} onChange={e => setForm(p => ({ ...p, overtime_hours: Number(e.target.value) }))} /></div>
                  <div><Label>Minutos Atraso</Label><Input type="number" value={form.late_minutes} onChange={e => setForm(p => ({ ...p, late_minutes: Number(e.target.value) }))} /></div>
                </div>
                <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
                <Button className="w-full" onClick={addRecord}>Registar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Presentes</p><p className="text-2xl font-bold text-green-600">{presentCount}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Faltas</p><p className="text-2xl font-bold text-red-600">{absentCount}</p></Card>
        <Card className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Equipa</p><p className="text-2xl font-bold">{employees.length}</p></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Funcionário</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3">Entrada</th>
                  <th className="text-center p-3">Saída</th>
                  <th className="text-right p-3">Horas</th>
                  <th className="text-right p-3">Extra</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const emp = empMap[r.employee_id];
                  const statusInfo = getStatusInfo(r.status);
                  return (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 font-medium">{emp?.full_name || 'N/A'}</td>
                      <td className="p-3 text-center"><Badge className={statusInfo.color}>{statusInfo.label}</Badge></td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{r.check_in || '-'}</td>
                      <td className="p-3 text-center font-mono text-muted-foreground">{r.check_out || '-'}</td>
                      <td className="p-3 text-right font-mono">{r.hours_worked ? `${r.hours_worked.toFixed(1)}h` : '-'}</td>
                      <td className="p-3 text-right font-mono text-primary">{r.overtime_hours ? `${r.overtime_hours}h` : '-'}</td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum registo para {formatDate(selectedDate)}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManager;
