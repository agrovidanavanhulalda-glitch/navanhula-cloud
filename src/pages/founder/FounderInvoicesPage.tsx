import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, CheckCircle2, FileText, Search, Download } from 'lucide-react';
import { downloadInvoicePdf } from '@/lib/generateInvoicePdf';

interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string | null;
  company_id: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  paid_at: string | null;
  plan_tier: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
}

const money = (n: unknown, cur = 'MT') =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  paid: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  overdue: 'bg-red-500/15 text-red-600 border-red-500/30',
  cancelled: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  refunded: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
};

const FounderInvoicesPage: React.FC = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);

  const invoices = useQuery({
    queryKey: ['founder', 'invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices' as any)
        .select('*')
        .order('issue_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Invoice[];
    },
  });

  const subs = useQuery({
    queryKey: ['founder', 'subs-brief'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, plan_tier, price_monthly, company_id')
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async (p: { subId: string; amount: number; tax: number; notes: string }) => {
      const { error } = await (supabase.rpc as any)('founder_invoice_create', {
        p_subscription_id: p.subId,
        p_amount: p.amount,
        p_tax: p.tax,
        p_notes: p.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fatura emitida');
      qc.invalidateQueries({ queryKey: ['founder', 'invoices'] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });

  const markPaid = useMutation({
    mutationFn: async (p: { id: string; method: string; ref: string }) => {
      const { error } = await (supabase.rpc as any)('founder_invoice_mark_paid', {
        p_invoice_id: p.id,
        p_method: p.method || null,
        p_reference: p.ref || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fatura marcada como paga');
      qc.invalidateQueries({ queryKey: ['founder', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['founder', 'revenue-stats'] });
      setPayOpen(null);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return (invoices.data ?? []).filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!s) return true;
      return (
        inv.invoice_number.toLowerCase().includes(s) ||
        (inv.plan_tier ?? '').toLowerCase().includes(s) ||
        (inv.payment_reference ?? '').toLowerCase().includes(s)
      );
    });
  }, [invoices.data, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Faturas</h2>
          <p className="text-sm text-muted-foreground">
            Emissão, cobrança e reconciliação de pagamentos.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Fatura
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número, plano, referência..."
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estados</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Paga</SelectItem>
              <SelectItem value="overdue">Atrasada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="refunded">Reembolsada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {invoices.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-bold uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-2">Número</th>
                  <th className="py-2 pr-2">Plano</th>
                  <th className="py-2 pr-2">Emissão</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2">Estado</th>
                  <th className="py-2 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="py-2 pr-2 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="py-2 pr-2 uppercase">{inv.plan_tier ?? '—'}</td>
                    <td className="py-2 pr-2 text-xs">
                      {new Date(inv.issue_date).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="py-2 pr-2 text-right font-bold">{money(inv.total_amount, inv.currency)}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" className={STATUS_TONE[inv.status] ?? ''}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => setPayOpen(inv)} className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Paga
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => downloadInvoicePdf(inv as any)}
                          title="Baixar PDF"
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create */}
      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        subs={subs.data ?? []}
        onSubmit={(p) => createInvoice.mutate(p)}
        loading={createInvoice.isPending}
      />

      {/* Mark paid */}
      <MarkPaidDialog
        invoice={payOpen}
        onClose={() => setPayOpen(null)}
        onSubmit={(p) => payOpen && markPaid.mutate({ id: payOpen.id, ...p })}
        loading={markPaid.isPending}
      />
    </div>
  );
};

const CreateDialog: React.FC<{
  open: boolean; onClose: () => void;
  subs: any[];
  onSubmit: (p: { subId: string; amount: number; tax: number; notes: string }) => void;
  loading: boolean;
}> = ({ open, onClose, subs, onSubmit, loading }) => {
  const [subId, setSubId] = useState('');
  const [amount, setAmount] = useState('');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (open) {
      setSubId(''); setAmount(''); setTax('0'); setNotes('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Assinatura</label>
            <Select value={subId} onValueChange={(v) => {
              setSubId(v);
              const s = subs.find((x) => x.id === v);
              if (s && !amount) setAmount(String(s.price_monthly ?? ''));
            }}>
              <SelectTrigger><SelectValue placeholder="Escolher assinatura..." /></SelectTrigger>
              <SelectContent>
                {subs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {(s.plan_tier as string).toUpperCase()} · {money(s.price_monthly)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">Montante (MT)</label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground">IVA (MT)</label>
              <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Notas</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!subId || !amount || loading}
            onClick={() => onSubmit({ subId, amount: Number(amount), tax: Number(tax), notes })}
          >
            {loading ? 'A emitir...' : 'Emitir Fatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MarkPaidDialog: React.FC<{
  invoice: Invoice | null; onClose: () => void;
  onSubmit: (p: { method: string; ref: string }) => void;
  loading: boolean;
}> = ({ invoice, onClose, onSubmit, loading }) => {
  const [method, setMethod] = useState('mpesa');
  const [ref, setRef] = useState('');
  React.useEffect(() => { if (invoice) { setMethod('mpesa'); setRef(''); } }, [invoice]);

  return (
    <Dialog open={!!invoice} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Paga — {invoice?.invoice_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Método</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="emola">e-Mola</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-muted-foreground">Referência</label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="ex. MP12345ABC" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={loading} onClick={() => onSubmit({ method, ref })}>
            {loading ? 'A confirmar...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FounderInvoicesPage;
