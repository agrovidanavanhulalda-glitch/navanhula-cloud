import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, ClipboardCheck, AlertTriangle, Activity, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface GovernanceStats {
  active_users: number;
  pending_approvals: number;
  critical_changes_7d: number;
  security_events_24h: number;
  sod_violations: number;
}

const cards = [
  { key: "active_users", label: "Utilizadores Ativos", icon: Users, color: "text-blue-500" },
  { key: "pending_approvals", label: "Aprovações Pendentes", icon: ClipboardCheck, color: "text-amber-500" },
  { key: "critical_changes_7d", label: "Mudanças Críticas (7d)", icon: AlertTriangle, color: "text-orange-500" },
  { key: "security_events_24h", label: "Eventos Segurança (24h)", icon: Activity, color: "text-purple-500" },
  { key: "sod_violations", label: "Violações SoD", icon: Lock, color: "text-red-500" },
] as const;

export default function GovernancePage() {
  const { appReady, hasPerm } = useAuth();
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appReady) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_governance_dashboard");
      if (!error && data) setStats(data as unknown as GovernanceStats);
      setLoading(false);
    })();
  }, [appReady]);

  if (!hasPerm("governance.view") && !hasPerm("settings.manage")) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Sem permissão para visualizar a Governança.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Governança & IAM</h1>
          <p className="text-sm text-muted-foreground">Identidade, aprovações, auditoria e segregação de funções</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="press-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : (stats?.[key] ?? 0)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Módulos IAM</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {["Users","Roles","Permissions","Policies","Delegations","Sessions","Approvals","SoD Rules","Audit Logs"].map(m => (
            <div key={m} className="rounded-lg border p-3 bg-muted/30">{m}</div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
