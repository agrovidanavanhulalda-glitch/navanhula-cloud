import { supabase } from '@/integrations/supabase/client';
import { LocalSale } from '@/contexts/LocalPOSContext';

/**
 * Pipeline: PDV → Documento Fiscal → Contabilidade → Impostos
 * 
 * Automatically issues a fiscal document after a completed sale.
 * The existing DB triggers handle: accounting entries + tax calculations.
 */

interface AutoFiscalOptions {
  sale: LocalSale;
  storeId: string;
  customerName?: string;
  customerPhone?: string;
  customerNuit?: string;
  taxRate?: number;
}

/**
 * Determine document type based on payment:
 * - Payment confirmed → invoice_receipt (Fatura-Recibo)
 * - Otherwise → invoice (Fatura)
 */
function getDocumentType(sale: LocalSale): 'invoice' | 'invoice_receipt' {
  // All completed POS sales are paid → issue invoice_receipt
  if (sale.status === 'completed') return 'invoice_receipt';
  return 'invoice';
}

/**
 * Auto-issue fiscal document after POS sale.
 * Returns the document number on success, null on failure.
 */
export async function autoIssueFiscalDocument(options: AutoFiscalOptions): Promise<{
  success: boolean;
  documentNumber?: string;
  documentId?: string;
  error?: string;
}> {
  const {
    sale,
    storeId,
    customerName = 'Consumidor Final',
    customerPhone,
    customerNuit,
    taxRate = 0,
  } = options;

  try {
    const documentType = getDocumentType(sale);

    // Build items array for the RPC
    const items = sale.items.map(item => ({
      description: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.salePrice,
      tax_rate: taxRate,
    }));

    const { data, error } = await supabase.rpc('issue_fiscal_document', {
      p_document_type: documentType,
      p_customer_name: customerName,
      p_items: items,
      p_store_id: storeId,
      p_customer_phone: customerPhone || null,
      p_customer_nuit: customerNuit || null,
      p_tax_rate: taxRate,
      p_discount_amount: sale.discount || 0,
      p_notes: `Venda PDV #${sale.id.slice(0, 8)} | ${getPaymentLabel(sale.paymentMethod)}`,
    });

    if (error) {
      console.error('[FiscalPipeline] RPC error:', error);
      return { success: false, error: error.message };
    }

    const result = data as any;
    if (result?.success) {
      console.log('[FiscalPipeline] ✅ Document issued:', result.document_number);
      return {
        success: true,
        documentNumber: result.document_number,
        documentId: result.document_id,
      };
    }

    return { success: false, error: 'Unknown error' };
  } catch (err: any) {
    console.error('[FiscalPipeline] Exception:', err);
    return { success: false, error: err.message };
  }
}

function getPaymentLabel(method?: string): string {
  const labels: Record<string, string> = {
    cash: 'Numerário',
    mpesa: 'M-Pesa',
    emola: 'e-Mola',
    card: 'Cartão',
    voucher: 'Voucher',
  };
  return labels[method || 'cash'] || method || 'Outro';
}
