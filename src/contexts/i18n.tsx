import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'pt' | 'en';

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'PDV',
    'nav.products': 'Produtos',
    'nav.inventory': 'Estoque',
    'nav.sales': 'Vendas',
    'nav.sellers': 'Vendedores',
    'nav.stores': 'Lojas',
    'nav.cashRegister': 'Caixa',
    'nav.reports': 'Relatórios',
    'nav.financial': 'Financeiro',
    'nav.accounting': 'Contabilidade',
    'nav.fiscal': 'Fiscal',
    'nav.crm': 'CRM',
    'nav.suppliers': 'Fornecedores',
    'nav.subscription': 'Assinatura',
    'nav.settings': 'Configurações',
    'nav.community': 'Comunidade',
    'nav.ceoDashboard': 'Painel CEO',
    'nav.wallet': 'Carteira',
    'nav.bi': 'BI',
    'nav.agriculture': 'Agricultura',
    'nav.poultry': 'Avicultura',
    'nav.resellers': 'Revendedores',
    // Common
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.add': 'Adicionar',
    'common.search': 'Buscar',
    'common.loading': 'Carregando...',
    'common.name': 'Nome',
    'common.email': 'Email',
    'common.phone': 'Telefone',
    'common.status': 'Status',
    'common.actions': 'Ações',
    'common.active': 'Ativo',
    'common.inactive': 'Inativo',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.discount': 'Desconto',
    'common.quantity': 'Quantidade',
    'common.price': 'Preço',
    'common.date': 'Data',
    'common.close': 'Fechar',
    'common.open': 'Abrir',
    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.confirm': 'Confirmar',
    // Sellers
    'sellers.title': 'Vendedores',
    'sellers.subtitle': 'Gestão de vendedores da loja',
    'sellers.new': 'Novo Vendedor',
    'sellers.search': 'Buscar vendedor...',
    'sellers.role': 'Função',
    'sellers.store': 'Loja',
    'sellers.pin': 'Senha (PIN)',
    'sellers.created': 'Vendedor criado com sucesso.',
    'sellers.updated': 'Vendedor atualizado!',
    'sellers.deactivated': 'Vendedor desativado',
    'sellers.activated': 'Vendedor ativado',
    'sellers.notFound': 'Nenhum vendedor encontrado',
    'sellers.createFirst': 'Criar primeiro vendedor',
    'sellers.admin': 'Administrador',
    'sellers.seller': 'Vendedor',
    // Cash Register
    'cash.title': 'Caixa',
    'cash.open': 'Abrir Caixa',
    'cash.close': 'Fechar Caixa',
    'cash.opened': 'CAIXA ABERTO',
    'cash.closed': 'CAIXA FECHADO',
    'cash.operator': 'Operador',
    'cash.openingAmount': 'Valor Inicial (Fundo de Caixa)',
    'cash.closingAmount': 'Valor em Caixa (Contagem)',
    'cash.selectSeller': 'Selecione o vendedor',
    'cash.registerFirst': 'Cadastre vendedores primeiro',
    'cash.daySales': 'Vendas do Dia',
    'cash.salesQty': 'Qtd. Vendas',
    'cash.totalInCash': 'Total em Caixa',
    'cash.expected': 'Valor Esperado',
    'cash.difference': 'Diferença',
    'cash.history': 'Histórico de Caixas',
    'cash.openSuccess': 'Caixa aberto com sucesso!',
    'cash.closeSuccess': 'Caixa fechado com sucesso!',
    'cash.startSales': 'Abra o caixa para iniciar as vendas',
    // POS
    'pos.title': 'Ponto de Venda',
    'pos.finalize': 'Finalizar Venda',
    'pos.emptyCart': 'Carrinho vazio',
    'pos.change': 'Troco',
    'pos.received': 'Valor Recebido',
    // Payment
    'payment.cash': 'Dinheiro',
    'payment.mpesa': 'M-Pesa',
    'payment.emola': 'E-Mola',
    'payment.card': 'Cartão',
    'payment.method': 'Método de Pagamento',
    // Dashboard
    'dashboard.todaySales': 'Vendas Hoje',
    'dashboard.monthSales': 'Vendas do Mês',
    'dashboard.totalRevenue': 'Total Faturado',
    'dashboard.topProducts': 'Produtos Mais Vendidos',
    'dashboard.customers': 'Clientes',
    // Documents
    'doc.quotation': 'Cotação',
    'doc.proforma': 'Factura Proforma',
    'doc.invoice': 'Factura',
    'doc.invoiceReceipt': 'Factura-Recibo',
    'doc.receipt': 'Recibo',
    'doc.creditNote': 'Nota de Crédito',
    'doc.debitNote': 'Nota de Débito',
    // Auth
    'auth.login': 'Entrar',
    'auth.signup': 'Criar Conta',
    'auth.logout': 'Sair',
    'auth.email': 'Email',
    'auth.password': 'Senha',
    // Language
    'lang.pt': 'Português',
    'lang.en': 'English',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'POS',
    'nav.products': 'Products',
    'nav.inventory': 'Inventory',
    'nav.sales': 'Sales',
    'nav.sellers': 'Sellers',
    'nav.stores': 'Stores',
    'nav.cashRegister': 'Cash Register',
    'nav.reports': 'Reports',
    'nav.financial': 'Financial',
    'nav.accounting': 'Accounting',
    'nav.fiscal': 'Fiscal',
    'nav.crm': 'CRM',
    'nav.suppliers': 'Suppliers',
    'nav.subscription': 'Subscription',
    'nav.settings': 'Settings',
    'nav.community': 'Community',
    'nav.ceoDashboard': 'CEO Dashboard',
    'nav.wallet': 'Wallet',
    'nav.bi': 'BI',
    'nav.agriculture': 'Agriculture',
    'nav.poultry': 'Poultry',
    'nav.resellers': 'Resellers',
    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.name': 'Name',
    'common.email': 'Email',
    'common.phone': 'Phone',
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.discount': 'Discount',
    'common.quantity': 'Quantity',
    'common.price': 'Price',
    'common.date': 'Date',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    // Sellers
    'sellers.title': 'Sellers',
    'sellers.subtitle': 'Store seller management',
    'sellers.new': 'New Seller',
    'sellers.search': 'Search seller...',
    'sellers.role': 'Role',
    'sellers.store': 'Store',
    'sellers.pin': 'Password (PIN)',
    'sellers.created': 'Seller created successfully.',
    'sellers.updated': 'Seller updated!',
    'sellers.deactivated': 'Seller deactivated',
    'sellers.activated': 'Seller activated',
    'sellers.notFound': 'No sellers found',
    'sellers.createFirst': 'Create first seller',
    'sellers.admin': 'Administrator',
    'sellers.seller': 'Seller',
    // Cash Register
    'cash.title': 'Cash Register',
    'cash.open': 'Open Register',
    'cash.close': 'Close Register',
    'cash.opened': 'REGISTER OPEN',
    'cash.closed': 'REGISTER CLOSED',
    'cash.operator': 'Operator',
    'cash.openingAmount': 'Opening Amount',
    'cash.closingAmount': 'Closing Amount (Count)',
    'cash.selectSeller': 'Select seller',
    'cash.registerFirst': 'Register sellers first',
    'cash.daySales': 'Today\'s Sales',
    'cash.salesQty': 'Sales Count',
    'cash.totalInCash': 'Total in Cash',
    'cash.expected': 'Expected Amount',
    'cash.difference': 'Difference',
    'cash.history': 'Register History',
    'cash.openSuccess': 'Register opened successfully!',
    'cash.closeSuccess': 'Register closed successfully!',
    'cash.startSales': 'Open register to start selling',
    // POS
    'pos.title': 'Point of Sale',
    'pos.finalize': 'Finalize Sale',
    'pos.emptyCart': 'Empty cart',
    'pos.change': 'Change',
    'pos.received': 'Amount Received',
    // Payment
    'payment.cash': 'Cash',
    'payment.mpesa': 'M-Pesa',
    'payment.emola': 'E-Mola',
    'payment.card': 'Card',
    'payment.method': 'Payment Method',
    // Dashboard
    'dashboard.todaySales': 'Today\'s Sales',
    'dashboard.monthSales': 'Monthly Sales',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.topProducts': 'Top Products',
    'dashboard.customers': 'Customers',
    // Documents
    'doc.quotation': 'Quotation',
    'doc.proforma': 'Proforma Invoice',
    'doc.invoice': 'Invoice',
    'doc.invoiceReceipt': 'Invoice-Receipt',
    'doc.receipt': 'Receipt',
    'doc.creditNote': 'Credit Note',
    'doc.debitNote': 'Debit Note',
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    // Language
    'lang.pt': 'Português',
    'lang.en': 'English',
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('navanhula_lang');
    return (saved === 'en' ? 'en' : 'pt') as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('navanhula_lang', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};
