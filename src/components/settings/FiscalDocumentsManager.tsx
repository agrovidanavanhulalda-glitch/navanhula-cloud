import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/i18n';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Calculator,
  Download,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  Save,
  ScrollText,
  Trash2,
  UserRound,
  Search,
} from 'lucide-react';
import DocumentProductPicker, { type DocumentProductOption } from '@/components/settings/DocumentProductPicker';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters';
import { downloadFiscalDocumentPdf, type FiscalDocumentPdfRecord } from '@/lib/generateFiscalDocumentPdf';

type FiscalDocumentType =
  | 'quotation'
  | 'proforma'
  | 'invoice'
  | 'invoice_receipt'
  | 'receipt'
  | 'credit_note'
  | 'debit_note';

interface DocumentSeriesRecord {
  id: string;
  document_type: FiscalDocumentType;
  prefix: string;
  next_number: number;
  default_notes: string | null;
  is_active: boolean;
}

interface DocumentItemForm {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

const PREFIX_BY_TYPE: Record<FiscalDocumentType, string> = {
  quotation: 'COT',
  proforma: 'PRO',
  invoice: 'FT',
  invoice_receipt: 'FR',
  receipt: 'RC',
  credit_note: 'NC',
  debit_note: 'ND',
};

const createEmptyItem = (): DocumentItemForm => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
});

const createDefaultValidityDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const getDocumentLabel = (type: FiscalDocumentType) =>
  DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;

