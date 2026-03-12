import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LocalSale, LocalStore } from '@/contexts/LocalPOSContext';
import jsPDF from 'jspdf';

// RELATÓRIO PDF/A4 - Layout profissional para impressão em papel A4

interface PDFReportProps {
  sales: LocalSale[];
  stores: LocalStore[];
  startDate: string;
  endDate: string;
  selectedStore: string;
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
  const { sales, stores, startDate, endDate, selectedStore, companyName = 'NAVANHULA ERP' } = props;

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (saleDate < start || saleDate > end) return false;
    if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
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

// Export as text file (PDF-like)
export const exportPDFReport = (props: PDFReportProps) => {
  const content = generatePDFContent(props);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_vendas_${props.startDate}_${props.endDate}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export as Excel CSV
export const exportExcelReport = (props: PDFReportProps) => {
  const { sales, stores, startDate, endDate, selectedStore } = props;

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (saleDate < start || saleDate > end) return false;
    if (selectedStore !== 'all' && sale.storeId !== selectedStore) return false;
    return sale.status === 'completed';
  });

  // Headers
  const headers = [
    'Data',
    'Hora',
    'Loja',
    'Vendedor',
    'Pagamento',
    'Itens',
    'Subtotal',
    'Desconto',
    'Total',
    'Lucro'
  ];

  // Rows
  const rows = filteredSales.map(sale => {
    const date = new Date(sale.createdAt);
    const store = stores.find(s => s.id === sale.storeId);
    const itemsCount = sale.items.reduce((acc, item) => acc + item.quantity, 0);
    const profit = sale.items.reduce((acc, item) => {
      return acc + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);

    return [
      date.toLocaleDateString('pt-MZ'),
      date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
      store?.name || 'Loja Principal',
      sale.sellerName || 'Operador',
      getPaymentLabel(sale.paymentMethod || 'cash'),
      itemsCount.toString(),
      sale.subtotal.toFixed(2),
      sale.discount.toFixed(2),
      sale.total.toFixed(2),
      profit.toFixed(2),
    ];
  });

  // Build CSV
  const csv = [
    headers.join(';'),
    ...rows.map(r => r.join(';'))
  ].join('\n');

  // Add BOM for Excel to recognize UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vendas_${startDate}_${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
