// Mock data for fallback when backend is unavailable or slow
import type { Product, Category, CashRegister, Store, Profile } from '@/types/pos';

export const MOCK_CATEGORY: Category = {
  id: 'mock-category-1',
  name: 'Geral',
  description: 'Categoria padrão',
  color: '#3b82f6',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_PRODUCT: Product = {
  id: 'mock-product-1',
  code: 'TEST001',
  name: 'Produto Teste',
  description: 'Produto de demonstração',
  category_id: MOCK_CATEGORY.id,
  cost_price: 50,
  sale_price: 100,
  barcode: '',
  image_url: '',
  is_active: true,
  low_stock_threshold: 10,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category: MOCK_CATEGORY,
  stock: { quantity: 999 },
};

export const MOCK_STORE: Store = {
  id: 'mock-store-1',
  name: 'Loja Principal',
  address: '',
  phone: '',
  email: '',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_PROFILE: Profile = {
  id: 'mock-user-1',
  full_name: 'Usuário',
  email: 'user@local',
  phone: '',
  store_id: MOCK_STORE.id,
  avatar_url: '',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  store: MOCK_STORE,
};

export const createMockCashRegister = (storeId: string, userId: string): CashRegister => ({
  id: `local-${crypto.randomUUID()}`,
  store_id: storeId,
  user_id: userId,
  status: 'open',
  opening_amount: 0,
  opened_at: new Date().toISOString(),
});

// Timeout helper - wraps a promise with a maximum wait time
// Uses 'any' for fallback to avoid Postgrest type mismatches
export const withTimeout = <T>(
  promiseOrThenable: Promise<T> | PromiseLike<T>,
  timeoutMs: number,
  fallback: any
): Promise<T> => {
  const promise = Promise.resolve(promiseOrThenable);
  
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback as T), timeoutMs)),
  ]);
};

// Safe fetch with timeout and fallback
export const safeFetch = async <T>(
  fetchFn: () => Promise<{ data: T | null; error: any }>,
  fallback: T,
  timeoutMs: number = 1000
): Promise<T> => {
  try {
    const result = await withTimeout(
      fetchFn().then(({ data, error }) => {
        if (error) {
          console.warn('Fetch error (using fallback):', error);
          return fallback;
        }
        return data ?? fallback;
      }),
      timeoutMs,
      fallback
    );
    return result;
  } catch (err) {
    console.warn('Fetch exception (using fallback):', err);
    return fallback;
  }
};
