import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isValidId } from "@/lib/uuid";

export interface DashboardStats {
  today_revenue: number;
  today_sales_count: number;
  month_revenue: number;
  last_month_revenue: number;
  low_stock_count: number;
}

export function useDashboardStats(storeId?: string) {
  const { company } = useAuth();

  return useQuery({
    queryKey: ['dashboard-stats', company?.id, storeId],
    queryFn: async () => {
      if (!isValidId(company?.id)) return null;

      const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_company_id: company.id,
        p_store_id: storeId || null
      });

      if (error) throw error;
      return data as DashboardStats;
    },
    enabled: isValidId(company?.id),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
