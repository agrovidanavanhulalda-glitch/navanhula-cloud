import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale, LocalStore } from '@/contexts/LocalPOSContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// RELATÓRIO PDF/A4 - Layout profissional para impressão em papel A4

interface PDFReportProps {
  sales: LocalSale[];
  stores: LocalStore[];
  startDate: string;
  endDate: string;
  selectedStore: string;
  selectedSeller?: string;
  companyName?: string;
}

// Human readable payment method
const getPaymentLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Dinheiro';
    case 'card': return 'Cartão';
    case 'mpesa': return 'M-Pesa';
    case 'emola': return 'E-Mola';
    default: return 'Outro';
  }
};

// Generate PDF content
export const generatePDFContent = (props: PDFReportProps): string => {
  const { sales, stores, startDate, endDate, selectedStore, selectedSeller = 'all', companyName = 'NAVANHULA CLOUD' } = props;

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (saleDate < start || saleDate > end) return false;
    if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
    if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return false;
    return sale.status === 'completed';
  });

  // Calculate stats
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
  const totalProfit = filteredSales.reduce((acc, sale) => {
    return acc + sale.items.reduce((itemAcc, item) => {
      return itemAcc + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);
  }, 0);
  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  // By payment method
  const byPaymentMethod: Record<string, { count: number; total: number }> = {};
  filteredSales.forEach(sale => {
    const method = sale.paymentMethod || 'cash';
    if (!byPaymentMethod[method]) {
      byPaymentMethod[method] = { count: 0, total: 0 };
    }
    byPaymentMethod[method].count++;
    byPaymentMethod[method].total += sale.total;
  });

  // By seller
  const bySeller: Record<string, { count: number; total: number; name: string }> = {};
  filteredSales.forEach(sale => {
    const sellerId = sale.sellerId || 'unknown';
    const sellerName = sale.sellerName || 'Operador';
    if (!bySeller[sellerId]) {
      bySeller[sellerId] = { count: 0, total: 0, name: sellerName };
    }
    bySeller[sellerId].count++;
    bySeller[sellerId].total += sale.total;
  });

  // Top products
  const productSales: Record<string, { name: string; qty: number; total: number; profit: number }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const pid = item.product.id;
      const profit = (item.product.salePrice - item.product.costPrice) * item.quantity;
      if (!productSales[pid]) {
        productSales[pid] = { name: item.product.name, qty: 0, total: 0, profit: 0 };
      }
      productSales[pid].qty += item.quantity;
      productSales[pid].total += item.total;
      productSales[pid].profit += profit;
    });
  });
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  const storeName = selectedStore === 'all' 
    ? 'Todas as Lojas' 
    : stores.find(s => s.id === selectedStore)?.name || 'Loja Principal';

  const formatDatePT = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-MZ');
  };

  // Build report content
  return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                            ${companyName.padStart(30).padEnd(60)}                            ║
║                         RELATÓRIO DE VENDAS                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

Período: ${formatDatePT(startDate)} a ${formatDatePT(endDate)}
Loja: ${storeName}
Gerado em: ${new Date().toLocaleString('pt-MZ')}

════════════════════════════════════════════════════════════════════════════════
                                    RESUMO GERAL
