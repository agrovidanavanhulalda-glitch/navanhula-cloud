import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Scope = {
  company_id?: string | null;
  branch_id?: string | null;
  department_id?: string | null;
};

const cache = new Map<string, boolean>();

function cacheKey(userId: string, key: string, scope: Scope) {
  return `${userId}|${key}|${scope.company_id ?? ""}|${scope.branch_id ?? ""}|${scope.department_id ?? ""}`;
}

/**
 * Checks granular RBAC permission via public.user_has_permission.
 * Returns true while loading=false. Safe to use across the app:
 * never throws — denies on error.
 */
export function usePermission(permissionKey: string, scope: Scope = {}) {
  const [allowed, setAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const check = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      const ck = cacheKey(uid, permissionKey, scope);
      if (cache.has(ck)) {
        setAllowed(cache.get(ck)!);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("user_has_permission", {
        _user_id: uid,
        _key: permissionKey,
        _company_id: scope.company_id ?? null,
        _branch_id: scope.branch_id ?? null,
        _department_id: scope.department_id ?? null,
      });
      if (error) {
        console.warn("[usePermission] denied:", permissionKey, error.message);
        cache.set(ck, false);
        setAllowed(false);
      } else {
        const ok = data === true;
        cache.set(ck, ok);
        setAllowed(ok);
      }
    } catch (e) {
      console.warn("[usePermission] error", e);
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }, [permissionKey, scope.company_id, scope.branch_id, scope.department_id]);

  useEffect(() => {
    check();
  }, [check]);

  return { allowed, loading, refetch: check };
}

export function clearPermissionCache() {
  cache.clear();
}
