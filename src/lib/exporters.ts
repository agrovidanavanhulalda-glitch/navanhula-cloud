import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportRow = Record<string, string | number | null | undefined>;

export interface ExportOptions {
  filename: string;      // sem extensão
  title?: string;        // usado em PDF
  sheetName?: string;    // usado em Excel
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function exportCSV(rows: ExportRow[], opts: ExportOptions) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => escape(r[h])).join(';')),
  ].join('\n');
  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `${opts.filename}.csv`);
}

export function exportExcel(rows: ExportRow[], opts: ExportOptions) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName ?? 'Dados');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  triggerDownload(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${opts.filename}.xlsx`);
}

export function exportPDF(rows: ExportRow[], opts: ExportOptions) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(opts.title ?? opts.filename, 40, 40);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString('pt-PT'), 40, 56);
  autoTable(doc, {
    startY: 72,
    head: [headers],
    body: rows.map(r => headers.map(h => (r[h] ?? '') as any)),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 52, 96], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });
  doc.save(`${opts.filename}.pdf`);
}

export function exportAll(format: 'csv' | 'xlsx' | 'pdf', rows: ExportRow[], opts: ExportOptions) {
  if (format === 'csv') return exportCSV(rows, opts);
  if (format === 'xlsx') return exportExcel(rows, opts);
  return exportPDF(rows, opts);
}
