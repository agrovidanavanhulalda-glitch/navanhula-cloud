import jsPDF from 'jspdf';

export interface InvoicePdfInput {
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  paid_at?: string | null;
  status: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency?: string;
  plan_tier?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  company_name?: string;
  company_nif?: string;
  period_start?: string | null;
  period_end?: string | null;
}

const money = (n: number, cur = 'MT') =>
  `${Number(n ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur}`;

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-PT') : '—');

export const generateInvoicePdf = (inv: InvoicePdfInput): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const cur = inv.currency || 'MT';

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('NAVANHULA CLOUD', 15, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Sistema Empresarial', 15, 22);
  doc.text('www.navanhula.cloud', 15, 27);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FATURA', 195, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(inv.invoice_number, 195, 25, { align: 'right' });

  // Meta box
  doc.setTextColor(15, 23, 42);
  let y = 45;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente', 15, y);
  doc.text('Detalhes', 120, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(inv.company_name || '—', 15, y);
  doc.text(`Emissão: ${fmtDate(inv.issue_date)}`, 120, y);
  y += 5;
  if (inv.company_nif) doc.text(`NUIT: ${inv.company_nif}`, 15, y);
  doc.text(`Vencimento: ${fmtDate(inv.due_date)}`, 120, y);
  y += 5;
  doc.text(`Estado: ${inv.status.toUpperCase()}`, 120, y);
  y += 5;
  if (inv.paid_at) {
    doc.text(`Pago em: ${fmtDate(inv.paid_at)}`, 120, y);
    y += 5;
  }

  // Line items table
  y += 8;
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y - 5, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Descrição', 18, y);
  doc.text('Período', 110, y);
  doc.text('Valor', 192, y, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  const description = `Assinatura NAVANHULA CLOUD${inv.plan_tier ? ` — Plano ${inv.plan_tier.toUpperCase()}` : ''}`;
  doc.text(description, 18, y);
  const period =
    inv.period_start && inv.period_end
      ? `${fmtDate(inv.period_start)} → ${fmtDate(inv.period_end)}`
      : '—';
  doc.text(period, 110, y);
  doc.text(money(inv.amount, cur), 192, y, { align: 'right' });

  // Totals
  y += 20;
  doc.setDrawColor(226, 232, 240);
  doc.line(120, y, 195, y);
  y += 6;
  doc.setFontSize(10);
  doc.text('Subtotal', 120, y);
  doc.text(money(inv.amount, cur), 192, y, { align: 'right' });
  y += 6;
  doc.text('Impostos', 120, y);
  doc.text(money(inv.tax_amount, cur), 192, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL', 120, y);
  doc.text(money(inv.total_amount, cur), 192, y, { align: 'right' });

  // Payment info
  if (inv.payment_method || inv.payment_reference) {
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Pagamento', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    if (inv.payment_method) {
      doc.text(`Método: ${inv.payment_method}`, 15, y);
      y += 5;
    }
    if (inv.payment_reference) {
      doc.text(`Referência: ${inv.payment_reference}`, 15, y);
      y += 5;
    }
  }

  if (inv.notes) {
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Notas', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(inv.notes, 180);
    doc.text(lines, 15, y);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Documento gerado eletronicamente por NAVANHULA CLOUD.', 105, 285, { align: 'center' });
  doc.text(`Emitido em ${new Date().toLocaleString('pt-PT')}`, 105, 289, { align: 'center' });

  return doc;
};

export const downloadInvoicePdf = (inv: InvoicePdfInput) => {
  const doc = generateInvoicePdf(inv);
  doc.save(`${inv.invoice_number}.pdf`);
};
