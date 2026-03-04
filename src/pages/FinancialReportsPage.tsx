import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Banknote,
  Smartphone,
  CreditCard,
  Ticket,
  FileSpreadsheet,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { formatCurrency, formatDateTime, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Download } from 'lucide-react';

// Types
interface WalletData {
  id: string;
  store_id: string;
  payment_method: string;
  balance: number;
  company_id: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  store_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  sale_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface StoreOption {
  id: string;
  name: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  card: 'Cartão',
  voucher: 'Voucher',
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  mpesa: <Smartphone className="w-4 h-4" />,
  emola: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  voucher: <Ticket className="w-4 h-4" />,
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142 71% 45%)',
  'hsl(25 95% 53%)',
  'hsl(217 91% 60%)',
  'hsl(271 91% 65%)',
  'hsl(0 84% 60%)',
];

const FinancialReportsPage: React.FC = () => {
  const { role, store } = useAuth();
  const isAdmin = role === 'admin' || role === 'manager' || (role as string) === 'ceo';

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [walletsRes, txRes, storesRes] = await Promise.all([
        supabase.from('wallets').select('*'),
        supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('stores').select('id, name'),
      ]);

      if (walletsRes.data) setWallets(walletsRes.data);
      if (txRes.data) setTransactions(txRes.data as WalletTransaction[]);
      if (storesRes.data) setStores(storesRes.data);
    } catch (err) {
      console.error('Error loading financial data:', err);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  // Filtered transactions
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (txDate < start || txDate > end) return false;
      if (selectedStore !== 'all' && tx.store_id !== selectedStore) return false;
      return true;
    });
  }, [transactions, selectedStore, startDate, endDate]);

  // KPIs
  const kpis = useMemo(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const credits = filteredTx.filter(t => t.type === 'credit');
    const debits = filteredTx.filter(t => t.type === 'debit');
    const transfersIn = filteredTx.filter(t => t.type === 'transfer_in');
    const transfersOut = filteredTx.filter(t => t.type === 'transfer_out');

    const totalCredits = credits.reduce((s, t) => s + Number(t.amount), 0);
    const totalDebits = debits.reduce((s, t) => s + Number(t.amount), 0);
    const totalTransfersIn = transfersIn.reduce((s, t) => s + Number(t.amount), 0);
    const totalTransfersOut = transfersOut.reduce((s, t) => s + Number(t.amount), 0);

    return {
      totalBalance,
      totalCredits,
      totalDebits,
      totalTransfersIn,
      totalTransfersOut,
      totalTransfers: totalTransfersIn + totalTransfersOut,
      creditCount: credits.length,
      transferCount: transfersIn.length + transfersOut.length,
      netFlow: totalCredits - totalDebits,
    };
  }, [wallets, filteredTx]);

  // Balance by payment method (all stores)
  const balanceByMethod = useMemo(() => {
    const filtered = selectedStore === 'all' ? wallets : wallets.filter(w => w.store_id === selectedStore);
    const grouped: Record<string, number> = {};
    filtered.forEach(w => {
      grouped[w.payment_method] = (grouped[w.payment_method] || 0) + Number(w.balance);
    });
    return Object.entries(grouped).map(([method, balance]) => ({
      method,
      label: PAYMENT_LABELS[method] || method,
      balance,
    })).sort((a, b) => b.balance - a.balance);
  }, [wallets, selectedStore]);

  // Balance by store
  const balanceByStore = useMemo(() => {
    const grouped: Record<string, { name: string; balance: number; methods: Record<string, number> }> = {};
    wallets.forEach(w => {
      const storeName = stores.find(s => s.id === w.store_id)?.name || 'Desconhecida';
      if (!grouped[w.store_id]) {
        grouped[w.store_id] = { name: storeName, balance: 0, methods: {} };
      }
      grouped[w.store_id].balance += Number(w.balance);
      grouped[w.store_id].methods[w.payment_method] = (grouped[w.store_id].methods[w.payment_method] || 0) + Number(w.balance);
    });
    return Object.values(grouped).sort((a, b) => b.balance - a.balance);
  }, [wallets, stores]);

  // Daily volume chart data
  const dailyVolume = useMemo(() => {
    const byDay: Record<string, { date: string; credits: number; debits: number; transfers: number }> = {};
    filteredTx.forEach(tx => {
      const day = tx.created_at.split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, credits: 0, debits: 0, transfers: 0 };
      const amount = Number(tx.amount);
      if (tx.type === 'credit') byDay[day].credits += amount;
      else if (tx.type === 'debit') byDay[day].debits += amount;
      else byDay[day].transfers += amount;
    });
    return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTx]);

  // Transfer details
  const transferTx = useMemo(() => {
    return filteredTx.filter(t => t.type === 'transfer_in' || t.type === 'transfer_out');
  }, [filteredTx]);

  // Chart configs
  const volumeChartConfig: ChartConfig = {
    credits: { label: 'Créditos', color: 'hsl(142 71% 45%)' },
    debits: { label: 'Débitos', color: 'hsl(0 84% 60%)' },
    transfers: { label: 'Transferências', color: 'hsl(217 91% 60%)' },
  };

  const pieChartConfig: ChartConfig = {};
  balanceByMethod.forEach((item, i) => {
    pieChartConfig[item.method] = { label: item.label, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Valor', 'Saldo Após', 'Descrição', 'Loja'];
    const rows = filteredTx.map(tx => [
      formatDateTime(tx.created_at),
      tx.type,
      tx.amount.toString(),
      tx.balance_after.toString(),
      tx.description || '',
      stores.find(s => s.id === tx.store_id)?.name || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_financeiro_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado com sucesso');
  };

  // Export PDF A4
  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 25;
    let y = margin;

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, y, { align: 'center' });
    y += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Período: ${startDate} a ${endDate}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-MZ')}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // KPIs
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text('RESUMO FINANCEIRO', margin, y);
    y += 8;

    const drawRow = (label: string, value: string, bold = false) => {
      doc.setFont('times', bold ? 'bold' : 'normal');
      doc.setFontSize(11);
      doc.text(label, margin + 5, y);
      doc.text(value, pageWidth - margin, y, { align: 'right' });
      y += 6;
    };

    drawRow('Saldo Total', formatCurrency(kpis.totalBalance));
    drawRow('Total Créditos', formatCurrency(kpis.totalCredits));
    drawRow('Total Débitos', formatCurrency(kpis.totalDebits));
    drawRow('Transferências', formatCurrency(kpis.totalTransfers));
    y += 2;
    doc.setLineWidth(0.2);
    doc.line(margin + 5, y, pageWidth - margin, y);
    y += 5;
    drawRow('Fluxo Líquido', formatCurrency(kpis.netFlow), true);
    y += 6;

    // Balance by method
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text('SALDO POR MÉTODO DE PAGAMENTO', margin, y);
    y += 8;

    balanceByMethod.forEach(item => {
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text(item.label, margin + 5, y);
      doc.text(formatCurrency(item.balance), pageWidth - margin, y, { align: 'right' });
      y += 6;
    });

    // Footer
    const footerY = 297 - margin;
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.text('Documento gerado pelo NAVANHULA POS', pageWidth / 2, footerY - 7, { align: 'center' });
    doc.text(`Impresso em: ${new Date().toLocaleString('pt-MZ')}`, pageWidth / 2, footerY - 3, { align: 'center' });

    doc.save(`relatorio_financeiro_${startDate}_${endDate}.pdf`);
    toast.success('PDF exportado com sucesso');
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      credit: 'Crédito',
      debit: 'Débito',
      transfer_in: 'Recebida',
      transfer_out: 'Enviada',
    };
    return map[type] || type;
  };

  const getTypeBadgeVariant = (type: string) => {
    if (type === 'credit') return 'default' as const;
    if (type === 'debit') return 'destructive' as const;
    return 'secondary' as const;
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Apenas administradores podem acessar os relatórios financeiros.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Relatórios Financeiros
          </h1>
          <p className="text-sm text-muted-foreground">
            Métricas de carteira, transferências e fluxo de caixa digital
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-2" /> Relatório PDF A4
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <Label>Loja</Label>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(kpis.totalBalance)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Créditos</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(kpis.totalCredits)}</p>
              <p className="text-xs text-muted-foreground">{kpis.creditCount} operações</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Débitos</p>
              <p className="text-xl font-bold text-destructive">{formatCurrency(kpis.totalDebits)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transferências</p>
              <p className="text-xl font-bold">{formatCurrency(kpis.totalTransfers)}</p>
              <p className="text-xs text-muted-foreground">{kpis.transferCount} movimentos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              {kpis.netFlow >= 0 ? (
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fluxo Líquido</p>
              <p className={`text-xl font-bold ${kpis.netFlow >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {kpis.netFlow >= 0 ? '+' : ''}{formatCurrency(kpis.netFlow)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="stores">Por Loja</TabsTrigger>
          <TabsTrigger value="transfers">Transferências</TabsTrigger>
          <TabsTrigger value="history">Histórico Completo</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance by Method - Pie */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Saldo por Método de Pagamento
              </h3>
              {balanceByMethod.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ChartContainer config={pieChartConfig} className="h-[280px]">
                  <PieChart>
                    <Pie
                      data={balanceByMethod}
                      dataKey="balance"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {balanceByMethod.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
              {/* Legend */}
              <div className="mt-4 space-y-2">
                {balanceByMethod.map((item, i) => (
                  <div key={item.method} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="flex items-center gap-1">
                        {PAYMENT_ICONS[item.method]}
                        {item.label}
                      </span>
                    </div>
                    <span className="font-bold">{formatCurrency(item.balance)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily Volume Chart */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Volume Diário de Movimentações
              </h3>
              {dailyVolume.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados para o período</p>
              ) : (
                <ChartContainer config={volumeChartConfig} className="h-[280px]">
                  <BarChart data={dailyVolume}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      fontSize={11}
                    />
                    <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="credits" fill="var(--color-credits)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="debits" fill="var(--color-debits)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="transfers" fill="var(--color-transfers)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Stores Tab */}
        <TabsContent value="stores">
          <Card>
            {balanceByStore.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Sem dados de carteiras</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Dinheiro</TableHead>
                    <TableHead className="text-right">M-Pesa</TableHead>
                    <TableHead className="text-right">E-Mola</TableHead>
                    <TableHead className="text-right">Cartão</TableHead>
                    <TableHead className="text-right">Voucher</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceByStore.map((store, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {store.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(store.methods['cash'] || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(store.methods['mpesa'] || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(store.methods['emola'] || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(store.methods['card'] || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(store.methods['voucher'] || 0)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(store.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOTAL GERAL</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balanceByStore.reduce((s, st) => s + (st.methods['cash'] || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balanceByStore.reduce((s, st) => s + (st.methods['mpesa'] || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balanceByStore.reduce((s, st) => s + (st.methods['emola'] || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balanceByStore.reduce((s, st) => s + (st.methods['card'] || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(balanceByStore.reduce((s, st) => s + (st.methods['voucher'] || 0), 0))}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(kpis.totalBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Histórico de Transferências
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {transferTx.length} transferências no período selecionado
              </p>
            </div>
            {transferTx.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ArrowRightLeft className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma transferência no período</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Saldo Após</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferTx.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{formatDateTime(tx.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'transfer_in' ? 'default' : 'secondary'}>
                          {tx.type === 'transfer_in' ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {getTypeLabel(tx.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{stores.find(s => s.id === tx.store_id)?.name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tx.description || '—'}</TableCell>
                      <TableCell className={`text-right font-bold ${tx.type === 'transfer_in' ? 'text-emerald-600' : 'text-destructive'}`}>
                        {tx.type === 'transfer_in' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(Number(tx.balance_after))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Full History Tab */}
        <TabsContent value="history">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Todas as Movimentações
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredTx.length} movimentações no período
              </p>
            </div>
            {filteredTx.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Saldo Após</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.slice(0, 100).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm whitespace-nowrap">{formatDateTime(tx.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(tx.type)} className="text-xs">
                            {getTypeLabel(tx.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{stores.find(s => s.id === tx.store_id)?.name || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tx.description || '—'}</TableCell>
                        <TableCell className={`text-right font-bold ${
                          tx.type === 'credit' || tx.type === 'transfer_in' ? 'text-emerald-600' : 'text-destructive'
                        }`}>
                          {tx.type === 'credit' || tx.type === 'transfer_in' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(Number(tx.balance_after))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredTx.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Mostrando 100 de {filteredTx.length} movimentações. Exporte o CSV para ver todos.
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReportsPage;
