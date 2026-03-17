import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SaaSAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Download, Printer, Mail, Trash2,
  Calculator, Loader2, ReceiptText, ScrollText, ArrowRightLeft,
  Save, Eye, Calendar, Building2, Hash
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import DocumentProductPicker, { type DocumentProductOption } from '@/components/settings/DocumentProductPicker';
import { downloadFiscalDocumentPdf, type FiscalDocumentPdfRecord } from '@/lib/generateFiscalDocumentPdf';

type DocType =
  | 'quotation'
  | 'proforma'
  | 'invoice'
  | 'invoice_receipt'
  | 'receipt'
  | 'credit_note'
  | 'debit_note';

const DOC_TYPE_LABELS: Record<DocType, { label: string; prefix: string; icon: React.ElementType }> = {
  invoice: { label: 'Fatura', prefix: 'FAT', icon: FileText },
  receipt: { label: 'Recibo', prefix: 'REC', icon: ReceiptText },
  proforma: { label: 'Proforma', prefix: 'PRO', icon: ScrollText },
  quotation: { label: 'Cotação', prefix: 'COT', icon: ScrollText },
  invoice_receipt: { label: 'Fatura-Recibo', prefix: 'FR', icon: FileText },
  credit_note: { label: 'Nota de Crédito', prefix: 'NC', icon: ArrowRightLeft },
  debit_note: { label: 'Nota de Débito', prefix: 'ND', icon: ArrowRightLeft },
};

interface DocumentItemForm {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

const emptyItem = (): DocumentItemForm => ({
  description: '', quantity: 1, unit_price: 0, tax_rate: 0,
});

interface FiscalDocRow {
  id: string;
  document_type: DocType;
  document_number: string;
  number: number;
  customer_name: string;
  customer_nuit: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total: number;
  status: string;
  issue_date: string;
  valid_until: string | null;
  notes: string | null;
  currency: string;
  company_id: string;
  store_id: string | null;
  series_id: string | null;
  issued_by: string;
  created_at: string;
}

const DocumentsCenterPage: React.FC = () => {
  const { user, company, store } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [documents, setDocuments] = useState<FiscalDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDoc, setShowNewDoc] = useState(false);

