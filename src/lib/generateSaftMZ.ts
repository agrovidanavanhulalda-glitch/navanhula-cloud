/**
 * SAFT-MZ (Standard Audit File for Tax - Moçambique)
 * 
 * Gera ficheiro XML no formato SAFT-MZ conforme as normas da
 * Autoridade Tributária de Moçambique (AT-MZ).
 * 
 * Estrutura baseada no padrão OECD SAFT adaptado para Moçambique:
 * - Header (dados da empresa e período)
 * - MasterFiles (produtos, clientes)
 * - SourceDocuments > SalesInvoices (faturas de venda)
 * 
 * NOTA: Este é um scaffold preparatório. Quando a AT-MZ disponibilizar
 * a API pública de e-Tributação, os dados gerados aqui poderão ser
 * enviados via Edge Function com autenticação certificada.
 */

export interface SaftCompany {
  name: string;
  nif: string;
  address?: string;
  city?: string;
  phone?: string;
  fiscalRegime: string;
  fiscalRate: number;
}

export interface SaftProduct {
  code: string;
  name: string;
  unitPrice: number;
}

export interface SaftInvoiceLine {
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tax: number;
}

export interface SaftInvoice {
  id: string;
  date: string;
  customerName?: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  taxAmount: number;
  lines: SaftInvoiceLine[];
}

export interface SaftOptions {
  company: SaftCompany;
  periodStart: string;
  periodEnd: string;
  products: SaftProduct[];
  invoices: SaftInvoice[];
  softwareName?: string;
  softwareVersion?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toISOString().slice(0, 19);
}

