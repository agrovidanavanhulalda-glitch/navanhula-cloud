import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  due_date: string | null;
  task_type: string;
  lead_id: string | null;
  created_at: string;
  completed_at: string | null;
}

const PRIORITY: Record<string, string> = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em curso', done: 'Concluída', cancelled: 'Cancelada'
};

const CrmTasksPage: React.FC = () => {
  const { company } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [running, setRunning] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!company?.id) return;
    const { data } = await (supabase as any)
      .from('crm_tasks').select('*').eq('company_id', company.id)
      .order('due_date', { ascending: true, nullsFirst: false }).limit(200);
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [company?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = async () => {
    if (!form.title.trim() || !company?.id) return;
    const { error } = await (supabase as any).from('crm_tasks').insert({
      company_id: company.id, title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority, task_type: 'manual',
      due_date: form.due_date || null,
    });
    if (error) { toast.error('Erro ao criar tarefa'); return; }
    toast.success('Tarefa criada');
    setForm({ title: '', description: '', priority: 'medium', due_date: '' });
    setShowForm(false); fetchTasks();
  };

  const toggleDone = async (t: Task) => {
    const isDone = t.status === 'done';
    await (supabase as any).from('crm_tasks').update({
      status: isDone ? 'pending' : 'done',
      completed_at: isDone ? null : new Date().toISOString(),
    }).eq('id', t.id);
    fetchTasks();
  };

  const runFollowups = async () => {
    setRunning(true);
    const { data, error } = await (supabase as any).rpc('process_lead_followups');
    setRunning(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Follow-ups processados: ${data?.tasks_created ?? 0} nova(s) tarefa(s)`);
    fetchTasks();
  };

  const filtered = tasks.filter(t =>
    filter === 'all' ? true : filter === 'done' ? t.status === 'done' : t.status !== 'done' && t.status !== 'cancelled'
  );

  const stats = {
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()).length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tarefas Comerciais</h1>
          <p className="text-sm text-muted-foreground">Follow-ups automáticos e tarefas manuais</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runFollowups} disabled={running} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} /> Gerar Follow-ups
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> Nova Tarefa</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Tarefa</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
                <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Prazo</Label><Input type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
                </div>
                <Button className="w-full" onClick={createTask} disabled={!form.title.trim()}>Criar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-primary">{stats.pending}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Em atraso</p><p className="text-2xl font-bold text-red-600">{stats.overdue}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-2xl font-bold text-[hsl(var(--success))]">{stats.done}</p></Card>
      </div>

      <div className="flex gap-2">
        {(['pending', 'done', 'all'] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'pending' ? 'Pendentes' : f === 'done' ? 'Concluídas' : 'Todas'}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(t => {
          const overdue = t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date();
          return (
            <Card key={t.id} className="p-4 flex items-start gap-3">
              <button onClick={() => toggleDone(t)} className="mt-0.5">
                {t.status === 'done'
                  ? <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
                  : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground hover:border-primary" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-medium ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</p>
                  <Badge className={`text-[10px] ${PRIORITY[t.priority]}`}>{t.priority}</Badge>
                  {t.task_type !== 'manual' && <Badge variant="outline" className="text-[10px]">auto</Badge>}
                  {overdue && <Badge className="text-[10px] bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />atraso</Badge>}
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                {t.due_date && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(t.due_date).toLocaleString('pt-PT')}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[t.status]}</Badge>
            </Card>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Sem tarefas neste filtro.</div>
        )}
      </div>
    </div>
  );
};

export default CrmTasksPage;
