import jsPDF from 'jspdf';
import { LocalSale } from '@/contexts/LocalPOSContext';
import { formatCurrency } from '@/lib/formatters';

interface PdfOptions {
  sale: LocalSale;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeNuit?: string;
  fiscalRegime?: string;
  companyName?: string;
  logoUrl?: string;
  documentType?: 'invoice' | 'invoice_receipt' | 'receipt' | 'proforma';
  documentNumber?: string;
  customerNuit?: string;
  taxRate?: number;
}

const DOC_TITLES: Record<string, string> = {
  invoice: 'FATURA',
  invoice_receipt: 'FATURA-RECIBO',
  receipt: 'RECIBO',
  proforma: 'PROFORMA',
};

const DOC_PREFIXES: Record<string, string> = {
  invoice: 'FT',
  invoice_receipt: 'FR',
  receipt: 'RC',
  proforma: 'PRO',
};

/**
 * Professional A4 PDF — International standard layout
 * - Clean header with company identity
 * - Proper fiscal fields (NUIT, document number, payment method, status)
 * - Automatic sequential numbering (FAT-0001, REC-0001)
 * - Tax breakdown
 * - Footer with legal note
 */
export const generatePdfA4 = (options: PdfOptions): jsPDF => {
  const {
    sale,
    storeName,
    storeAddress = '',
    storePhone = '',
    storeNuit = '',
    fiscalRegime = '',
    companyName = '',
    documentType = 'invoice_receipt',
    documentNumber,
    customerNuit = '',
    taxRate = 0,
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 210;
  const ph = 297;
  const ml = 20; // left margin
  const mr = 20; // right margin
  const cw = pw - ml - mr;
  let y = 20;

  const gray = '#64748b';
  const dark = '#0f172a';
  const accent = '#1e40af';
  const lightBg = '#f8fafc';

  // ─── HEADER BAR ───
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pw, 38, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName || storeName, ml, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 225);
  const headerDetails: string[] = [];
  if (storeAddress) headerDetails.push(storeAddress);
  if (storePhone) headerDetails.push(`Tel: ${storePhone}`);
  if (storeNuit) headerDetails.push(`NUIT: ${storeNuit}`);
  if (fiscalRegime) headerDetails.push(`Regime: ${fiscalRegime.toUpperCase()}`);
  doc.text(headerDetails.join('  |  '), ml, 24);

  // Store name (if different from company)
  if (companyName && companyName !== storeName) {
    doc.text(`Loja: ${storeName}`, ml, 31);
  }

  y = 48;

  // ─── DOCUMENT TITLE & NUMBER ───
  const docTitle = DOC_TITLES[documentType] || 'DOCUMENTO';
  const docPrefix = DOC_PREFIXES[documentType] || 'DOC';
  const docNum = documentNumber || `${docPrefix}-${new Date(sale.createdAt).getTime().toString(36).toUpperCase().slice(-6)}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(accent);
  doc.text(docTitle, ml, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(gray);
  doc.text(`Nº ${docNum}`, pw - mr, y, { align: 'right' });
  y += 10;

  // ─── STATUS BADGE ───
  doc.setFillColor(220, 252, 231); // green-100
  doc.roundedRect(pw - mr - 30, y - 4, 30, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text('EMITIDO', pw - mr - 15, y + 1, { align: 'center' });

  y += 10;

  // ─── INFO GRID ───
  const formatDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatTime = (d: Date | string) =>
    new Date(d).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });

  const paymentNames: Record<string, string> = {
    cash: 'Numerário', card: 'Cartão', mpesa: 'M-Pesa', emola: 'e-Mola', voucher: 'Voucher',
  };

  const customerName = sale.paymentDetails?.voucherDetails?.customerName || 'Consumidor Final';

  // Left column: Customer info
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(ml, y, cw / 2 - 3, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(gray);
  doc.text('CLIENTE', ml + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(dark);
  doc.text(customerName, ml + 4, y + 12);
  if (customerNuit) {
    doc.setFontSize(8);
    doc.setTextColor(gray);
    doc.text(`NUIT: ${customerNuit}`, ml + 4, y + 18);
  }
  if (sale.paymentDetails?.voucherDetails?.phoneNumber) {
    doc.setFontSize(8);
    doc.setTextColor(gray);
    doc.text(`Tel: ${sale.paymentDetails.voucherDetails.phoneNumber}`, ml + 4, y + 24);
  }

  // Right column: Document info
  const rx = ml + cw / 2 + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rx, y, cw / 2 - 3, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(gray);
  doc.text('DETALHES DO DOCUMENTO', rx + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(dark);
  doc.text(`Data: ${formatDate(sale.createdAt)}  ${formatTime(sale.createdAt)}`, rx + 4, y + 12);
  doc.text(`Pagamento: ${paymentNames[sale.paymentMethod || 'cash'] || sale.paymentMethod || 'Numerário'}`, rx + 4, y + 18);
  if (sale.sellerName) {
    doc.text(`Operador: ${sale.sellerName}`, rx + 4, y + 24);
  }

  y += 40;

  // ─── TABLE HEADER ───
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(ml, y, cw, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(gray);
  const colItem = ml + 4;
  const colQty = ml + cw * 0.55;
  const colPrice = ml + cw * 0.72;
  const colTotal = pw - mr - 4;
  doc.text('ITEM', colItem, y + 5.5);
  doc.text('QTD', colQty, y + 5.5, { align: 'center' });
  doc.text('PREÇO UNIT.', colPrice, y + 5.5, { align: 'right' });
  doc.text('TOTAL', colTotal, y + 5.5, { align: 'right' });
  y += 10;

  // ─── TABLE ITEMS ───
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(dark);

  for (let i = 0; i < sale.items.length; i++) {
    if (y > ph - 65) {
      doc.addPage();
      y = 20;
    }

    const item = sale.items[i];
    const name = item.product.name.length > 40
      ? item.product.name.substring(0, 40) + '...'
      : item.product.name;

    // Alternate row background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(ml, y - 3.5, cw, 7, 'F');
    }

    doc.setTextColor(dark);
    doc.text(name, colItem, y);
    doc.text(`${item.quantity}`, colQty, y, { align: 'center' });
    doc.text(formatCurrency(item.product.salePrice), colPrice, y, { align: 'right' });
    doc.text(formatCurrency(item.total), colTotal, y, { align: 'right' });

    if (item.discount > 0) {
      y += 4;
      doc.setFontSize(7);
      doc.setTextColor(220, 38, 38); // red-600
      doc.text(`  Desconto: -${formatCurrency(item.discount)}`, colItem, y);
      doc.setFontSize(9);
    }

    y += 7;
  }

  // ─── TOTALS ───
  y += 3;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(ml + cw * 0.45, y, pw - mr, y);
  y += 6;

  const totalsX = ml + cw * 0.6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(gray);
  doc.text('Subtotal', totalsX, y, { align: 'right' });
  doc.setTextColor(dark);
  doc.text(formatCurrency(sale.subtotal), colTotal, y, { align: 'right' });
  y += 5;

  if (sale.discount > 0) {
    doc.setTextColor(gray);
    doc.text('Desconto', totalsX, y, { align: 'right' });
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatCurrency(sale.discount)}`, colTotal, y, { align: 'right' });
    y += 5;
  }

  if (taxRate > 0) {
    const taxAmount = Math.round(sale.subtotal * taxRate / 100 * 100) / 100;
    doc.setTextColor(gray);
    doc.text(`IVA (${taxRate}%)`, totalsX, y, { align: 'right' });
    doc.setTextColor(dark);
    doc.text(formatCurrency(taxAmount), colTotal, y, { align: 'right' });
    y += 5;
  }

  // Total highlight
  y += 2;
  doc.setFillColor(30, 64, 175); // blue-800
  doc.roundedRect(ml + cw * 0.45, y - 4, cw * 0.55, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', totalsX, y + 2.5, { align: 'right' });
  doc.text(formatCurrency(sale.total), colTotal, y + 2.5, { align: 'right' });
  y += 14;

  // Payment info
  if (sale.amountReceived && sale.amountReceived > sale.total) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text(`Valor recebido: ${formatCurrency(sale.amountReceived)}`, ml, y);
    y += 4;
    doc.text(`Troco: ${formatCurrency(sale.changeGiven || 0)}`, ml, y);
    y += 8;
  }

  // ─── FOOTER ───
  const footerY = ph - 18;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(ml, footerY - 8, pw - mr, footerY - 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(gray);
  doc.text('Documento processado por computador — NAVANHULA CLOUD ERP', pw / 2, footerY - 3, { align: 'center' });
  doc.text('Este documento serve de comprovativo fiscal nos termos da legislação moçambicana.', pw / 2, footerY + 1, { align: 'center' });
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-MZ')}`, pw / 2, footerY + 5, { align: 'center' });

  return doc;
};

/**
 * Download the PDF
 */
export const downloadPdfA4 = (options: PdfOptions) => {
  const prefix = DOC_PREFIXES[options.documentType || 'invoice_receipt'] || 'DOC';
  const docNum = options.documentNumber || new Date(options.sale.createdAt).getTime().toString(36).toUpperCase().slice(-6);
  const doc = generatePdfA4(options);
  doc.save(`${prefix}-${docNum}.pdf`);
};
