import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { DollarSign, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import type { PoultryInput } from './PoultryInputsManager';
import type { OperationalCost } from './PoultryOperationalCosts';
import type { DailyRecord } from './PoultryDailyRecords';

interface Batch {
  id: string;
  batch_name: string;
  initial_quantity: number;
  current_quantity: number;
  mortality: number;
  avg_weight: number;
  total_cost: number;
  status: string;
  start_date: string;
}

interface Production {
  id: string;
  batch_id: string;
  chickens_sold: number;
  eggs_produced: number;
  revenue: number;
  profit: number;
  production_date: string;
}

interface Props {
  batches: Batch[];
  productions: Production[];
  inputs: PoultryInput[];
  operationalCosts: OperationalCost[];
  dailyRecords: DailyRecord[];
  companyName: string;
  logoUrl?: string;
}

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 65%, 60%)', 'hsl(190, 90%, 50%)'];

const PoultryFinancialTab: React.FC<Props> = ({ batches, productions, inputs, operationalCosts, dailyRecords, companyName, logoUrl }) => {

  const batchFinancials = batches.map(b => {
    const batchProds = productions.filter(p => p.batch_id === b.id);
    const batchInputs = inputs.filter(i => i.batch_id === b.id);
    const batchOpCosts = operationalCosts.filter(c => c.batch_id === b.id);
    const batchRecords = dailyRecords.filter(r => r.batch_id === b.id);

    const revenue = batchProds.reduce((s, p) => s + Number(p.revenue || 0), 0);
    const inputCost = batchInputs.reduce((s, i) => s + Number(i.total_cost || 0), 0);
    const opCost = batchOpCosts.reduce((s, c) => s + Number(c.amount || 0), 0);
    const totalCost = inputCost + opCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue * 100) : 0;
    const totalFeed = batchRecords.reduce((s, r) => s + (r.feed_consumed_kg || 0), 0);
    const fcr = b.avg_weight && b.current_quantity > 0 ? (totalFeed / (b.current_quantity * b.avg_weight)).toFixed(2) : null;

    return { ...b, revenue, inputCost, opCost, totalCost, profit, margin, fcr, totalFeed };
  });

  const totalRevenue = batchFinancials.reduce((s, b) => s + b.revenue, 0);
  const totalCost = batchFinancials.reduce((s, b) => s + b.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

  const chartData = batchFinancials.filter(b => b.revenue > 0 || b.totalCost > 0).map(b => ({
    name: b.batch_name, receita: b.revenue, custo: b.totalCost, lucro: b.profit,
  }));

  const costBreakdown = [
    { name: 'Insumos', value: batchFinancials.reduce((s, b) => s + b.inputCost, 0) },
    { name: 'Operacional', value: batchFinancials.reduce((s, b) => s + b.opCost, 0) },
  ].filter(c => c.value > 0);

  const exportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 20;
    let y = margin;

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(14);
    doc.text('RELATÓRIO AVICULTURA', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-MZ')}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Summary
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('RESUMO FINANCEIRO', margin, y);
    y += 7;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const summary = [
      ['Receita Total:', formatCurrency(totalRevenue)],
      ['Custo Total:', formatCurrency(totalCost)],
      ['Lucro:', formatCurrency(totalProfit)],
      ['Margem Média:', `${avgMargin.toFixed(1)}%`],
      ['Total Lotes:', String(batches.length)],
    ];
    summary.forEach(([l, v]) => {
      doc.text(l, margin, y);
      doc.text(v, pageWidth - margin, y, { align: 'right' });
      y += 5;
    });
    y += 5;

    // Per batch
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('DESEMPENHO POR LOTE', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.text('Lote', margin, y);
    doc.text('Receita', margin + 60, y, { align: 'right' });
    doc.text('Custo', margin + 90, y, { align: 'right' });
    doc.text('Lucro', margin + 120, y, { align: 'right' });
    doc.text('Margem', margin + 145, y, { align: 'right' });
    doc.text('FCR', pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('times', 'normal');
    batchFinancials.forEach(b => {
      if (y > 270) { doc.addPage(); y = margin; }
      const name = b.batch_name.length > 20 ? b.batch_name.substring(0, 20) + '...' : b.batch_name;
      doc.text(name, margin, y);
      doc.text(formatCurrency(b.revenue), margin + 60, y, { align: 'right' });
      doc.text(formatCurrency(b.totalCost), margin + 90, y, { align: 'right' });
      doc.text(formatCurrency(b.profit), margin + 120, y, { align: 'right' });
      doc.text(`${b.margin.toFixed(1)}%`, margin + 145, y, { align: 'right' });
      doc.text(b.fcr || '—', pageWidth - margin, y, { align: 'right' });
      y += 5;
    });

    y += 5;
    // Inputs summary
    if (inputs.length > 0) {
      if (y > 250) { doc.addPage(); y = margin; }
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('CONSUMO DE INSUMOS', margin, y);
      y += 6;
      doc.setFont('times', 'normal');
      doc.setFontSize(9);

      const inputsByType: Record<string, { qty: number; cost: number }> = {};
      inputs.forEach(i => {
        if (!inputsByType[i.input_type]) inputsByType[i.input_type] = { qty: 0, cost: 0 };
        inputsByType[i.input_type].qty += i.quantity_received;
        inputsByType[i.input_type].cost += Number(i.total_cost || 0);
      });

      Object.entries(inputsByType).forEach(([type, data]) => {
        doc.text(type.charAt(0).toUpperCase() + type.slice(1), margin, y);
        doc.text(`${data.qty} un.`, margin + 60, y, { align: 'right' });
        doc.text(formatCurrency(data.cost), pageWidth - margin, y, { align: 'right' });
        y += 5;
      });
    }

    // Footer
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.text(`Documento gerado pelo ${companyName}`, pageWidth / 2, 290, { align: 'center' });

    doc.save(`relatorio_avicultura_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Receita Total</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Custo Total</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalCost)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {totalProfit >= 0 ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
            Lucro
          </p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(totalProfit)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Margem Média</p>
          <p className={`text-2xl font-bold ${avgMargin >= 0 ? 'text-green-600' : 'text-destructive'}`}>{avgMargin.toFixed(1)}%</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Receita vs Custo por Lote</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="receita" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Receita" />
                  <Bar dataKey="custo" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Custo" />
                  <Bar dataKey="lucro" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Lucro" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Distribuição de Custos</CardTitle></CardHeader>
          <CardContent>
            {costBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {costBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Per batch details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Desempenho por Lote</CardTitle>
            <Button size="sm" variant="outline" onClick={() => { exportPDF(); }}>
              <FileText className="w-4 h-4 mr-1" /> Exportar PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {batchFinancials.map(b => (
              <div key={b.id} className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">{b.batch_name}</h4>
                    <Badge variant={b.profit >= 0 ? 'default' : 'destructive'} className="text-xs">
                      {b.profit >= 0 ? 'Lucro' : 'Prejuízo'}
                    </Badge>
                  </div>
                  <span className={`font-bold ${b.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(b.profit)}
                  </span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Receita:</span> <span className="font-medium">{formatCurrency(b.revenue)}</span></div>
                  <div><span className="text-muted-foreground">Insumos:</span> <span className="font-medium">{formatCurrency(b.inputCost)}</span></div>
                  <div><span className="text-muted-foreground">Operacional:</span> <span className="font-medium">{formatCurrency(b.opCost)}</span></div>
                  <div><span className="text-muted-foreground">Margem:</span> <span className="font-medium">{b.margin.toFixed(1)}%</span></div>
                  <div><span className="text-muted-foreground">FCR:</span> <span className="font-medium">{b.fcr || '—'}</span></div>
                  <div><span className="text-muted-foreground">Ração:</span> <span className="font-medium">{b.totalFeed.toFixed(0)} kg</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoultryFinancialTab;