export function generateSaftMZXml(options: SaftOptions): string {
  const {
    company,
    periodStart,
    periodEnd,
    products,
    invoices,
    softwareName = 'NAVANHULA ERP',
    softwareVersion = '1.0',
  } = options;

  const now = new Date().toISOString();
  const taxRate = company.fiscalRate;

  // Collect unique customers
  const customers = new Map<string, string>();
  invoices.forEach((inv, i) => {
    const name = inv.customerName || 'Consumidor Final';
    if (!customers.has(name)) {
      customers.set(name, `C${String(i + 1).padStart(4, '0')}`);
    }
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:MZ_1.0">
  <!-- SAFT-MZ gerado pelo ${escapeXml(softwareName)} -->
  <!-- Este ficheiro segue o padrão SAFT adaptado para Moçambique -->

  <Header>
    <AuditFileVersion>1.0_MZ</AuditFileVersion>
    <CompanyID>${escapeXml(company.nif || 'SEM-NUIT')}</CompanyID>
    <TaxRegistrationNumber>${escapeXml(company.nif || '')}</TaxRegistrationNumber>
    <TaxAccountingBasis>${escapeXml(company.fiscalRegime.toUpperCase())}</TaxAccountingBasis>
    <CompanyName>${escapeXml(company.name)}</CompanyName>
    <CompanyAddress>
      <AddressDetail>${escapeXml(company.address || '')}</AddressDetail>
      <City>${escapeXml(company.city || 'Maputo')}</City>
      <Country>MZ</Country>
    </CompanyAddress>
    <FiscalYear>${new Date(periodStart).getFullYear()}</FiscalYear>
    <StartDate>${formatDate(periodStart)}</StartDate>
    <EndDate>${formatDate(periodEnd)}</EndDate>
    <DateCreated>${formatDate(now)}</DateCreated>
    <SoftwareCertificateNumber>0</SoftwareCertificateNumber>
    <ProductCompanyTaxID>${escapeXml(company.nif || '')}</ProductCompanyTaxID>
    <SoftwareValidationNumber>0</SoftwareValidationNumber>
    <ProductID>${escapeXml(softwareName)}</ProductID>
    <ProductVersion>${escapeXml(softwareVersion)}</ProductVersion>
    <Telephone>${escapeXml(company.phone || '')}</Telephone>
    <CurrencyCode>MZN</CurrencyCode>
  </Header>

  <MasterFiles>
    <!-- Produtos -->
${products.map(p => `    <Product>
      <ProductType>P</ProductType>
      <ProductCode>${escapeXml(p.code)}</ProductCode>
      <ProductDescription>${escapeXml(p.name)}</ProductDescription>
      <ProductNumberCode>${escapeXml(p.code)}</ProductNumberCode>
    </Product>`).join('\n')}

    <!-- Clientes -->
${Array.from(customers.entries()).map(([name, code]) => `    <Customer>
      <CustomerID>${escapeXml(code)}</CustomerID>
      <AccountID>Desconhecido</AccountID>
      <CustomerTaxID>999999999</CustomerTaxID>
      <CompanyName>${escapeXml(name)}</CompanyName>
      <BillingAddress>
        <AddressDetail>Desconhecido</AddressDetail>
        <City>Desconhecido</City>
        <Country>MZ</Country>
      </BillingAddress>
      <SelfBillingIndicator>0</SelfBillingIndicator>
    </Customer>`).join('\n')}

    <!-- Regime Fiscal: ${escapeXml(company.fiscalRegime.toUpperCase())} — ${taxRate}% -->
    <TaxTable>
      <TaxTableEntry>
        <TaxType>${company.fiscalRegime === 'iva' ? 'IVA' : 'IS'}</TaxType>
        <TaxCountryRegion>MZ</TaxCountryRegion>
        <TaxCode>${escapeXml(company.fiscalRegime.toUpperCase())}</TaxCode>
        <Description>${escapeXml(company.fiscalRegime.toUpperCase())} — ${taxRate}%</Description>
        <TaxPercentage>${taxRate}</TaxPercentage>
      </TaxTableEntry>
    </TaxTable>
  </MasterFiles>

  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${invoices.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${invoices.reduce((s, i) => s + i.total, 0).toFixed(2)}</TotalCredit>

${invoices.map((inv, idx) => {
  const invNumber = `FT ${String(idx + 1).padStart(6, '0')}`;
  const custName = inv.customerName || 'Consumidor Final';
  const custId = customers.get(custName) || 'C0001';
  return `      <Invoice>
        <InvoiceNo>${escapeXml(invNumber)}</InvoiceNo>
        <ATCUD>0</ATCUD>
        <DocumentStatus>
          <InvoiceStatus>N</InvoiceStatus>
          <InvoiceStatusDate>${formatDateTime(inv.date)}</InvoiceStatusDate>
          <SourceID>${escapeXml(softwareName)}</SourceID>
          <SourceBilling>P</SourceBilling>
        </DocumentStatus>
        <Hash>0</Hash>
        <HashControl>1</HashControl>
        <Period>${new Date(inv.date).getMonth() + 1}</Period>
        <InvoiceDate>${formatDate(inv.date)}</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <SpecialRegimes>
          <SelfBillingIndicator>0</SelfBillingIndicator>
          <CashVATSchemeIndicator>0</CashVATSchemeIndicator>
          <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>
        </SpecialRegimes>
        <SourceID>${escapeXml(softwareName)}</SourceID>
        <SystemEntryDate>${formatDateTime(inv.date)}</SystemEntryDate>
        <CustomerID>${escapeXml(custId)}</CustomerID>
${inv.lines.map((line, li) => `        <Line>
          <LineNumber>${li + 1}</LineNumber>
          <ProductCode>${escapeXml(line.productCode)}</ProductCode>
          <ProductDescription>${escapeXml(line.productName)}</ProductDescription>
          <Quantity>${line.quantity}</Quantity>
          <UnitOfMeasure>UN</UnitOfMeasure>
          <UnitPrice>${line.unitPrice.toFixed(2)}</UnitPrice>
          <CreditAmount>${line.total.toFixed(2)}</CreditAmount>
          <Tax>
            <TaxType>${company.fiscalRegime === 'iva' ? 'IVA' : 'IS'}</TaxType>
            <TaxCountryRegion>MZ</TaxCountryRegion>
            <TaxCode>${escapeXml(company.fiscalRegime.toUpperCase())}</TaxCode>
            <TaxPercentage>${taxRate}</TaxPercentage>
          </Tax>
          <TaxExemptionReason/>
        </Line>`).join('\n')}
        <DocumentTotals>
          <TaxPayable>${inv.taxAmount.toFixed(2)}</TaxPayable>
          <NetTotal>${(inv.total - inv.taxAmount).toFixed(2)}</NetTotal>
          <GrossTotal>${inv.total.toFixed(2)}</GrossTotal>
          <Payment>
            <PaymentMechanism>${getPaymentMechanism(inv.paymentMethod)}</PaymentMechanism>
            <PaymentAmount>${inv.total.toFixed(2)}</PaymentAmount>
            <PaymentDate>${formatDate(inv.date)}</PaymentDate>
          </Payment>
        </DocumentTotals>
      </Invoice>`;
}).join('\n')}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

  return xml;
}

function getPaymentMechanism(method: string): string {
  const map: Record<string, string> = {
    cash: 'NU',      // Numerário
    mpesa: 'MB',     // Multibanco / Mobile
    emola: 'MB',     // Mobile Banking
    card: 'CC',      // Cartão Crédito
  };
  return map[method] || 'OU'; // Outros
}

export function downloadSaftMZXml(options: SaftOptions): void {
  const xml = generateSaftMZXml(options);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const start = formatDate(options.periodStart);
  const end = formatDate(options.periodEnd);
  a.download = `SAFT-MZ_${options.company.nif || 'empresa'}_${start}_${end}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}