const FiscalDocumentsManager: React.FC = () => {
  const { company, store } = useAuth();
  const { t } = useTranslation();
  const db = supabase as any;

  const DOCUMENT_TYPE_OPTIONS = useMemo(() => [
    { value: 'quotation', label: t('doc.quotation'), description: t('fiscal.quotation_desc') || 'Proposta comercial para cliente' },
    { value: 'proforma', label: t('doc.proforma'), description: t('fiscal.proforma_desc') || 'Documento preliminar antes da venda' },
    { value: 'invoice', label: t('doc.invoice'), description: t('fiscal.invoice_desc') || 'Documento fiscal de venda' },
    { value: 'invoice_receipt', label: t('doc.invoiceReceipt'), description: t('fiscal.invoice_receipt_desc') || 'Venda e quitação no mesmo documento' },
    { value: 'receipt', label: t('doc.receipt'), description: t('fiscal.receipt_desc') || 'Comprovativo de pagamento' },
    { value: 'credit_note', label: t('doc.creditNote'), description: t('fiscal.credit_note_desc') || 'Ajuste a favor do cliente' },
    { value: 'debit_note', label: t('doc.debitNote'), description: t('fiscal.debit_note_desc') || 'Ajuste adicional ao cliente' },
  ] as Array<{ value: FiscalDocumentType; label: string; description: string }>, [t]);

  const getDocumentLabel = useCallback((type: FiscalDocumentType) =>
    DOCUMENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || type, [DOCUMENT_TYPE_OPTIONS]);

  const [loading, setLoading] = useState(true);
  const [savingSeries, setSavingSeries] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [series, setSeries] = useState<DocumentSeriesRecord[]>([]);
  const [documents, setDocuments] = useState<FiscalDocumentPdfRecord[]>([]);

  const [seriesType, setSeriesType] = useState<FiscalDocumentType>('quotation');
  const [seriesPrefix, setSeriesPrefix] = useState(PREFIX_BY_TYPE.quotation);
  const [seriesNotes, setSeriesNotes] = useState('');

  const [documentType, setDocumentType] = useState<FiscalDocumentType>('quotation');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNuit, setCustomerNuit] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [validUntil, setValidUntil] = useState(createDefaultValidityDate());
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(Number((company as any)?.fiscal_rate || 0));
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState<DocumentItemForm[]>([{ ...createEmptyItem(), tax_rate: Number((company as any)?.fiscal_rate || 0) }]);
  const [stockProducts, setStockProducts] = useState<DocumentProductOption[]>([]);

  const loadData = useCallback(async () => {
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!company?.id || !isUuid(company.id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const storeId = store?.id;
      const [seriesResult, documentsResult, productsResult] = await Promise.all([
        db.from('document_series').select('*').eq('company_id', company.id).order('document_type'),
        db
          .from('fiscal_documents')
          .select('*, fiscal_document_items(*)')
          .eq('company_id', company.id)
          .order('issue_date', { ascending: false })
          .limit(12),
        storeId
          ? db.from('products').select('id, name, code, sale_price, product_stock(quantity)').eq('is_active', true).neq('status', 'deleted').limit(500)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (seriesResult.error) throw seriesResult.error;
      if (documentsResult.error) throw documentsResult.error;

      setSeries((seriesResult.data || []) as DocumentSeriesRecord[]);
      setDocuments((documentsResult.data || []) as FiscalDocumentPdfRecord[]);
      
      const mappedProducts: DocumentProductOption[] = (productsResult.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        salePrice: Number(p.sale_price || 0),
        stock: Number(p.product_stock?.[0]?.quantity ?? 0),
        code: p.code,
      }));
      setStockProducts(mappedProducts);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar documentos fiscais');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    setTaxRate(Number((company as any)?.fiscal_rate || 0));
    setItems((current) =>
      current.map((item) => ({
        ...item,
        tax_rate: item.tax_rate || Number((company as any)?.fiscal_rate || 0),
      })),
    );
  }, [company]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const activeSeries = series.find((item) => item.document_type === seriesType && item.is_active);
    setSeriesPrefix(activeSeries?.prefix || PREFIX_BY_TYPE[seriesType]);
    setSeriesNotes(activeSeries?.default_notes || '');
  }, [series, seriesType]);

  useEffect(() => {
    if (documentType === 'quotation' || documentType === 'proforma') {
      setValidUntil((current) => current || createDefaultValidityDate());
    } else {
      setValidUntil('');
    }
  }, [documentType]);

  const activeSeries = useMemo(
    () => series.find((item) => item.document_type === documentType && item.is_active),
    [series, documentType],
  );

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    const taxAmount = subtotal * (Number(taxRate || 0) / 100);
    const total = subtotal + taxAmount - Number(discountAmount || 0);

    return {
      subtotal,
      taxAmount,
      total,
    };
  }, [discountAmount, items, taxRate]);

  const stats = useMemo(() => {
    const quotations = documents.filter((document) => document.document_type === 'quotation').length;
    const revenueDocs = documents.filter((document) => ['invoice', 'invoice_receipt', 'receipt'].includes(document.document_type)).length;
    const totalIssued = documents.reduce((sum, document) => sum + Number(document.total || 0), 0);

    return { quotations, revenueDocs, totalIssued };
  }, [documents]);

  const updateItem = (index: number, field: keyof DocumentItemForm, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === 'description' ? value : Number(value || 0),
            }
          : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [...current, { ...createEmptyItem(), tax_rate: Number(taxRate || 0) }]);
  };

  const removeItem = (index: number) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerNuit('');
    setCustomerAddress('');
    setNotes('');
    setDiscountAmount(0);
    setValidUntil(createDefaultValidityDate());
    setItems([{ ...createEmptyItem(), tax_rate: Number((company as any)?.fiscal_rate || 0) }]);
  };

  const handleSaveSeries = async () => {
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!company?.id || !isUuid(company.id)) return;
    if (!seriesPrefix.trim()) {
      toast.error('Defina o prefixo da série');
      return;
    }

    setSavingSeries(true);
    try {
      const existing = series.find((item) => item.document_type === seriesType && item.is_active);
      const payload = {
        company_id: company.id,
        store_id: store?.id || null,
        document_type: seriesType,
        prefix: seriesPrefix.trim().toUpperCase(),
        default_notes: seriesNotes.trim() || null,
        is_active: true,
      };

      const result = existing
        ? await db.from('document_series').update(payload).eq('id', existing.id)
        : await db.from('document_series').insert(payload);

      if (result.error) throw result.error;

      toast.success(`Série ${getDocumentLabel(seriesType)} guardada`);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao guardar série');
    } finally {
      setSavingSeries(false);
    }
  };

  const handleIssueDocument = async () => {
    if (!customerName.trim()) {
      toast.error('Informe o nome do cliente');
      return;
    }

    const validItems = items
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        tax_rate: Number(item.tax_rate || taxRate || 0),
      }))
      .filter((item) => item.description && item.quantity > 0);

    if (validItems.length === 0) {
      toast.error('Adicione pelo menos um item válido');
      return;
    }

    setIssuing(true);
    try {
      const { data, error } = await db.rpc('issue_fiscal_document', {
        p_document_type: documentType,
        p_customer_name: customerName.trim(),
        p_items: validItems,
        p_store_id: store?.id || null,
        p_customer_phone: customerPhone.trim() || null,
        p_customer_email: customerEmail.trim() || null,
        p_customer_nuit: customerNuit.trim() || null,
        p_customer_address: customerAddress.trim() || null,
        p_valid_until: validUntil || null,
        p_notes: notes.trim() || activeSeries?.default_notes || null,
        p_tax_rate: Number(taxRate || 0),
        p_discount_amount: Number(discountAmount || 0),
      });

      if (error) throw error;

      const createdDocumentId = data?.document_id;
      if (createdDocumentId) {
        const { data: documentData } = await db
          .from('fiscal_documents')
          .select('*, fiscal_document_items(*)')
          .eq('id', createdDocumentId)
          .maybeSingle();

        if (documentData) {
          await downloadFiscalDocumentPdf({
            document: documentData as FiscalDocumentPdfRecord,
            company: company as any,
            store: store as any,
          });
        }
      }

      toast.success(`${getDocumentLabel(documentType)} emitida com sucesso`);
      resetForm();
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao emitir documento');
    } finally {
      setIssuing(false);
    }
  };

  const handleDownload = async (document: FiscalDocumentPdfRecord) => {
    await downloadFiscalDocumentPdf({
      document,
      company: company as any,
      store: store as any,
    });
  };

  const CONVERSION_MAP: Partial<Record<FiscalDocumentType, { target: FiscalDocumentType; label: string }>> = {
    quotation: { target: 'proforma', label: 'Converter em Proforma' },
    proforma: { target: 'invoice', label: 'Converter em Factura' },
  };

  const handleConvertDocument = (doc: FiscalDocumentPdfRecord) => {
    const conversion = CONVERSION_MAP[doc.document_type as FiscalDocumentType];
    if (!conversion) return;

    setDocumentType(conversion.target);
    setCustomerName(doc.customer_name || '');
    setCustomerPhone(doc.customer_phone || '');
    setCustomerEmail(doc.customer_email || '');
    setCustomerNuit(doc.customer_nuit || '');
    setCustomerAddress(doc.customer_address || '');
    setNotes(doc.notes || '');
    setTaxRate(Number(doc.tax_rate || 0));
    setDiscountAmount(Number(doc.discount_amount || 0));

    const docItems = doc.fiscal_document_items || [];
    if (docItems.length > 0) {
      setItems(
        docItems.map((item) => ({
          description: item.description || '',
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.unit_price || 0),
          tax_rate: Number(item.tax_rate || 0),
        })),
      );
    }

    if (conversion.target === 'proforma' || conversion.target === 'invoice') {
      setValidUntil(conversion.target === 'proforma' ? createDefaultValidityDate() : '');
    }

    toast.info(`Dados carregados. Revise e emita a ${conversion.target === 'proforma' ? 'Proforma' : 'Factura'}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!company?.id || !isUuid(company.id)) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t('fiscal.configure_first')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('fiscal.issued_docs')}</p>
            <p className="mt-2 text-3xl font-bold">{documents.length}</p>
            <p className="text-xs text-muted-foreground">{t('fiscal.last_records')}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('fiscal.quotations_issued')}</p>
            <p className="mt-2 text-3xl font-bold">{stats.quotations}</p>
            <p className="text-xs text-muted-foreground">{t('fiscal.ready_proposals')}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('fiscal.total_issued')}</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(stats.totalIssued)}</p>
            <p className="text-xs text-muted-foreground">{t('fiscal.include_docs')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" /> {t('fiscal.issue_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('fiscal.doc_type')}</Label>
                <Select value={documentType} onValueChange={(value) => setDocumentType(value as FiscalDocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('fiscal.next_number')}</p>
                <p className="mt-2 text-lg font-semibold">
                  {(activeSeries?.prefix || PREFIX_BY_TYPE[documentType]) + '-' + String(activeSeries?.next_number || 1).padStart(6, '0')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t('fiscal.active_series')} {getDocumentLabel(documentType).toLowerCase()}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{t('fiscal.customer_data')}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome do cliente</Label>
                  <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome completo ou empresa" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="+258 84 000 0000" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="cliente@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>NUIT</Label>
                  <Input value={customerNuit} onChange={(event) => setCustomerNuit(event.target.value)} placeholder="NUIT do cliente" />
                </div>
                {(documentType === 'quotation' || documentType === 'proforma') && (
                  <div className="space-y-2">
                    <Label>Válida até</Label>
                    <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Bairro, cidade, avenida" />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Itens do documento</p>
              </div>

              {/* Product selection grid */}
              {stockProducts.length > 0 && (
                <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Selecionar produtos do estoque</p>
                  </div>
                  <DocumentProductPicker
                    products={stockProducts}
                    onSelect={(product) => {
                      // Check if product already in items
                      const existingIdx = items.findIndex(it => it.description === product.name);
                      if (existingIdx >= 0) {
                        // Increment quantity
                        updateItem(existingIdx, 'quantity', String(Number(items[existingIdx].quantity) + 1));
                        toast.info(`Quantidade de "${product.name}" aumentada`);
                      } else {
                        // Add new item or replace first empty item
                        const emptyIdx = items.findIndex(it => !it.description.trim() && it.unit_price === 0);
                        if (emptyIdx >= 0) {
                          setItems(current => current.map((item, idx) =>
                            idx === emptyIdx
                              ? { description: product.name, quantity: 1, unit_price: product.salePrice, tax_rate: Number(taxRate || 0) }
                              : item
                          ));
                        } else {
                          setItems(current => [...current, {
                            description: product.name,
                            quantity: 1,
                            unit_price: product.salePrice,
                            tax_rate: Number(taxRate || 0),
                          }]);
                        }
                        toast.success(`"${product.name}" adicionado ao documento`);
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Clique num produto para adicioná-lo automaticamente à lista abaixo</p>
                </div>
              )}

              {/* Items list */}
              <div className="space-y-3">
                {items.map((item, index) => {
                  const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                  return (
                    <div key={index} className="rounded-lg border border-border p-4">
                      <div className="grid gap-3 md:grid-cols-[2fr_0.8fr_1fr_auto]">
                        <div className="space-y-2 md:col-span-4">
                          <Label>Produto / Descrição</Label>
                          <Input
                            value={item.description}
                            onChange={(event) => updateItem(index, 'description', event.target.value)}
                            placeholder="Produto, serviço ou observação do item"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Qtd.</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço unitário</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                          />
                        </div>
                        <div className="flex items-end justify-between gap-2 md:col-span-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total da linha</p>
                            <p className="text-lg font-semibold">{formatCurrency(lineTotal)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length === 1}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                  <Plus className="mr-2 h-4 w-4" /> Adicionar item manualmente
                </Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Taxa fiscal (%)</Label>
                  <Input type="number" min="0" step="0.01" value={taxRate} onChange={(event) => setTaxRate(Number(event.target.value || 0))} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto global</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount}
                    onChange={(event) => setDiscountAmount(Number(event.target.value || 0))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas do documento</Label>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={activeSeries?.default_notes || 'Condições comerciais, prazo de entrega ou observações fiscais'}
                    rows={4}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4" /> Resumo do documento
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Imposto</span>
                    <span className="font-medium">{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="font-medium">{formatCurrency(discountAmount)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
                <Button className="mt-6 w-full" onClick={handleIssueDocument} disabled={issuing || loading}>
                  {issuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Emitir {getDocumentLabel(documentType)}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" /> Séries e prefixos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de documento</Label>
                <Select value={seriesType} onValueChange={(value) => setSeriesType(value as FiscalDocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prefixo da série</Label>
                <Input value={seriesPrefix} onChange={(event) => setSeriesPrefix(event.target.value.toUpperCase())} placeholder="Ex.: COT" />
              </div>
              <div className="space-y-2">
                <Label>Notas padrão</Label>
                <Textarea value={seriesNotes} onChange={(event) => setSeriesNotes(event.target.value)} rows={4} placeholder="Texto padrão para este documento" />
              </div>
              <Button variant="outline" className="w-full" onClick={handleSaveSeries} disabled={savingSeries}>
                {savingSeries ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar série
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipos suportados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DOCUMENT_TYPE_OPTIONS.map((option) => {
                const optionSeries = series.find((item) => item.document_type === option.value && item.is_active);
                return (
                  <div key={option.value} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      <Badge variant="secondary">{optionSeries?.prefix || PREFIX_BY_TYPE[option.value]}</Badge>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                Documentos comerciais e fiscais ficam guardados no backend e podem ser reemitidos em PDF a qualquer momento.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visão rápida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Documentos de venda</span>
                <span className="font-medium">{stats.revenueDocs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Loja emissora</span>
                <span className="font-medium">{store?.name || 'Principal'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Regime activo</span>
                <span className="font-medium">{String((company as any)?.fiscal_regime || 'irpc').toUpperCase()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Histórico recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> A carregar documentos...
            </div>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Ainda não existem documentos emitidos.</div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="flex flex-col gap-4 rounded-xl border border-border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{document.document_number}</p>
                      <Badge variant="secondary">{getDocumentLabel(document.document_type as FiscalDocumentType)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{document.customer_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Emitido: {formatDateTime(document.issue_date)}</span>
                      {document.valid_until && <span>Validade: {formatDate(document.valid_until)}</span>}
                      <span>Total: {formatCurrency(Number(document.total || 0))}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {CONVERSION_MAP[document.document_type as FiscalDocumentType] && (
                      <Button variant="secondary" onClick={() => handleConvertDocument(document)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        {CONVERSION_MAP[document.document_type as FiscalDocumentType]!.label}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => handleDownload(document)}>
                      <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalDocumentsManager;
