/**
 * NAVANHULA POS - Centralized UI Labels
 * All user-facing text constants. Never show technical keys to users.
 */

export const UI_LABELS = {
  // Payment Methods
  payment: {
    cash: 'Dinheiro',
    mpesa: 'M-Pesa',
    emola: 'E-Mola',
    card: 'Cartão',
    split: 'Pagamento Dividido',
    voucher: 'Voucher',
  } as Record<string, string>,

  // Sale Status
  saleStatus: {
    pending: 'Pendente',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    refunded: 'Reembolsada',
    open: 'Aberta',
  } as Record<string, string>,

  // Cash Register Status
  registerStatus: {
    open: 'Aberto',
    closed: 'Fechado',
  } as Record<string, string>,

  // User Roles
  roles: {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
    ceo: 'CEO',
  } as Record<string, string>,

  // Report Fields
  reportFields: {
    sales_total: 'Total de Vendas',
    sales_count: 'Quantidade de Vendas',
    total_revenue: 'Receita Total',
    total_profit: 'Lucro Total',
    average_ticket: 'Ticket Médio',
    total_discount: 'Total de Descontos',
    cancelled_count: 'Vendas Canceladas',
    cancelled_total: 'Valor Cancelado',
    opening_amount: 'Valor de Abertura',
    closing_amount: 'Valor de Fechamento',
    expected_amount: 'Valor Esperado',
    difference: 'Diferença',
    cost_price: 'Preço de Custo',
    sale_price: 'Preço de Venda',
    profit_margin: 'Margem de Lucro',
    stock_quantity: 'Quantidade em Estoque',
    low_stock: 'Estoque Baixo',
  } as Record<string, string>,

  // Dashboard KPIs
  kpi: {
    total_stores: 'Lojas Ativas',
    total_sales_today: 'Vendas Hoje',
    revenue_today: 'Receita Hoje',
    revenue_week: 'Receita Semanal',
    revenue_month: 'Receita Mensal',
    profit_month: 'Lucro do Mês',
    total_products: 'Total de Produtos',
    low_stock_count: 'Estoque Baixo',
    stores_online: 'Lojas Online',
    active_registers: 'Caixas Abertos',
  } as Record<string, string>,

  // Stock Adjustment Reasons
  adjustmentReason: {
    loss: 'Perda',
    theft: 'Roubo',
    breakage: 'Quebra',
    admin_adjustment: 'Ajuste Administrativo',
    inventory_correction: 'Correção de Inventário',
  } as Record<string, string>,

  // VIP Levels
  vipLevel: {
    regular: 'Regular',
    silver: 'Prata',
    gold: 'Ouro',
    platinum: 'Platina',
  } as Record<string, string>,

  // Module Names
  modules: {
    comercio: 'Comércio',
    agricultura: 'Agricultura',
    avicultura: 'Avicultura',
  } as Record<string, string>,

  // Periods
  periods: {
    today: 'Hoje',
    week: 'Semana',
    month: 'Mês',
    all: 'Todo Período',
  } as Record<string, string>,
};

/** Get a label safely, falling back to the key itself */
export const getLabel = (category: keyof typeof UI_LABELS, key: string): string => {
  const labels = UI_LABELS[category];
  return labels?.[key] || key;
};