  // New document form state
  const [newDocType, setNewDocType] = useState<DocType>('invoice');
  const [customerName, setCustomerName] = useState('');
  const [customerNuit, setCustomerNuit] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<DocumentItemForm[]>([emptyItem()]);
  const [notes, setNotes] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const taxRate = useMemo(() => {
    const regime = (company as any)?.fiscal_regime || 'irpc';
    if (regime === 'iva') return 16;
    if (regime === 'ispc') return 5;
    return 3;
  }, [company]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fiscal_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setDocuments((data as FiscalDocRow[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filteredDocs = useMemo(() => {
    let docs = documents;
    if (activeTab !== 'all') {
      docs = docs.filter(d => d.document_type === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d =>
        d.customer_name.toLowerCase().includes(q) ||
        d.document_number.toLowerCase().includes(q) ||
        (d.customer_nuit && d.customer_nuit.includes(q))
      );
    }
    return docs;
  }, [documents, activeTab, searchQuery]);

  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100);
  const total = subtotal - discountAmount + taxAmount;

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof DocumentItemForm, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleProductSelect = (product: DocumentProductOption) => {
    setItems([...items, {
      description: product.name,
      quantity: 1,
      unit_price: product.salePrice,
      tax_rate: taxRate,
    }]);
  };

  const productOptions: DocumentProductOption[] = useMemo(() => {
    // Will be populated from context if available
    return [];
  }, []);

  const handleSaveDocument = async () => {
    if (!customerName.trim()) { toast.error('Informe o nome do cliente'); return; }
    if (items.length === 0 || items.every(i => !i.description)) { toast.error('Adicione ao menos um item'); return; }
    if (!company || !user) return;

    setSaving(true);
    try {
      // Get or create series
      const { data: seriesData } = await supabase
        .from('document_series')
        .select('id, next_number, prefix')
        .eq('company_id', company.id)
        .eq('document_type', newDocType)
        .eq('is_active', true)
        .limit(1)
        .single();

      let seriesId = seriesData?.id;
      let nextNumber = seriesData?.next_number || 1;
      let prefix = seriesData?.prefix || DOC_TYPE_LABELS[newDocType].prefix;

      if (!seriesId) {
        const { data: newSeries } = await supabase
          .from('document_series')
          .insert({
            company_id: company.id,
            document_type: newDocType,
            prefix,
            next_number: 2,
            store_id: store?.id || null,
          })
          .select('id')
          .single();
        seriesId = newSeries?.id;
        nextNumber = 1;
      } else {
        await supabase
          .from('document_series')
          .update({ next_number: nextNumber + 1 })
          .eq('id', seriesId);
      }

      const docNumber = `${prefix}${String(nextNumber).padStart(6, '0')}`;

      const { data: doc, error } = await supabase
        .from('fiscal_documents')
        .insert({
          company_id: company.id,
          store_id: store?.id || null,
          series_id: seriesId || null,
          issued_by: user.id,
          document_type: newDocType,
          number: nextNumber,
          document_number: docNumber,
          customer_name: customerName,
          customer_nuit: customerNuit || null,
          customer_phone: customerPhone || null,
          customer_email: customerEmail || null,
          customer_address: customerAddress || null,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total,
          notes: notes || null,
          currency: 'MZN',
          status: 'issued',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert items
      const docItems = items.filter(i => i.description.trim()).map(i => ({
        document_id: doc!.id,
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: taxRate,
        line_total: i.quantity * i.unit_price,
      }));

      if (docItems.length > 0) {
        await supabase.from('fiscal_document_items').insert(docItems);
      }

      toast.success(`${DOC_TYPE_LABELS[newDocType].label} ${docNumber} emitida com sucesso!`);
      setShowNewDoc(false);
      resetForm();
      fetchDocuments();
    } catch (e: any) {
      toast.error('Erro ao emitir documento: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerNuit('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setItems([emptyItem()]);
    setNotes('');
    setDiscountAmount(0);
  };

  const handleDownloadPdf = async (doc: FiscalDocRow) => {
    const { data: docItems } = await supabase
      .from('fiscal_document_items')
      .select('*')
      .eq('document_id', doc.id);

    const pdfRecord: FiscalDocumentPdfRecord = {
      id: doc.id,
      document_type: doc.document_type,
      document_number: doc.document_number,
      customer_name: doc.customer_name,
      customer_nuit: doc.customer_nuit,
      customer_phone: doc.customer_phone,
      customer_email: doc.customer_email,
      customer_address: doc.customer_address,
      issue_date: doc.issue_date,
      valid_until: doc.valid_until,
      subtotal: doc.subtotal,
      tax_rate: doc.tax_rate,
      tax_amount: doc.tax_amount,
      discount_amount: doc.discount_amount,
      total: doc.total,
      notes: doc.notes,
      fiscal_document_items: (docItems || []).map((i: any) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
        tax_rate: i.tax_rate,
        line_total: i.line_total,
      })),
    };

    const pdfCompany = company ? {
      name: company.name,
      nif: (company as any)?.nif || null,
      address: (company as any)?.address || null,
      phone: (company as any)?.phone || null,
      email: (company as any)?.email || null,
      logo_url: (company as any)?.logo_url || null,
    } : null;

    downloadFiscalDocumentPdf({ document: pdfRecord, company: pdfCompany });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Centro de Documentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Emita faturas, recibos, proformas e outros documentos empresariais
          </p>
        </div>
        <Dialog open={showNewDoc} onOpenChange={setShowNewDoc}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Emitir Documento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Document Type */}
              <div>
                <Label>Tipo de Documento</Label>
                <Select value={newDocType} onValueChange={(v) => setNewDocType(v as DocType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" /> Dados do Cliente
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div>
                    <Label>NUIT</Label>
                    <Input value={customerNuit} onChange={e => setCustomerNuit(e.target.value)} placeholder="NUIT do cliente" />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+258" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@empresa.com" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Endereço</Label>
                    <Input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Endereço completo" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" /> Itens
                  </h4>
                  <div className="flex gap-2">
                    <DocumentProductPicker products={productOptions} onSelect={handleProductSelect} />
                    <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                      <Plus className="w-3 h-3" /> Item Manual
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="col-span-12 md:col-span-5">
                        <Label className="text-xs">Descrição</Label>
                        <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Produto/serviço" />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <Label className="text-xs">Qtd</Label>
                        <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', +e.target.value)} />
                      </div>
                      <div className="col-span-5 md:col-span-3">
                        <Label className="text-xs">Preço Unit.</Label>
                        <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', +e.target.value)} />
                      </div>
                      <div className="col-span-2 md:col-span-1 text-right text-sm font-medium pt-5">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                      <div className="col-span-1 pt-5">
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Desconto</span>
                  <Input type="number" min="0" className="w-28 h-8 text-right" value={discountAmount}
                    onChange={e => setDiscountAmount(+e.target.value)} />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Imposto ({taxRate}%)</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>Observações</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionais..." rows={2} />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNewDoc(false)}>Cancelar</Button>
                <Button onClick={handleSaveDocument} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Emitir {DOC_TYPE_LABELS[newDocType].label}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pesquisar por cliente, número ou NUIT..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {Object.entries(DOC_TYPE_LABELS).map(([key, val]) => (
            <TabsTrigger key={key} value={key}>{val.label}s</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="font-semibold text-lg">Nenhum documento encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Novo Documento" para emitir o primeiro documento.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map(doc => {
                const typeInfo = DOC_TYPE_LABELS[doc.document_type] || DOC_TYPE_LABELS.invoice;
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={doc.id} className="p-4 hover:border-primary/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{doc.document_number}</p>
                            <Badge variant="secondary" className="text-[10px]">{typeInfo.label}</Badge>
                            <Badge variant={doc.status === 'issued' ? 'default' : doc.status === 'cancelled' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {doc.status === 'issued' ? 'Emitido' : doc.status === 'cancelled' ? 'Anulado' : doc.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {doc.customer_name} · {formatDate(doc.issue_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-sm">{formatCurrency(doc.total)}</p>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => handleDownloadPdf(doc)}>
                          <Download className="w-3.5 h-3.5" /> PDF
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentsCenterPage;
