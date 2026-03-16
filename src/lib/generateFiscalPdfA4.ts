import jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/formatters';

interface FiscalPdfOptions {
  companyName: string;
  companyNif?: string;
  companyAddress?: string;
  companyPhone?: string;
  regime: { label: string; rate: number; description: string };
  periodLabel: string;
  totalRevenue: number;
  totalDiscount: number;
  taxDue: number;
  netRevenue: number;
  totalSales: number;
  byMethod: Record<string, number>;
  getMethodLabel: (m: string) => string;
}

const getMethodLabelDefault = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Dinheiro', mpesa: 'M-Pesa', emola: 'E-mola', card: 'Cartão',
  };
  return labels[method] || method;
};

export const generateFiscalPdfA4 = (options: FiscalPdfOptions): jsPDF => {
  const {
    companyName, companyNif = '', companyAddress = '', companyPhone = '',
    regime, periodLabel, totalRevenue, totalDiscount, taxDue, netRevenue,
    totalSales, byMethod, getMethodLabel = getMethodLabelDefault,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  if (companyAddress) { doc.text(companyAddress, pageWidth / 2, y, { align: 'center' }); y += 4; }
  if (companyPhone) { doc.text(`Tel: ${companyPhone}`, pageWidth / 2, y, { align: 'center' }); y += 4; }
  if (companyNif) { doc.text(`NUIT: ${companyNif}`, pageWidth / 2, y, { align: 'center' }); y += 4; }
  y += 4;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('RELATÓRIO FISCAL', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(12);
  doc.text(`${regime.label} — ${regime.rate}%`, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(regime.description, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Período: ${periodLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-MZ')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Summary section
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

  drawRow('Total Faturado', formatCurrency(totalRevenue));
  drawRow('Total de Vendas', `${totalSales} vendas`);
  drawRow('Descontos Concedidos', formatCurrency(totalDiscount));
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(margin + 5, y, pageWidth - margin, y);
  y += 5;
  drawRow(`Imposto Devido (${regime.label} ${regime.rate}%)`, formatCurrency(taxDue), true);
  drawRow('Receita Líquida', formatCurrency(netRevenue), true);
  y += 6;

  // Payment methods table
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('FATURAÇÃO POR MÉTODO DE PAGAMENTO', margin, y);
  y += 8;

  // Table header
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.text('Método', margin + 5, y);
  doc.text('Valor', margin + contentWidth * 0.5, y, { align: 'right' });
  doc.text('Imposto', margin + contentWidth * 0.75, y, { align: 'right' });
  doc.text('% do Total', pageWidth - margin, y, { align: 'right' });
  y += 2;
  doc.line(margin + 5, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('times', 'normal');
  const methods = Object.entries(byMethod);
  if (methods.length === 0) {
    doc.text('Sem dados para o período selecionado', pageWidth / 2, y, { align: 'center' });
    y += 6;
  } else {
    for (const [method, value] of methods) {
      const tax = value * (regime.rate / 100);
      const pct = totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : '0.0';
      doc.text(getMethodLabel(method), margin + 5, y);
      doc.text(formatCurrency(value), margin + contentWidth * 0.5, y, { align: 'right' });
      doc.text(formatCurrency(tax), margin + contentWidth * 0.75, y, { align: 'right' });
      doc.text(`${pct}%`, pageWidth - margin, y, { align: 'right' });
      y += 6;
    }
  }

  // Footer
  const footerY = pageHeight - margin;
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Documento gerado pelo NAVANHULA CLOUD', pageWidth / 2, footerY - 7, { align: 'center' });
  doc.text('Este documento é meramente informativo e não substitui a declaração fiscal oficial.', pageWidth / 2, footerY - 3, { align: 'center' });
  doc.text(`Impresso em: ${new Date().toLocaleString('pt-MZ')}`, pageWidth / 2, footerY + 1, { align: 'center' });

  return doc;
};

export const downloadFiscalPdfA4 = (options: FiscalPdfOptions) => {
  const doc = generateFiscalPdfA4(options);
  doc.save(`relatorio_fiscal_${options.regime.label}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