════════════════════════════════════════════════════════════════════════════════

  Total de Vendas:        ${filteredSales.length.toString().padStart(10)}
  Receita Total:          ${formatCurrency(totalRevenue).padStart(15)}
  Lucro Bruto:            ${formatCurrency(totalProfit).padStart(15)}
  Descontos Concedidos:   ${formatCurrency(totalDiscount).padStart(15)}
  Ticket Médio:           ${formatCurrency(averageTicket).padStart(15)}
  Margem Média:           ${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%

════════════════════════════════════════════════════════════════════════════════
                              POR FORMA DE PAGAMENTO
════════════════════════════════════════════════════════════════════════════════

${Object.entries(byPaymentMethod).map(([method, data]) => 
  `  ${getPaymentLabel(method).padEnd(20)} ${data.count.toString().padStart(5)} vendas    ${formatCurrency(data.total).padStart(15)}`
).join('\n') || '  Sem dados'}

════════════════════════════════════════════════════════════════════════════════
                                  POR VENDEDOR
════════════════════════════════════════════════════════════════════════════════

${Object.values(bySeller).map(seller => 
  `  ${seller.name.padEnd(25)} ${seller.count.toString().padStart(5)} vendas    ${formatCurrency(seller.total).padStart(15)}`
).join('\n') || '  Sem dados'}

════════════════════════════════════════════════════════════════════════════════
                            TOP 15 PRODUTOS MAIS VENDIDOS
════════════════════════════════════════════════════════════════════════════════

  #   Produto                          Qtd.       Total           Lucro
  ─── ────────────────────────────── ────────  ─────────────   ─────────────
${topProducts.map((p, i) => 
  `  ${(i + 1).toString().padStart(2)}. ${p.name.slice(0, 30).padEnd(30)} ${p.qty.toString().padStart(6)}   ${formatCurrency(p.total).padStart(13)}   ${formatCurrency(p.profit).padStart(13)}`
).join('\n') || '  Sem dados'}

════════════════════════════════════════════════════════════════════════════════
                                DETALHAMENTO DE VENDAS
════════════════════════════════════════════════════════════════════════════════

${filteredSales.slice(0, 50).map(sale => {
  const date = new Date(sale.createdAt).toLocaleString('pt-MZ');
  const seller = sale.sellerName || 'Operador';
  const payment = getPaymentLabel(sale.paymentMethod || 'cash');
  return `  ${date}  |  ${seller.padEnd(15)}  |  ${payment.padEnd(10)}  |  ${formatCurrency(sale.total).padStart(12)}`;
}).join('\n') || '  Sem vendas no período'}

${filteredSales.length > 50 ? `\n  ... e mais ${filteredSales.length - 50} vendas não listadas` : ''}

════════════════════════════════════════════════════════════════════════════════
                                    ${companyName}
                            Sistema de Ponto de Venda
════════════════════════════════════════════════════════════════════════════════
`.trim();
};

// Export as real PDF using jsPDF
export const exportPDFReport = async (props: PDFReportProps & { onProgress?: (p: number) => void }) => {
  const { sales, stores, startDate, endDate, selectedStore, selectedSeller = 'all', companyName = 'NAVANHULA CLOUD', onProgress } = props;
  
  if (onProgress) onProgress(10);


  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (saleDate < start || saleDate > end) return false;
    if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
    if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return false;
    return sale.status === 'completed';
  });

  if (onProgress) onProgress(20);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalProfit = filteredSales.reduce((acc, sale) => {
    if (sale.profit != null) return acc + sale.profit;
    return acc + sale.items.reduce((a, i) => a + (i.product.salePrice - i.product.costPrice) * i.quantity, 0);
  }, 0);
  const totalDiscount = filteredSales.reduce((acc, s) => acc + s.discount, 0);
  const averageTicket = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  if (onProgress) onProgress(35);


  const storeName = selectedStore === 'all'
    ? 'Todas as Lojas'
    : stores.find(s => s.id === selectedStore)?.name || 'Loja Principal';

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text(companyName, pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(14);
  doc.text('RELATÓRIO DE VENDAS', pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(`Período: ${new Date(startDate).toLocaleDateString('pt-MZ')} a ${new Date(endDate).toLocaleDateString('pt-MZ')}`, margin, y);
  y += 5;
  doc.text(`Loja: ${storeName}`, margin, y);
  y += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-MZ')}`, margin, y);
  y += 8;

  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Summary
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('RESUMO GERAL', margin, y);
  y += 7;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  const summaryItems = [
    ['Total de Vendas:', String(filteredSales.length)],
    ['Receita Total:', formatCurrency(totalRevenue)],
    ['Lucro Bruto:', formatCurrency(totalProfit)],
    ['Descontos:', formatCurrency(totalDiscount)],
    ['Ticket Médio:', formatCurrency(averageTicket)],
    ['Margem Média:', `${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%`],
  ];
  summaryItems.forEach(([label, val]) => {
    doc.text(label, margin, y);
    doc.text(val, pageWidth - margin, y, { align: 'right' });
    y += 5;
  });
  y += 5;

  // Top products table
  const productSales: Record<string, { name: string; qty: number; total: number; profit: number }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const pid = item.product.id;
      if (!productSales[pid]) productSales[pid] = { name: item.product.name, qty: 0, total: 0, profit: 0 };
      productSales[pid].qty += item.quantity;
      productSales[pid].total += item.total;
      productSales[pid].profit += (item.product.salePrice - item.product.costPrice) * item.quantity;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 15);
  if (onProgress) onProgress(60);


  if (topProducts.length > 0) {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('TOP PRODUTOS', margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.text('Produto', margin, y);
    doc.text('Qtd', margin + contentWidth * 0.55, y, { align: 'center' });
    doc.text('Total', margin + contentWidth * 0.75, y, { align: 'right' });
    doc.text('Lucro', pageWidth - margin, y, { align: 'right' });
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont('times', 'normal');
    topProducts.forEach(p => {
      if (y > 270) { doc.addPage(); y = margin; }
      const name = p.name.length > 35 ? p.name.substring(0, 35) + '...' : p.name;
      doc.text(name, margin, y);
      doc.text(String(p.qty), margin + contentWidth * 0.55, y, { align: 'center' });
      doc.text(formatCurrency(p.total), margin + contentWidth * 0.75, y, { align: 'right' });
      doc.text(formatCurrency(p.profit), pageWidth - margin, y, { align: 'right' });
      y += 5;
    });
  }

  // Footer
  const footerY = 290;
  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.text('Documento gerado pelo NAVANHULA CLOUD', pageWidth / 2, footerY, { align: 'center' });

  if (onProgress) onProgress(100);
  doc.save(`relatorio_vendas_${startDate}_${endDate}.pdf`);
};


