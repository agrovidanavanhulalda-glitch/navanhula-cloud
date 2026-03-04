import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, FileText, Download, AlertTriangle, TrendingUp, DollarSign, Receipt, FileDown,
  Globe, Shield, Code
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';
import { downloadFiscalPdfA4 } from '@/lib/generateFiscalPdfA4';
import { downloadSaftMZXml, type SaftOptions } from '@/lib/generateSaftMZ';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type FiscalRegime = 'irpc' | 'ispc' | 'iva';

const FISCAL_RATES: Record<FiscalRegime, { label: string; rate: number; description: string }> = {
  irpc: { label: 'IRPC', rate: 3, description: 'Imposto sobre o Rendimento das Pessoas Colectivas — 3%' },
  ispc: { label: 'ISPC', rate: 5, description: 'Imposto Simplificado para Pequenos Contribuintes — 5%' },
  iva: { label: 'IVA', rate: 16, description: 'Imposto sobre o Valor Acrescentado — 16%' },
};

const FiscalPage: React.FC = () => {
  const { role, company } = useAuth();
  const isAdmin = role === 'admin' || (role as string) === 'ceo';

  const [regime, setRegime] = useState<FiscalRegime>((company as any)?.fiscal_regime || 'irpc');
  const [period, setPeriod] = useState<'month' | 'quarter'>('month');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const startDate = period === 'month'
        ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        : new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString();

      const { data } = await supabase
        .from('sales')
        .select('total, subtotal, discount_amount, created_at, payment_method')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      setSalesData(data || []);
      setLoading(false);
    };
    fetchSales();
  }, [period]);

  const stats = useMemo(() => {
    const totalRevenue = salesData.reduce((sum, s) => sum + Number(s.total), 0);
    const totalDiscount = salesData.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0);
    const rate = FISCAL_RATES[regime].rate;
    const taxDue = totalRevenue * (rate / 100);
    const netRevenue = totalRevenue - taxDue;

    const byMethod: Record<string, number> = {};
    salesData.forEach(s => {
      byMethod[s.payment_method] = (byMethod[s.payment_method] || 0) + Number(s.total);
    });

    return { totalRevenue, totalDiscount, taxDue, netRevenue, rate, totalSales: salesData.length, byMethod };
  }, [salesData, regime]);

  const handleChangeRegime = async (newRegime: FiscalRegime) => {
    setRegime(newRegime);
    if (company) {
      const { error } = await supabase
        .from('companies')
        .update({ fiscal_regime: newRegime, fiscal_rate: FISCAL_RATES[newRegime].rate })
        .eq('id', company.id);
      if (!error) toast.success(`Regime fiscal alterado para ${FISCAL_RATES[newRegime].label}`);
    }
  };

  const pdfOptions = () => ({
    companyName: company?.name || 'Empresa',
    companyNif: (company as any)?.nif || '',
    companyAddress: (company as any)?.address || '',
    companyPhone: (company as any)?.phone || '',
    regime: FISCAL_RATES[regime],
    periodLabel: period === 'month' ? 'Mensal' : 'Trimestral',
    totalRevenue: stats.totalRevenue,
    totalDiscount: stats.totalDiscount,
    taxDue: stats.taxDue,
    netRevenue: stats.netRevenue,
    totalSales: stats.totalSales,
    byMethod: stats.byMethod,
    getMethodLabel,
  });

  const handleExportPdf = () => {
    downloadFiscalPdfA4(pdfOptions());
    toast.success('Relatório PDF exportado');
  };

  const handleExportCsv = () => {
    const rows = [
      ['Método', 'Valor', 'Imposto', '% do Total'],
      ...Object.entries(stats.byMethod).map(([m, v]) => [
        getMethodLabel(m),
        v.toFixed(2),
        (v * (stats.rate / 100)).toFixed(2),
        stats.totalRevenue > 0 ? ((v / stats.totalRevenue) * 100).toFixed(1) + '%' : '0%',
      ]),
      [],
      ['Total Faturado', stats.totalRevenue.toFixed(2)],
      ['Imposto Devido', stats.taxDue.toFixed(2)],
      ['Receita Líquida', stats.netRevenue.toFixed(2)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_fiscal_${regime}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const handleExportSaftMZ = async () => {
    // Fetch sales with items for SAFT
    const startDate = period === 'month'
      ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      : new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString();
    const endDate = new Date().toISOString();

    const { data: salesWithItems } = await supabase
      .from('sales')
      .select('id, total, subtotal, discount_amount, created_at, payment_method, customer_name, sale_items(product_id, product_name, quantity, unit_price, total)')
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .order('created_at', { ascending: true });

    const rate = FISCAL_RATES[regime].rate;
    const productsMap = new Map<string, { code: string; name: string; unitPrice: number }>();
    const invoices = (salesWithItems || []).map(s => {
      const lines = ((s as any).sale_items || []).map((item: any) => {
        const code = item.product_id?.slice(0, 8) || 'PROD';
        if (!productsMap.has(code)) {
          productsMap.set(code, { code, name: item.product_name, unitPrice: Number(item.unit_price) });
        }
        return {
          productCode: code,
          productName: item.product_name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
          total: Number(item.total),
          tax: Number(item.total) * (rate / 100),
        };
      });
      const total = Number(s.total);
      return {
        id: s.id,
        date: s.created_at || new Date().toISOString(),
        customerName: s.customer_name || undefined,
        paymentMethod: s.payment_method,
        subtotal: Number(s.subtotal),
        discount: Number(s.discount_amount || 0),
        total,
        taxAmount: total * (rate / 100),
        lines,
      };
    });

    const saftOptions: SaftOptions = {
      company: {
        name: company?.name || 'Empresa',
        nif: (company as any)?.nif || '',
        address: (company as any)?.address || '',
        city: (company as any)?.city || 'Maputo',
        phone: (company as any)?.phone || '',
        fiscalRegime: regime,
        fiscalRate: rate,
      },
      periodStart: startDate,
      periodEnd: endDate,
      products: Array.from(productsMap.values()),
      invoices,
    };

    downloadSaftMZXml(saftOptions);
    toast.success('Ficheiro SAFT-MZ exportado com sucesso');
  };

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Apenas Administradores podem acessar o módulo fiscal.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Calculator className="w-7 h-7" /> Módulo Fiscal
          </h1>
          <p className="text-muted-foreground">{company?.name} — Obrigações Tributárias</p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileDown className="w-4 h-4 mr-2" /> Relatório PDF A4
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>
                <FileText className="w-4 h-4 mr-2" /> Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSaftMZ}>
                <Code className="w-4 h-4 mr-2" /> SAFT-MZ (XML)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Regime Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Regime Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(FISCAL_RATES) as [FiscalRegime, typeof FISCAL_RATES[FiscalRegime]][]).map(([key, info]) => (
              <div
                key={key}
                onClick={() => handleChangeRegime(key)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  regime === key
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={regime === key ? 'default' : 'secondary'}>{info.label}</Badge>
                  <span className="text-2xl font-bold">{info.rate}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <div className="flex gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as 'month' | 'quarter')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mensal</SelectItem>
            <SelectItem value="quarter">Trimestral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fiscal KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <DollarSign className="w-4 h-4" /> Total Faturado
          </div>
          <p className="text-2xl font-bold pos-money">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">{stats.totalSales} vendas</p>
        </Card>

        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Receipt className="w-4 h-4" /> Imposto Devido
          </div>
          <p className="text-2xl font-bold pos-money text-warning">{formatCurrency(stats.taxDue)}</p>
          <p className="text-xs text-muted-foreground">{FISCAL_RATES[regime].label} — {stats.rate}%</p>
        </Card>

        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TrendingUp className="w-4 h-4" /> Receita Líquida
          </div>
          <p className="text-2xl font-bold pos-money text-success">{formatCurrency(stats.netRevenue)}</p>
        </Card>

        <Card className="pos-stat">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            Descontos
          </div>
          <p className="text-2xl font-bold pos-money text-destructive">{formatCurrency(stats.totalDiscount)}</p>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Faturação por Método de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byMethod).map(([method, value]) => (
              <div key={method} className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">{getMethodLabel(method)}</p>
                <p className="text-lg font-bold pos-money">{formatCurrency(value)}</p>
                <p className="text-xs text-muted-foreground">
                  Imposto: {formatCurrency(value * (stats.rate / 100))}
                </p>
              </div>
            ))}
            {Object.keys(stats.byMethod).length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground py-4">Sem dados para o período</p>
            )}
          </div>
        </CardContent>
      </Card>
      {/* API Fiscal Integration Status */}
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5" /> Integração API — Autoridade Tributária (e-Tributação)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="w-8 h-8 text-muted-foreground mt-1 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 border-amber-500/30">
                  Aguardando API Pública
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                A Autoridade Tributária de Moçambique ainda não disponibilizou uma API pública para submissão 
                electrónica de dados fiscais. O sistema está preparado para integração futura.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Ficheiro SAFT-MZ</p>
                  <p className="text-sm font-semibold text-green-600">✓ Disponível</p>
                  <p className="text-xs text-muted-foreground">Exportação XML pronta para auditoria</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Envio Automático</p>
                  <p className="text-sm font-semibold text-amber-600">⏳ Pendente</p>
                  <p className="text-xs text-muted-foreground">Aguardando endpoints da AT-MZ</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Certificado Digital</p>
                  <p className="text-sm font-semibold text-amber-600">⏳ Pendente</p>
                  <p className="text-xs text-muted-foreground">Requer certificação pela AT</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Dinheiro', mpesa: 'M-Pesa', emola: 'E-mola', card: 'Cartão',
  };
  return labels[method] || method;
}

export default FiscalPage;
