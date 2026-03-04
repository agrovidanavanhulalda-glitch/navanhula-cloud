// Currency and number formatters for Mozambican Metical

export const formatCurrency = (value: number): string => {
  const formatted = new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} MT`;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-MZ').format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('pt-MZ', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// Calculate profit margin percentage
export const calculateMargin = (costPrice: number, salePrice: number): number => {
  if (salePrice === 0) return 0;
  return ((salePrice - costPrice) / salePrice) * 100;
};

// Calculate profit
export const calculateProfit = (costPrice: number, salePrice: number, quantity: number = 1): number => {
  return (salePrice - costPrice) * quantity;
};

// Payment method labels
export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Dinheiro',
    mpesa: 'M-Pesa',
    emola: 'e-Mola',
    card: 'Cartão',
  };
  return labels[method] || method;
};

// Role labels
export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    seller: 'Vendedor',
  };
  return labels[role] || role;
};

// Stock adjustment reason labels
export const getAdjustmentReasonLabel = (reason: string): string => {
  const labels: Record<string, string> = {
    loss: 'Perda',
    theft: 'Roubo',
    breakage: 'Quebra',
    admin_adjustment: 'Ajuste Administrativo',
    inventory_correction: 'Correção de Inventário',
  };
  return labels[reason] || reason;
};

// Sale status labels
export const getSaleStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    refunded: 'Reembolsada',
  };
  return labels[status] || status;
};
