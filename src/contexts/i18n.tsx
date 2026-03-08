import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type Language = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ar' | 'zh' | 'ru' | 'hi';

const translations: Record<Language, Record<string, string>> = {
  pt: {
    'nav.dashboard': 'Dashboard', 'nav.pos': 'PDV', 'nav.products': 'Produtos', 'nav.inventory': 'Estoque',
    'nav.sales': 'Vendas', 'nav.sellers': 'Vendedores', 'nav.stores': 'Lojas', 'nav.cashRegister': 'Caixa',
    'nav.reports': 'Relatórios', 'nav.financial': 'Financeiro', 'nav.accounting': 'Contabilidade',
    'nav.fiscal': 'Fiscal', 'nav.crm': 'CRM', 'nav.suppliers': 'Fornecedores', 'nav.subscription': 'Assinatura',
    'nav.settings': 'Configurações', 'nav.community': 'Comunidade', 'nav.ceoDashboard': 'Painel CEO',
    'nav.wallet': 'Carteira', 'nav.bi': 'BI', 'nav.agriculture': 'Agricultura', 'nav.poultry': 'Avicultura',
    'nav.resellers': 'Revendedores', 'nav.employees': 'Funcionários', 'nav.hr': 'RH',
    'common.save': 'Salvar', 'common.cancel': 'Cancelar', 'common.delete': 'Excluir', 'common.edit': 'Editar',
    'common.add': 'Adicionar', 'common.search': 'Buscar', 'common.loading': 'Carregando...', 'common.name': 'Nome',
    'common.email': 'Email', 'common.phone': 'Telefone', 'common.status': 'Status', 'common.actions': 'Ações',
    'common.active': 'Ativo', 'common.inactive': 'Inativo', 'common.total': 'Total', 'common.subtotal': 'Subtotal',
    'common.discount': 'Desconto', 'common.quantity': 'Quantidade', 'common.price': 'Preço', 'common.date': 'Data',
    'common.close': 'Fechar', 'common.open': 'Abrir', 'common.yes': 'Sim', 'common.no': 'Não',
    'common.confirm': 'Confirmar', 'common.export': 'Exportar', 'common.import': 'Importar',
    'sellers.title': 'Vendedores', 'sellers.subtitle': 'Gestão de vendedores da loja', 'sellers.new': 'Novo Vendedor',
    'sellers.search': 'Buscar vendedor...', 'sellers.role': 'Função', 'sellers.store': 'Loja',
    'sellers.pin': 'Senha (PIN)', 'sellers.created': 'Vendedor criado com sucesso.',
    'sellers.updated': 'Vendedor atualizado!', 'sellers.deactivated': 'Vendedor desativado',
    'sellers.activated': 'Vendedor ativado', 'sellers.notFound': 'Nenhum vendedor encontrado',
    'sellers.createFirst': 'Criar primeiro vendedor', 'sellers.admin': 'Administrador', 'sellers.seller': 'Vendedor',
    'cash.title': 'Caixa', 'cash.open': 'Abrir Caixa', 'cash.close': 'Fechar Caixa',
    'cash.opened': 'CAIXA ABERTO', 'cash.closed': 'CAIXA FECHADO', 'cash.operator': 'Operador',
    'cash.openingAmount': 'Valor Inicial (Fundo de Caixa)', 'cash.closingAmount': 'Valor em Caixa (Contagem)',
    'cash.selectSeller': 'Selecione o vendedor', 'cash.registerFirst': 'Cadastre vendedores primeiro',
    'cash.daySales': 'Vendas do Dia', 'cash.salesQty': 'Qtd. Vendas', 'cash.totalInCash': 'Total em Caixa',
    'cash.expected': 'Valor Esperado', 'cash.difference': 'Diferença', 'cash.history': 'Histórico de Caixas',
    'cash.openSuccess': 'Caixa aberto com sucesso!', 'cash.closeSuccess': 'Caixa fechado com sucesso!',
    'cash.startSales': 'Abra o caixa para iniciar as vendas',
    'pos.title': 'Ponto de Venda', 'pos.finalize': 'Finalizar Venda', 'pos.emptyCart': 'Carrinho vazio',
    'pos.change': 'Troco', 'pos.received': 'Valor Recebido',
    'payment.cash': 'Dinheiro', 'payment.mpesa': 'M-Pesa', 'payment.emola': 'E-Mola', 'payment.card': 'Cartão',
    'payment.method': 'Método de Pagamento',
    'dashboard.todaySales': 'Vendas Hoje', 'dashboard.monthSales': 'Vendas do Mês',
    'dashboard.totalRevenue': 'Total Faturado', 'dashboard.topProducts': 'Produtos Mais Vendidos',
    'dashboard.customers': 'Clientes',
    'doc.quotation': 'Cotação', 'doc.proforma': 'Factura Proforma', 'doc.invoice': 'Factura',
    'doc.invoiceReceipt': 'Factura-Recibo', 'doc.receipt': 'Recibo', 'doc.creditNote': 'Nota de Crédito',
    'doc.debitNote': 'Nota de Débito',
    'auth.login': 'Entrar', 'auth.signup': 'Criar Conta', 'auth.logout': 'Sair',
    'auth.email': 'Email', 'auth.password': 'Senha',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Sistema ERP Empresarial',
  },
  en: {
    'nav.dashboard': 'Dashboard', 'nav.pos': 'POS', 'nav.products': 'Products', 'nav.inventory': 'Inventory',
    'nav.sales': 'Sales', 'nav.sellers': 'Sellers', 'nav.stores': 'Stores', 'nav.cashRegister': 'Cash Register',
    'nav.reports': 'Reports', 'nav.financial': 'Financial', 'nav.accounting': 'Accounting',
    'nav.fiscal': 'Fiscal', 'nav.crm': 'CRM', 'nav.suppliers': 'Suppliers', 'nav.subscription': 'Subscription',
    'nav.settings': 'Settings', 'nav.community': 'Community', 'nav.ceoDashboard': 'CEO Dashboard',
    'nav.wallet': 'Wallet', 'nav.bi': 'BI', 'nav.agriculture': 'Agriculture', 'nav.poultry': 'Poultry',
    'nav.resellers': 'Resellers', 'nav.employees': 'Employees', 'nav.hr': 'HR',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit',
    'common.add': 'Add', 'common.search': 'Search', 'common.loading': 'Loading...', 'common.name': 'Name',
    'common.email': 'Email', 'common.phone': 'Phone', 'common.status': 'Status', 'common.actions': 'Actions',
    'common.active': 'Active', 'common.inactive': 'Inactive', 'common.total': 'Total', 'common.subtotal': 'Subtotal',
    'common.discount': 'Discount', 'common.quantity': 'Quantity', 'common.price': 'Price', 'common.date': 'Date',
    'common.close': 'Close', 'common.open': 'Open', 'common.yes': 'Yes', 'common.no': 'No',
    'common.confirm': 'Confirm', 'common.export': 'Export', 'common.import': 'Import',
    'sellers.title': 'Sellers', 'sellers.subtitle': 'Store seller management', 'sellers.new': 'New Seller',
    'sellers.search': 'Search seller...', 'sellers.role': 'Role', 'sellers.store': 'Store',
    'sellers.pin': 'Password (PIN)', 'sellers.created': 'Seller created successfully.',
    'sellers.updated': 'Seller updated!', 'sellers.deactivated': 'Seller deactivated',
    'sellers.activated': 'Seller activated', 'sellers.notFound': 'No sellers found',
    'sellers.createFirst': 'Create first seller', 'sellers.admin': 'Administrator', 'sellers.seller': 'Seller',
    'cash.title': 'Cash Register', 'cash.open': 'Open Register', 'cash.close': 'Close Register',
    'cash.opened': 'REGISTER OPEN', 'cash.closed': 'REGISTER CLOSED', 'cash.operator': 'Operator',
    'cash.openingAmount': 'Opening Amount', 'cash.closingAmount': 'Closing Amount (Count)',
    'cash.selectSeller': 'Select seller', 'cash.registerFirst': 'Register sellers first',
    'cash.daySales': "Today's Sales", 'cash.salesQty': 'Sales Count', 'cash.totalInCash': 'Total in Cash',
    'cash.expected': 'Expected Amount', 'cash.difference': 'Difference', 'cash.history': 'Register History',
    'cash.openSuccess': 'Register opened successfully!', 'cash.closeSuccess': 'Register closed successfully!',
    'cash.startSales': 'Open register to start selling',
    'pos.title': 'Point of Sale', 'pos.finalize': 'Finalize Sale', 'pos.emptyCart': 'Empty cart',
    'pos.change': 'Change', 'pos.received': 'Amount Received',
    'payment.cash': 'Cash', 'payment.mpesa': 'M-Pesa', 'payment.emola': 'E-Mola', 'payment.card': 'Card',
    'payment.method': 'Payment Method',
    'dashboard.todaySales': "Today's Sales", 'dashboard.monthSales': 'Monthly Sales',
    'dashboard.totalRevenue': 'Total Revenue', 'dashboard.topProducts': 'Top Products',
    'dashboard.customers': 'Customers',
    'doc.quotation': 'Quotation', 'doc.proforma': 'Proforma Invoice', 'doc.invoice': 'Invoice',
    'doc.invoiceReceipt': 'Invoice-Receipt', 'doc.receipt': 'Receipt', 'doc.creditNote': 'Credit Note',
    'doc.debitNote': 'Debit Note',
    'auth.login': 'Login', 'auth.signup': 'Sign Up', 'auth.logout': 'Logout',
    'auth.email': 'Email', 'auth.password': 'Password',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Enterprise ERP System',
  },
  es: {
    'nav.dashboard': 'Panel', 'nav.pos': 'TPV', 'nav.products': 'Productos', 'nav.inventory': 'Inventario',
    'nav.sales': 'Ventas', 'nav.sellers': 'Vendedores', 'nav.stores': 'Tiendas', 'nav.cashRegister': 'Caja',
    'nav.reports': 'Informes', 'nav.financial': 'Financiero', 'nav.accounting': 'Contabilidad',
    'nav.fiscal': 'Fiscal', 'nav.crm': 'CRM', 'nav.suppliers': 'Proveedores', 'nav.subscription': 'Suscripción',
    'nav.settings': 'Configuración', 'nav.community': 'Comunidad', 'nav.ceoDashboard': 'Panel CEO',
    'nav.wallet': 'Billetera', 'nav.bi': 'BI', 'nav.agriculture': 'Agricultura', 'nav.poultry': 'Avicultura',
    'nav.resellers': 'Revendedores', 'nav.employees': 'Empleados', 'nav.hr': 'RRHH',
    'common.save': 'Guardar', 'common.cancel': 'Cancelar', 'common.delete': 'Eliminar', 'common.edit': 'Editar',
    'common.add': 'Añadir', 'common.search': 'Buscar', 'common.loading': 'Cargando...', 'common.name': 'Nombre',
    'common.email': 'Correo', 'common.phone': 'Teléfono', 'common.status': 'Estado', 'common.actions': 'Acciones',
    'common.active': 'Activo', 'common.inactive': 'Inactivo', 'common.total': 'Total', 'common.subtotal': 'Subtotal',
    'common.discount': 'Descuento', 'common.quantity': 'Cantidad', 'common.price': 'Precio', 'common.date': 'Fecha',
    'common.close': 'Cerrar', 'common.open': 'Abrir', 'common.yes': 'Sí', 'common.no': 'No',
    'common.confirm': 'Confirmar', 'common.export': 'Exportar', 'common.import': 'Importar',
    'sellers.title': 'Vendedores', 'sellers.new': 'Nuevo Vendedor', 'sellers.created': 'Vendedor creado con éxito.',
    'sellers.notFound': 'No se encontraron vendedores',
    'cash.title': 'Caja', 'cash.open': 'Abrir Caja', 'cash.close': 'Cerrar Caja',
    'pos.title': 'Punto de Venta', 'pos.finalize': 'Finalizar Venta', 'pos.emptyCart': 'Carrito vacío',
    'payment.cash': 'Efectivo', 'payment.method': 'Método de Pago',
    'auth.login': 'Iniciar Sesión', 'auth.signup': 'Registrarse', 'auth.logout': 'Salir',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Sistema ERP Empresarial',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord', 'nav.pos': 'PDV', 'nav.products': 'Produits', 'nav.inventory': 'Stock',
    'nav.sales': 'Ventes', 'nav.sellers': 'Vendeurs', 'nav.stores': 'Magasins', 'nav.cashRegister': 'Caisse',
    'nav.reports': 'Rapports', 'nav.financial': 'Financier', 'nav.accounting': 'Comptabilité',
    'nav.fiscal': 'Fiscal', 'nav.crm': 'CRM', 'nav.suppliers': 'Fournisseurs', 'nav.subscription': 'Abonnement',
    'nav.settings': 'Paramètres', 'nav.community': 'Communauté', 'nav.ceoDashboard': 'Tableau CEO',
    'nav.wallet': 'Portefeuille', 'nav.bi': 'BI', 'nav.agriculture': 'Agriculture', 'nav.poultry': 'Aviculture',
    'nav.resellers': 'Revendeurs', 'nav.employees': 'Employés', 'nav.hr': 'RH',
    'common.save': 'Enregistrer', 'common.cancel': 'Annuler', 'common.delete': 'Supprimer', 'common.edit': 'Modifier',
    'common.add': 'Ajouter', 'common.search': 'Rechercher', 'common.loading': 'Chargement...', 'common.name': 'Nom',
    'common.email': 'E-mail', 'common.phone': 'Téléphone', 'common.status': 'Statut', 'common.actions': 'Actions',
    'common.active': 'Actif', 'common.inactive': 'Inactif', 'common.total': 'Total', 'common.subtotal': 'Sous-total',
    'common.discount': 'Remise', 'common.quantity': 'Quantité', 'common.price': 'Prix', 'common.date': 'Date',
    'common.close': 'Fermer', 'common.open': 'Ouvrir', 'common.yes': 'Oui', 'common.no': 'Non',
    'common.confirm': 'Confirmer', 'common.export': 'Exporter', 'common.import': 'Importer',
    'sellers.title': 'Vendeurs', 'sellers.new': 'Nouveau Vendeur', 'sellers.created': 'Vendeur créé avec succès.',
    'cash.title': 'Caisse', 'cash.open': 'Ouvrir Caisse', 'cash.close': 'Fermer Caisse',
    'pos.title': 'Point de Vente', 'pos.finalize': 'Finaliser Vente', 'pos.emptyCart': 'Panier vide',
    'payment.cash': 'Espèces', 'payment.method': 'Mode de Paiement',
    'auth.login': 'Connexion', 'auth.signup': "S'inscrire", 'auth.logout': 'Déconnexion',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Plateforme ERP SaaS',
  },
  de: {
    'nav.dashboard': 'Dashboard', 'nav.pos': 'Kasse', 'nav.products': 'Produkte', 'nav.inventory': 'Lager',
    'nav.sales': 'Verkäufe', 'nav.sellers': 'Verkäufer', 'nav.stores': 'Filialen', 'nav.cashRegister': 'Kasse',
    'nav.reports': 'Berichte', 'nav.financial': 'Finanzen', 'nav.accounting': 'Buchhaltung',
    'nav.fiscal': 'Steuer', 'nav.crm': 'CRM', 'nav.suppliers': 'Lieferanten', 'nav.subscription': 'Abonnement',
    'nav.settings': 'Einstellungen', 'nav.community': 'Community', 'nav.ceoDashboard': 'CEO Dashboard',
    'nav.wallet': 'Geldbörse', 'nav.bi': 'BI', 'nav.agriculture': 'Landwirtschaft', 'nav.poultry': 'Geflügel',
    'nav.resellers': 'Wiederverkäufer', 'nav.employees': 'Mitarbeiter', 'nav.hr': 'Personal',
    'common.save': 'Speichern', 'common.cancel': 'Abbrechen', 'common.delete': 'Löschen', 'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen', 'common.search': 'Suchen', 'common.loading': 'Laden...', 'common.name': 'Name',
    'common.email': 'E-Mail', 'common.phone': 'Telefon', 'common.total': 'Gesamt',
    'pos.title': 'Kasse', 'pos.finalize': 'Verkauf abschließen',
    'payment.cash': 'Bargeld', 'payment.method': 'Zahlungsmethode',
    'auth.login': 'Anmelden', 'auth.signup': 'Registrieren', 'auth.logout': 'Abmelden',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'SaaS ERP-Plattform',
  },
  it: {
    'nav.dashboard': 'Cruscotto', 'nav.pos': 'POS', 'nav.products': 'Prodotti', 'nav.inventory': 'Magazzino',
    'nav.sales': 'Vendite', 'nav.sellers': 'Venditori', 'nav.stores': 'Negozi', 'nav.cashRegister': 'Cassa',
    'nav.reports': 'Rapporti', 'nav.financial': 'Finanziario', 'nav.accounting': 'Contabilità',
    'nav.fiscal': 'Fiscale', 'nav.crm': 'CRM', 'nav.suppliers': 'Fornitori', 'nav.subscription': 'Abbonamento',
    'nav.settings': 'Impostazioni', 'nav.community': 'Comunità', 'nav.ceoDashboard': 'Dashboard CEO',
    'nav.wallet': 'Portafoglio', 'nav.bi': 'BI', 'nav.resellers': 'Rivenditori', 'nav.employees': 'Dipendenti',
    'common.save': 'Salva', 'common.cancel': 'Annulla', 'common.delete': 'Elimina', 'common.edit': 'Modifica',
    'common.add': 'Aggiungi', 'common.search': 'Cerca', 'common.loading': 'Caricamento...', 'common.name': 'Nome',
    'common.total': 'Totale',
    'pos.title': 'Punto Vendita', 'pos.finalize': 'Finalizza Vendita',
    'payment.cash': 'Contanti', 'payment.method': 'Metodo di Pagamento',
    'auth.login': 'Accedi', 'auth.signup': 'Registrati', 'auth.logout': 'Esci',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Piattaforma ERP SaaS',
  },
  ar: {
    'nav.dashboard': 'لوحة القيادة', 'nav.pos': 'نقطة البيع', 'nav.products': 'المنتجات', 'nav.inventory': 'المخزون',
    'nav.sales': 'المبيعات', 'nav.sellers': 'البائعون', 'nav.stores': 'المتاجر', 'nav.cashRegister': 'الصندوق',
    'nav.reports': 'التقارير', 'nav.financial': 'المالية', 'nav.accounting': 'المحاسبة',
    'nav.settings': 'الإعدادات', 'nav.ceoDashboard': 'لوحة الرئيس التنفيذي',
    'common.save': 'حفظ', 'common.cancel': 'إلغاء', 'common.delete': 'حذف', 'common.edit': 'تعديل',
    'common.add': 'إضافة', 'common.search': 'بحث', 'common.loading': 'جاري التحميل...', 'common.name': 'الاسم',
    'common.total': 'المجموع',
    'pos.title': 'نقطة البيع', 'pos.finalize': 'إتمام البيع',
    'payment.cash': 'نقدي', 'payment.method': 'طريقة الدفع',
    'auth.login': 'تسجيل الدخول', 'auth.signup': 'إنشاء حساب', 'auth.logout': 'خروج',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'منصة ERP سحابية',
  },
  zh: {
    'nav.dashboard': '仪表板', 'nav.pos': '销售点', 'nav.products': '产品', 'nav.inventory': '库存',
    'nav.sales': '销售', 'nav.sellers': '销售员', 'nav.stores': '门店', 'nav.cashRegister': '收银台',
    'nav.reports': '报告', 'nav.financial': '财务', 'nav.accounting': '会计',
    'nav.settings': '设置', 'nav.ceoDashboard': 'CEO仪表板',
    'common.save': '保存', 'common.cancel': '取消', 'common.delete': '删除', 'common.edit': '编辑',
    'common.add': '添加', 'common.search': '搜索', 'common.loading': '加载中...', 'common.name': '名称',
    'common.total': '总计',
    'pos.title': '销售点', 'pos.finalize': '完成销售',
    'payment.cash': '现金', 'payment.method': '支付方式',
    'auth.login': '登录', 'auth.signup': '注册', 'auth.logout': '退出',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'SaaS ERP 平台',
  },
  ru: {
    'nav.dashboard': 'Панель', 'nav.pos': 'Касса', 'nav.products': 'Товары', 'nav.inventory': 'Склад',
    'nav.sales': 'Продажи', 'nav.sellers': 'Продавцы', 'nav.stores': 'Магазины', 'nav.cashRegister': 'Касса',
    'nav.reports': 'Отчёты', 'nav.financial': 'Финансы', 'nav.accounting': 'Бухгалтерия',
    'nav.settings': 'Настройки', 'nav.ceoDashboard': 'Панель CEO',
    'common.save': 'Сохранить', 'common.cancel': 'Отмена', 'common.delete': 'Удалить', 'common.edit': 'Редактировать',
    'common.add': 'Добавить', 'common.search': 'Поиск', 'common.loading': 'Загрузка...', 'common.name': 'Имя',
    'common.total': 'Итого',
    'pos.title': 'Точка продаж', 'pos.finalize': 'Завершить продажу',
    'payment.cash': 'Наличные', 'payment.method': 'Способ оплаты',
    'auth.login': 'Войти', 'auth.signup': 'Регистрация', 'auth.logout': 'Выйти',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'Облачная ERP платформа',
  },
  hi: {
    'nav.dashboard': 'डैशबोर्ड', 'nav.pos': 'पीओएस', 'nav.products': 'उत्पाद', 'nav.inventory': 'इन्वेंट्री',
    'nav.sales': 'बिक्री', 'nav.sellers': 'विक्रेता', 'nav.stores': 'स्टोर', 'nav.cashRegister': 'कैश रजिस्टर',
    'nav.reports': 'रिपोर्ट', 'nav.financial': 'वित्तीय', 'nav.accounting': 'लेखांकन',
    'nav.settings': 'सेटिंग्स', 'nav.ceoDashboard': 'सीईओ डैशबोर्ड',
    'common.save': 'सहेजें', 'common.cancel': 'रद्द करें', 'common.delete': 'हटाएं', 'common.edit': 'संपादित करें',
    'common.add': 'जोड़ें', 'common.search': 'खोजें', 'common.loading': 'लोड हो रहा है...', 'common.name': 'नाम',
    'common.total': 'कुल',
    'pos.title': 'बिक्री बिंदु', 'pos.finalize': 'बिक्री पूरी करें',
    'payment.cash': 'नकद', 'payment.method': 'भुगतान विधि',
    'auth.login': 'लॉगिन', 'auth.signup': 'साइन अप', 'auth.logout': 'लॉगआउट',
    'app.title': 'NAVANHULA ERP', 'app.subtitle': 'SaaS ERP प्लेटफ़ॉर्म',
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

const SUPPORTED_LANGS: Language[] = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ar', 'zh', 'ru', 'hi'];

function detectBrowserLanguage(): Language {
  const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'pt';
  if (SUPPORTED_LANGS.includes(browserLang as Language)) {
    return browserLang as Language;
  }
  return 'pt';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('navanhula_lang');
    if (saved && SUPPORTED_LANGS.includes(saved as Language)) {
      return saved as Language;
    }
    return detectBrowserLanguage();
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('navanhula_lang', lang);
    // Set dir attribute for RTL languages
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, []);

  // Set initial dir
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback((key: string): string => {
    // Try current language first, fallback to Portuguese, then English, then key
    return translations[language]?.[key] || translations['pt']?.[key] || translations['en']?.[key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};
