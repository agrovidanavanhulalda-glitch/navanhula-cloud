import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidId } from "@/lib/uuid";

export function useProducts(options: { 
  searchTerm?: string, 
  pageSize?: number,
  storeId?: string 
} = {}) {
  const { company } = useAuth();
  const { searchTerm = '', pageSize = 20, storeId } = options;

  return useInfiniteQuery({
    queryKey: ['products', company?.id, storeId, searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      if (!isValidId(company?.id)) return { data: [], nextCursor: null };

      const from = pageParam * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('products')
        .select(`
          *,
          product_stock!inner(*)
        `)
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (storeId) {
        query = query.eq('product_stock.store_id', storeId);
      }

      const { data, error } = await query
        .order('name')
        .range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        nextCursor: data.length === pageSize ? pageParam + 1 : null,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isValidId(company?.id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
