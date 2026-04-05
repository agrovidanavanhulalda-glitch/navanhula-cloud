import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuditResult {
  module: string;
  severity: "info" | "warning" | "critical";
  check_name: string;
  message: string;
  action_taken: string | null;
  status: "detected" | "auto_resolved" | "needs_manual";
  details: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: AuditResult[] = [];

    // ─── MODULE 1: FINANCE ───
    // Check for sales with negative totals
    const { data: negSales } = await supabaseAdmin
      .from("sales")
      .select("id, total, store_id")
      .lt("total", 0)
      .eq("status", "completed")
      .limit(50);

    if (negSales && negSales.length > 0) {
      results.push({
        module: "finance",
        severity: "critical",
        check_name: "negative_sale_totals",
        message: `${negSales.length} venda(s) com total negativo detectada(s).`,
        action_taken: null,
        status: "needs_manual",
        details: { sale_ids: negSales.map((s) => s.id) },
      });
    } else {
      results.push({
        module: "finance",
        severity: "info",
        check_name: "negative_sale_totals",
        message: "Nenhuma venda com total negativo.",
        action_taken: null,
        status: "detected",
        details: null,
      });
    }

    // Check for sales items with zero profit but positive total
    const { data: zeroProfitItems, count: zpCount } = await supabaseAdmin
      .from("sale_items")
      .select("id", { count: "exact" })
      .eq("profit", 0)
      .gt("total", 0)
      .limit(1);

    if (zpCount && zpCount > 10) {
      results.push({
        module: "finance",
        severity: "warning",
        check_name: "zero_profit_items",
        message: `${zpCount} itens de venda com lucro zero mas valor positivo. Verifique custos.`,
        action_taken: null,
        status: "needs_manual",
        details: { count: zpCount },
      });
    }

    // Check wallet balances for negative values
    const { data: negWallets } = await supabaseAdmin
      .from("wallets")
      .select("id, store_id, payment_method, balance")
      .lt("balance", 0)
      .limit(20);

    if (negWallets && negWallets.length > 0) {
      results.push({
        module: "finance",
        severity: "critical",
        check_name: "negative_wallet_balance",
        message: `${negWallets.length} carteira(s) com saldo negativo.`,
        action_taken: null,
        status: "needs_manual",
        details: { wallets: negWallets },
      });
    }

    // ─── MODULE 2: HR / PAYROLL ───
    // Employees with zero salary
    const { data: zeroSalary } = await supabaseAdmin
      .from("employees")
      .select("id, full_name")
      .eq("status", "active")
      .eq("base_salary", 0)
      .limit(50);

    if (zeroSalary && zeroSalary.length > 0) {
      results.push({
        module: "hr",
        severity: "warning",
        check_name: "zero_salary_employees",
        message: `${zeroSalary.length} funcionário(s) ativo(s) com salário base zero.`,
        action_taken: null,
        status: "needs_manual",
        details: { employees: zeroSalary.map((e) => e.full_name) },
      });
    } else {
      results.push({
        module: "hr",
        severity: "info",
        check_name: "zero_salary_employees",
        message: "Todos os funcionários ativos têm salário configurado.",
        action_taken: null,
        status: "detected",
        details: null,
      });
    }

    // ─── MODULE 3: POS / STOCK ───
    // Products with negative stock
    const { data: negStock } = await supabaseAdmin
      .from("product_stock")
      .select("product_id, store_id, quantity")
      .lt("quantity", 0)
      .limit(50);

    if (negStock && negStock.length > 0) {
      // Auto-correct: set negative stock to 0
      for (const ps of negStock) {
        await supabaseAdmin
          .from("product_stock")
          .update({ quantity: 0 })
          .eq("product_id", ps.product_id)
          .eq("store_id", ps.store_id);
      }
      results.push({
        module: "pos",
        severity: "critical",
        check_name: "negative_stock",
        message: `${negStock.length} produto(s) com estoque negativo corrigido(s) para zero.`,
        action_taken: "Estoque negativo resetado para 0",
        status: "auto_resolved",
        details: { corrected: negStock.length },
      });
    } else {
      results.push({
        module: "pos",
        severity: "info",
        check_name: "negative_stock",
        message: "Nenhum estoque negativo detectado.",
        action_taken: null,
        status: "detected",
        details: null,
      });
    }

    // Orphan sales (sales without items)
    const { data: orphanSales } = await supabaseAdmin.rpc("get_ceo_dashboard_stats").then(() => null).catch(() => null);
    // Use direct query instead
    const { data: salesNoItems, count: orphanCount } = await supabaseAdmin
      .from("sales")
      .select("id", { count: "exact" })
      .eq("status", "completed")
      .is("profit", null)
      .limit(1);

    if (orphanCount && orphanCount > 0) {
      results.push({
        module: "pos",
        severity: "warning",
        check_name: "sales_without_profit",
        message: `${orphanCount} venda(s) concluída(s) sem cálculo de lucro.`,
        action_taken: null,
        status: "needs_manual",
        details: { count: orphanCount },
      });
    }

    // ─── MODULE 4: DOCUMENTS ───
    // Fiscal documents with zero total
    const { data: zeroDocs } = await supabaseAdmin
      .from("fiscal_documents")
      .select("id, document_number")
      .eq("total", 0)
      .eq("status", "issued")
      .limit(20);

    if (zeroDocs && zeroDocs.length > 0) {
      results.push({
        module: "documents",
        severity: "warning",
        check_name: "zero_total_documents",
        message: `${zeroDocs.length} documento(s) fiscal(is) emitido(s) com total zero.`,
        action_taken: null,
        status: "needs_manual",
        details: { doc_numbers: zeroDocs.map((d) => d.document_number) },
      });
    }

    // ─── MODULE 5: ACCOUNTS ───
    // Unpaid payables past due
    const { data: overdue } = await supabaseAdmin
      .from("accounts_payable")
      .select("id, description, due_date, amount")
      .eq("status", "pendente")
      .lt("due_date", new Date().toISOString().split("T")[0])
      .limit(50);

    if (overdue && overdue.length > 0) {
      const totalOverdue = overdue.reduce((s, o) => s + Number(o.amount), 0);
      results.push({
        module: "finance",
        severity: "warning",
        check_name: "overdue_payables",
        message: `${overdue.length} conta(s) a pagar vencida(s), totalizando ${totalOverdue.toFixed(2)} MT.`,
        action_taken: null,
        status: "needs_manual",
        details: { count: overdue.length, total: totalOverdue },
      });
    }

    // ─── MODULE 6: COMPLIANCE ───
    // Companies without NIF
    const { data: noNif } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .is("nif", null)
      .eq("is_active", true)
      .limit(20);

    if (noNif && noNif.length > 0) {
      results.push({
        module: "compliance",
        severity: "warning",
        check_name: "missing_nif",
        message: `${noNif.length} empresa(s) ativa(s) sem NIF configurado.`,
        action_taken: null,
        status: "needs_manual",
        details: { companies: noNif.map((c) => c.name) },
      });
    }

    // ─── SAVE ALL RESULTS ───
    if (results.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("system_audit_logs")
        .insert(results);

      if (insertError) {
        console.error("Failed to insert audit logs:", insertError);
      }
    }

    // Build summary
    const summary = {
      timestamp: new Date().toISOString(),
      total_checks: results.length,
      critical: results.filter((r) => r.severity === "critical").length,
      warnings: results.filter((r) => r.severity === "warning").length,
      auto_resolved: results.filter((r) => r.status === "auto_resolved").length,
      needs_manual: results.filter((r) => r.status === "needs_manual").length,
      modules: [...new Set(results.map((r) => r.module))],
      results,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
