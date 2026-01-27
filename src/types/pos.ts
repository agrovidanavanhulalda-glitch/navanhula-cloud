// NAVANHULA POS Types

export type AppRole = 'admin' | 'manager' | 'seller';
export type PaymentMethod = 'cash' | 'mpesa' | 'emola' | 'card';
export type SaleStatus = 'pending' | 'completed' | 'cancelled' | 'refunded';
export type CashRegisterStatus = 'open' | 'closed';
export type StockAdjustmentReason = 'loss' | 'theft' | 'breakage' | 'admin_adjustment' | 'inventory_correction';

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  store_id?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  store?: Store;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category_id?: string;
  cost_price: number;
  sale_price: number;
  image_url?: string;
  barcode?: string;
  is_active: boolean;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  stock?: ProductStock;
}

export interface ProductStock {
  id?: string;
  product_id?: string;
  store_id?: string;
  quantity: number;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount_amount: number;
  total: number;
}

export interface Sale {
  id: string;
  store_id: string;
  user_id: string;
  cash_register_id?: string;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  total: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  synced: boolean;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_amount: number;
  total: number;
  profit: number;
  created_at: string;
}

export interface CashRegister {
  id: string;
  store_id: string;
  user_id: string;
  status: CashRegisterStatus;
  opening_amount: number;
  closing_amount?: number;
  expected_amount?: number;
  difference?: number;
  notes?: string;
  opened_at: string;
  closed_at?: string;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  created_by: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  store_id: string;
  quantity_change: number;
  reason: StockAdjustmentReason;
  notes?: string;
  adjusted_by: string;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  old_cost_price?: number;
  new_cost_price?: number;
  old_sale_price?: number;
  new_sale_price?: number;
  changed_by?: string;
  created_at: string;
}

// Dashboard stats
export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  todayProfit: number;
  lowStockProducts: number;
  activeRegisters: number;
}

// Auth context
export interface AuthContextType {
  user: Profile | null;
  role: AppRole | null;
  store: Store | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
