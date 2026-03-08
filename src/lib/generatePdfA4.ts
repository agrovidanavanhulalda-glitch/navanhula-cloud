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
}

/**
 * Generate a professional A4 PDF receipt
 * - Font: Times (built-in jsPDF font closest to Times New Roman)
 * - Margins: 2.5cm (~71pt)
 * - Logo at top
 * - Full fiscal data
 * - Fixed footer
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
  } = options;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 25; // 2.5cm
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Use Times font (built-in)
  doc.setFont('times', 'normal');

  // ============ HEADER ============
  // Store name
  doc.setFontSize(20);
  doc.setFont('times', 'bold');
  doc.text(storeName, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // Company name if different
  if (companyName && companyName !== storeName) {
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 5;
  }

  // Store details
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  if (storeAddress) {
    doc.text(storeAddress, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (storePhone) {
    doc.text(`Tel: ${storePhone}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  // Fiscal data
  if (storeNuit) {
    doc.text(`NUIT: ${storeNuit}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }
  if (fiscalRegime) {
    doc.text(`Regime: ${fiscalRegime.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
  }

  y += 3;

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ============ DOCUMENT INFO ============
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.text('RECIBO DE VENDA', pageWidth / 2, y, { align: 'center' });
  y += 8;

  const receiptNumber = new Date(sale.createdAt).getTime().toString(36).toUpperCase().slice(-6);
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('pt-MZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.text(`Nº: ${receiptNumber}`, margin, y);
  doc.text(`Data: ${formatDate(sale.createdAt)}`, pageWidth - margin, y, { align: 'right' });
  y += 5;

  const paymentNames: Record<string, string> = {
    cash: 'Dinheiro', card: 'Cartão', mpesa: 'M-Pesa', emola: 'E-Mola', voucher: 'Voucher',
  };
  doc.text(`Pagamento: ${paymentNames[sale.paymentMethod || 'cash'] || sale.paymentMethod || 'Dinheiro'}`, margin, y);
  if (sale.sellerName) {
    doc.text(`Vendedor: ${sale.sellerName}`, pageWidth - margin, y, { align: 'right' });
  }
  y += 8;

  // ============ TABLE HEADER ============
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.text('Produto', margin, y);
  doc.text('Qtd', margin + contentWidth * 0.55, y, { align: 'center' });
  doc.text('Preço', margin + contentWidth * 0.72, y, { align: 'right' });
  doc.text('Total', pageWidth - margin, y, { align: 'right' });
  y += 2;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // ============ TABLE ITEMS ============
  doc.setFont('times', 'normal');
  doc.setFontSize(10);

  for (const item of sale.items) {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    const productName = item.product.name.length > 35
      ? item.product.name.substring(0, 35) + '...'
      : item.product.name;

    doc.text(productName, margin, y);
    doc.text(`${item.quantity}`, margin + contentWidth * 0.55, y, { align: 'center' });
    doc.text(formatCurrency(item.product.salePrice), margin + contentWidth * 0.72, y, { align: 'right' });
    doc.text(formatCurrency(item.total), pageWidth - margin, y, { align: 'right' });

    if (item.discount > 0) {
      y += 4;
      doc.setFontSize(8);
      doc.text(`  Desconto: -${formatCurrency(item.discount)}`, margin, y);
      doc.setFontSize(10);
    }

    y += 5;
  }

  // ============ TOTALS ============
  y += 3;
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.text('Subtotal:', margin + contentWidth * 0.55, y, { align: 'right' });
  doc.text(formatCurrency(sale.subtotal), pageWidth - margin, y, { align: 'right' });
  y += 5;

  if (sale.discount > 0) {
    doc.text('Desconto:', margin + contentWidth * 0.55, y, { align: 'right' });
    doc.text(`-${formatCurrency(sale.discount)}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
  }

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.text('TOTAL:', margin + contentWidth * 0.55, y, { align: 'right' });
  doc.text(formatCurrency(sale.total), pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Payment info
  if (sale.amountReceived && sale.amountReceived > sale.total) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Valor recebido: ${formatCurrency(sale.amountReceived)}`, margin, y);
    y += 5;
    doc.text(`Troco: ${formatCurrency(sale.changeGiven || 0)}`, margin, y);
    y += 8;
  }

  // ============ FOOTER (fixed at bottom) ============
  const footerY = pageHeight - margin;

  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Documento gerado pelo NAVANHULA ERP', pageWidth / 2, footerY - 7, { align: 'center' });
  doc.text('Obrigado pela preferência!', pageWidth / 2, footerY - 3, { align: 'center' });
  doc.text(`Impresso em: ${new Date().toLocaleString('pt-MZ')}`, pageWidth / 2, footerY + 1, { align: 'center' });

  return doc;
};

/**
 * Download the PDF
 */
export const downloadPdfA4 = (options: PdfOptions) => {
  const doc = generatePdfA4(options);
  const receiptNumber = new Date(options.sale.createdAt).getTime().toString(36).toUpperCase().slice(-6);
  doc.save(`recibo-${receiptNumber}.pdf`);
};