// Export as real Excel .xlsx
export const exportExcelReport = async (props: PDFReportProps & { onProgress?: (p: number) => void }) => {
  const { sales, stores, startDate, endDate, selectedStore, selectedSeller = 'all', onProgress } = props;
  if (onProgress) onProgress(10);


  // Filter sales
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (saleDate < start || saleDate > end) return false;
    if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
    if (selectedSeller !== 'all' && sale.sellerId !== selectedSeller) return false;
    return sale.status === 'completed';
  });

  // Prepare data for Excel
  const data = filteredSales.map(sale => {
    const date = new Date(sale.createdAt);
    const store = stores.find(s => s.id === sale.storeId);
    const itemsCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);
    if (onProgress) onProgress(30);
    const profit = sale.items.reduce((acc, item) => {

      return acc + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);
    const revenue = sale.total;
    const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      'Data': date.toLocaleDateString('pt-MZ'),
      'Hora': date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      'Loja': store?.name || 'Loja Principal',
      'Vendedor': sale.sellerName || 'Operador',
      'Pagamento': getPaymentLabel(sale.paymentMethod || 'cash'),
      'Qtd Itens': itemsCount,
      'Subtotal': sale.subtotal,
      'Desconto': sale.discount,
      'Total': revenue,
      'Lucro': profit,
      'Margem (%)': marginPercent.toFixed(2) + '%'
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

  // Add summary sheet
  if (onProgress) onProgress(60);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);

  const totalProfit = filteredSales.reduce((acc, sale) => {
    return acc + sale.items.reduce((a, i) => a + (i.product.salePrice - i.product.costPrice) * i.quantity, 0);
  }, 0);

  const summaryData = [
    { 'Métrica': 'Total de Vendas', 'Valor': filteredSales.length },
    { 'Métrica': 'Receita Total', 'Valor': totalRevenue },
    { 'Métrica': 'Lucro Total', 'Valor': totalProfit },
    { 'Métrica': 'Margem Média (%)', 'Valor': totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) + '%' : '0.00%' },
    { 'Métrica': 'Período', 'Valor': `${startDate} a ${endDate}` }
  ];
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Resumo");

  // Add product margins sheet

  const productMargins = props.sales.reduce((acc: any[], sale) => {
    sale.items.forEach(item => {
      const existing = acc.find(i => i.id === item.product.id);
      if (existing) {
        existing.qty += item.quantity;
        existing.total += item.total;
        existing.profit += (item.product.salePrice - item.product.costPrice) * item.quantity;
      } else {
        const profit = (item.product.salePrice - item.product.costPrice) * item.quantity;
        acc.push({
          id: item.product.id,
          'Produto': item.product.name,
          'Preço Custo': item.product.costPrice,
          'Preço Venda': item.product.salePrice,
          'Margem Unitária': item.product.salePrice - item.product.costPrice,
          'Margem (%)': item.product.costPrice > 0 ? ((item.product.salePrice - item.product.costPrice) / item.product.costPrice * 100).toFixed(2) + '%' : '0%',
          qty: item.quantity,
          total: item.total,
          profit: profit
        });
      }
    });
    return acc;
  }, []).map(p => ({
    'Produto': p.Produto,
    'Preço Custo': p['Preço Custo'],
    'Preço Venda': p['Preço Venda'],
    'Margem Unitária': p['Margem Unitária'],
    'Margem (%)': p['Margem (%)'],
    'Qtd Vendida': p.qty,
    'Total Receita': p.total,
    'Lucro Total': p.profit
  }));

  const marginWorksheet = XLSX.utils.json_to_sheet(productMargins);
  XLSX.utils.book_append_sheet(workbook, marginWorksheet, "Margens de Produtos");

  // Export
  if (onProgress) onProgress(100);
  XLSX.writeFile(workbook, `relatorio_vendas_margens_${startDate}_${endDate}.xlsx`);
};


// Component for preview/print
const PDFReportPreview: React.FC<PDFReportProps & { onClose: () => void }> = (props) => {
  const content = generatePDFContent(props);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              font-size: 11px;
              line-height: 1.4;
              padding: 20px;
              white-space: pre-wrap;
            }
            @media print {
              @page { margin: 15mm; size: A4; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-card border rounded-lg shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-lg">Relatório de Vendas</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportExcelReport(props)}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => exportPDFReport(props)}>
              <FileText className="w-4 h-4 mr-2" />
              TXT
            </Button>
            <Button onClick={handlePrint}>
              <FileText className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="ghost" onClick={props.onClose}>
              Fechar
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-white text-black">
          <pre className="font-mono text-xs whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
};

export default PDFReportPreview;
