import jsPDF from 'jspdf';
import { formatCurrency } from '@/lib/formatters';

export interface PurchaseOrderPdfData {
  orderNumber: string;
  orderDate: string;
  companyName: string;
  companyNuit?: string;
  companyPhone?: string;
  companyAddress?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  items: {
    name: string;
    quantity: number;
    unitCost: number;
    total: number;
  }[];
  total: number;
  notes?: string;
  status: string;
}

export const generatePurchaseOrderPdf = (data: PurchaseOrderPdfData): jsPDF => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ===== HEADER BAR =====
  doc.setFillColor(30, 58, 138); // dark blue
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(data.companyName, margin, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const headerDetails: string[] = [];
  if (data.companyNuit) headerDetails.push(`NUIT: ${data.companyNuit}`);
  if (data.companyPhone) headerDetails.push(`Tel: ${data.companyPhone}`);
  if (data.companyAddress) headerDetails.push(data.companyAddress);
  doc.text(headerDetails.join('  |  '), margin, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO DE COMPRA', pageWidth - margin, 15, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${data.orderNumber}`, pageWidth - margin, 22, { align: 'right' });
  doc.text(data.orderDate, pageWidth - margin, 28, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  y = 45;

  // ===== SUPPLIER BOX =====
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('FORNECEDOR', margin + 5, y + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(data.supplierName, margin + 5, y + 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const supplierInfo: string[] = [];
  if (data.supplierPhone) supplierInfo.push(`Tel: ${data.supplierPhone}`);
  if (data.supplierEmail) supplierInfo.push(data.supplierEmail);
  if (data.supplierAddress) supplierInfo.push(data.supplierAddress);
  if (supplierInfo.length > 0) {
    doc.text(supplierInfo.join('  |  '), margin + 5, y + 22);
  }

  y += 38;

  // ===== TABLE HEADER =====
  doc.setFillColor(30, 58, 138);
  doc.rect(margin, y, contentWidth, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PRODUTO', margin + 3, y + 5.5);
  doc.text('QTD', margin + contentWidth * 0.6, y + 5.5, { align: 'center' });
  doc.text('PREÇO UNIT.', margin + contentWidth * 0.78, y + 5.5, { align: 'right' });
  doc.text('TOTAL', pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 8;
  doc.setTextColor(0, 0, 0);

  // ===== TABLE ROWS =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  data.items.forEach((item, i) => {
    const rowY = y + (i * 8);
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, rowY, contentWidth, 8, 'F');
    }

    const name = item.name.length > 40 ? item.name.substring(0, 40) + '...' : item.name;
    doc.text(name, margin + 3, rowY + 5.5);
    doc.text(String(item.quantity), margin + contentWidth * 0.6, rowY + 5.5, { align: 'center' });
    doc.text(formatCurrency(item.unitCost), margin + contentWidth * 0.78, rowY + 5.5, { align: 'right' });
    doc.text(formatCurrency(item.total), pageWidth - margin - 3, rowY + 5.5, { align: 'right' });
  });

  y += data.items.length * 8 + 2;

  // ===== TOTAL =====
  doc.setLineWidth(0.5);
  doc.line(margin + contentWidth * 0.55, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', margin + contentWidth * 0.65, y, { align: 'right' });
  doc.text(formatCurrency(data.total), pageWidth - margin - 3, y, { align: 'right' });
  y += 12;

  // ===== NOTES =====
  if (data.notes) {
    doc.setFillColor(255, 250, 230);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 100, 30);
    doc.text('OBSERVAÇÕES', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const noteLines = doc.splitTextToSize(data.notes, contentWidth - 8);
    doc.text(noteLines.slice(0, 2), margin + 4, y + 11);
    y += 22;
  }

  // ===== FOOTER =====
  const footerY = 280;
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento gerado pelo NAVANHULA CLOUD', pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-MZ')}`, pageWidth / 2, footerY + 9, { align: 'center' });

  return doc;
};

export const downloadPurchaseOrderPdf = (data: PurchaseOrderPdfData) => {
  const doc = generatePurchaseOrderPdf(data);
  doc.save(`pedido-compra-${data.orderNumber}.pdf`);
};
