import jsPDF from 'jspdf';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';

export type FiscalDocumentType =
  | 'quotation'
  | 'proforma'
  | 'invoice'
  | 'invoice_receipt'
  | 'receipt'
  | 'credit_note'
  | 'debit_note';

export interface FiscalDocumentPdfItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  line_total: number;
}

export interface FiscalDocumentPdfRecord {
  id: string;
  document_type: FiscalDocumentType;
  document_number: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_nuit?: string | null;
  customer_address?: string | null;
  issue_date: string;
  valid_until?: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  notes?: string | null;
  fiscal_document_items: FiscalDocumentPdfItem[];
}

interface PdfCompany {
  name: string;
  nif?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  logo_url?: string | null;
  fiscal_regime?: string | null;
}

interface PdfStore {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  city?: string | null;
}

interface GenerateFiscalDocumentPdfOptions {
  document: FiscalDocumentPdfRecord;
  company?: PdfCompany | null;
  store?: PdfStore | null;
}

const DOCUMENT_LABELS: Record<FiscalDocumentType, string> = {
  quotation: 'COTAÇÃO',
  proforma: 'FACTURA PROFORMA',
  invoice: 'FACTURA',
  invoice_receipt: 'FACTURA-RECIBO',
  receipt: 'RECIBO',
  credit_note: 'NOTA DE CRÉDITO',
  debit_note: 'NOTA DE DÉBITO',
};

const drawTextRow = (doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth = 75) => {
  doc.setFont('times', 'bold');
  doc.text(`${label}:`, x, y);
  doc.setFont('times', 'normal');
  const lines = doc.splitTextToSize(value || '—', maxWidth);
  doc.text(lines, x + 22, y);
  return y + lines.length * 4.2;
};

export const generateFiscalDocumentPdf = ({ document, company, store }: GenerateFiscalDocumentPdfOptions) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const companyName = company?.name || 'Empresa';
  const storeName = store?.name || companyName;
  const title = DOCUMENT_LABELS[document.document_type] || 'DOCUMENTO';

  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text(companyName, margin, y);
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  y += 6;

  if (company?.address) {
    doc.text(company.address, margin, y);
    y += 4;
  }
  if (company?.city) {
    doc.text(company.city, margin, y);
    y += 4;
  }
  if (company?.phone) {
    doc.text(`Tel: ${company.phone}`, margin, y);
    y += 4;
  }
  if (company?.nif) {
    doc.text(`NUIT: ${company.nif}`, margin, y);
    y += 4;
  }
  if (company?.fiscal_regime) {
    doc.text(`Regime: ${String(company.fiscal_regime).toUpperCase()}`, margin, y);
    y += 4;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text(title, pageWidth - margin, margin, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Nº ${document.document_number}`, pageWidth - margin, margin + 7, { align: 'right' });
  doc.text(`Emissão: ${formatDateTime(document.issue_date)}`, pageWidth - margin, margin + 12, { align: 'right' });
  if (document.valid_until) {
    doc.text(`Validade: ${formatDate(document.valid_until)}`, pageWidth - margin, margin + 17, { align: 'right' });
  }

  y += 6;
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text('DADOS DO CLIENTE', margin, y);
  doc.text('DADOS DA LOJA', margin + contentWidth / 2, y);
  y += 6;

  const customerStartY = y;
  const storeStartY = y;

  const customerEndY = [
    drawTextRow(doc, 'Nome', document.customer_name, margin, customerStartY),
    drawTextRow(doc, 'Telefone', document.customer_phone || '—', margin, customerStartY + 6),
    drawTextRow(doc, 'Email', document.customer_email || '—', margin, customerStartY + 12),
    drawTextRow(doc, 'NUIT', document.customer_nuit || '—', margin, customerStartY + 18),
    drawTextRow(doc, 'Endereço', document.customer_address || '—', margin, customerStartY + 24, 65),
  ].reduce((max, value) => Math.max(max, value), customerStartY);

  const storeEndY = [
    drawTextRow(doc, 'Loja', storeName, margin + contentWidth / 2, storeStartY),
    drawTextRow(doc, 'Cidade', store?.city || company?.city || '—', margin + contentWidth / 2, storeStartY + 6),
    drawTextRow(doc, 'Morada', store?.address || company?.address || '—', margin + contentWidth / 2, storeStartY + 12, 65),
    drawTextRow(doc, 'Contacto', store?.phone || company?.phone || '—', margin + contentWidth / 2, storeStartY + 24),
  ].reduce((max, value) => Math.max(max, value), storeStartY);

  y = Math.max(customerEndY, storeEndY) + 6;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Descrição', margin + 2, y + 5.5);
  doc.text('Qtd.', margin + 100, y + 5.5, { align: 'right' });
  doc.text('Preço', margin + 132, y + 5.5, { align: 'right' });
  doc.text('Total', pageWidth - margin - 2, y + 5.5, { align: 'right' });
  y += 12;

  doc.setFont('times', 'normal');
  for (const item of document.fiscal_document_items || []) {
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
    }

    const descriptionLines = doc.splitTextToSize(item.description || 'Item', 88);
    doc.text(descriptionLines, margin + 2, y);
    doc.text(String(item.quantity), margin + 100, y, { align: 'right' });
    doc.text(formatCurrency(Number(item.unit_price || 0)), margin + 132, y, { align: 'right' });
    doc.text(formatCurrency(Number(item.line_total || 0)), pageWidth - margin - 2, y, { align: 'right' });
    y += Math.max(descriptionLines.length * 4.8, 6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  }

  y += 2;
  const totalLabelX = margin + 110;
  doc.setFont('times', 'normal');
  doc.text('Subtotal:', totalLabelX, y, { align: 'right' });
  doc.text(formatCurrency(Number(document.subtotal || 0)), pageWidth - margin, y, { align: 'right' });
  y += 6;
  doc.text(`Imposto (${Number(document.tax_rate || 0).toFixed(2)}%):`, totalLabelX, y, { align: 'right' });
  doc.text(formatCurrency(Number(document.tax_amount || 0)), pageWidth - margin, y, { align: 'right' });
  y += 6;
  doc.text('Desconto:', totalLabelX, y, { align: 'right' });
  doc.text(formatCurrency(Number(document.discount_amount || 0)), pageWidth - margin, y, { align: 'right' });
  y += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', totalLabelX, y, { align: 'right' });
  doc.text(formatCurrency(Number(document.total || 0)), pageWidth - margin, y, { align: 'right' });
  y += 10;

  if (document.notes) {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Observações', margin, y);
    y += 5;
    doc.setFont('times', 'normal');
    const notesLines = doc.splitTextToSize(document.notes, contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4.6 + 3;
  }

  const footerY = Math.max(y + 8, pageHeight - 24);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Documento gerado pelo NAVANHULA POS', pageWidth / 2, footerY - 3, { align: 'center' });
  doc.text('Use este ficheiro para partilha com o cliente ou arquivo interno', pageWidth / 2, footerY + 1, { align: 'center' });

  return doc;
};

export const downloadFiscalDocumentPdf = (options: GenerateFiscalDocumentPdfOptions) => {
  const doc = generateFiscalDocumentPdf(options);
  const filename = `${options.document.document_number}`.toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
  doc.save(`${filename}.pdf`);
};
