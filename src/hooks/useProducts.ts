import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidId } from "@/lib/uuid";

export interface ProductStock {
  quantity: number;
  store_id: string;
}

export interface ProductWithStock {
  id: string;
  name: string;
  code: string | null;
  sale_price: number;
  cost_price: number;
  is_active: boolean;
  image_url: string | null;
  description: string | null;
  category_id: string | null;
  product_stock: ProductStock[];
  categories?: { name: string } | null;
}

export function useProducts(options: { 
  searchTerm?: string, 
  page?: number,
  pageSize?: number,
  storeId?: string 
} = {}) {
  const { company } = useAuth();
  const { searchTerm = '', page = 0, pageSize = 10, storeId } = options;

  return useQuery({
    queryKey: ['products', company?.id, storeId, searchTerm, page, pageSize],
    queryFn: async () => {
      if (!isValidId(company?.id)) return { data: [], count: 0 };

      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select(`
          *,
          product_stock(*),
          categories(name)
        `, { count: 'exact' })
        .eq('company_id', company.id);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .order('name')
        .range(from, to);

      if (error) throw error;

      return {
        data: (data || []) as ProductWithStock[],
        count: count || 0,
      };
    },
    enabled: isValidId(company?.id),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

