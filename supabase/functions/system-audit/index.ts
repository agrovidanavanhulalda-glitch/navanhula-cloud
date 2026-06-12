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

async function auditFinance(db: ReturnType<typeof createClient>): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // 1. Negative sale totals
  const { data: negSales } = await db.from("sales").select("id, total, store_id").lt("total", 0).eq("status", "completed").limit(50);
  if (negSales && negSales.length > 0) {
    results.push({ module: "finance", severity: "critical", check_name: "negative_sale_totals", message: `${negSales.length} venda(s) com total negativo.`, action_taken: null, status: "needs_manual", details: { sale_ids: negSales.map(s => s.id) } });
  } else {
    results.push({ module: "finance", severity: "info", check_name: "negative_sale_totals", message: "Nenhuma venda com total negativo.", action_taken: null, status: "detected", details: null });
  }

  // 2. Zero profit items
  const { count: zpCount } = await db.from("sale_items").select("id", { count: "exact", head: true }).eq("profit", 0).gt("total", 0);
  if (zpCount && zpCount > 10) {
    results.push({ module: "finance", severity: "warning", check_name: "zero_profit_items", message: `${zpCount} itens com lucro zero mas valor positivo. Verifique custos.`, action_taken: null, status: "needs_manual", details: { count: zpCount } });
  }

  // 3. Negative wallet balances
  const { data: negWallets } = await db.from("wallets").select("id, store_id, payment_method, balance").lt("balance", 0).limit(20);
  if (negWallets && negWallets.length > 0) {
    results.push({ module: "finance", severity: "critical", check_name: "negative_wallet_balance", message: `${negWallets.length} carteira(s) com saldo negativo.`, action_taken: null, status: "needs_manual", details: { wallets: negWallets } });
  }

  // 4. Overdue payables
  const { data: overdue } = await db.from("accounts_payable").select("id, description, due_date, amount").eq("status", "pendente").lt("due_date", new Date().toISOString().split("T")[0]).limit(50);
  if (overdue && overdue.length > 0) {
    const totalOverdue = overdue.reduce((s, o) => s + Number(o.amount), 0);
    results.push({ module: "finance", severity: "warning", check_name: "overdue_payables", message: `${overdue.length} conta(s) a pagar vencida(s), total ${totalOverdue.toFixed(2)} MT.`, action_taken: null, status: "needs_manual", details: { count: overdue.length, total: totalOverdue } });
  }

  // 5. Sales without profit calculated — auto-fix by recalculating
  const { data: salesNoProfit } = await db.from("sales").select("id, total").eq("status", "completed").is("profit", null).limit(100);
  if (salesNoProfit && salesNoProfit.length > 0) {
    let fixed = 0;
    for (const sale of salesNoProfit) {
      const { data: items } = await db.from("sale_items").select("profit, total, cost_price, quantity").eq("sale_id", sale.id);
      if (items && items.length > 0) {
        const totalProfit = items.reduce((s, i) => s + (Number(i.profit) || (Number(i.total) - (Number(i.cost_price || 0) * Number(i.quantity || 1)))), 0);
        await db.from("sales").update({ profit: Math.round(totalProfit * 100) / 100 }).eq("id", sale.id);
        fixed++;
      }
    }
    results.push({ module: "finance", severity: "warning", check_name: "sales_without_profit", message: `${salesNoProfit.length} venda(s) sem lucro. ${fixed} recalculada(s).`, action_taken: fixed > 0 ? `Lucro recalculado em ${fixed} vendas` : null, status: fixed > 0 ? "auto_resolved" : "needs_manual", details: { total: salesNoProfit.length, fixed } });
  }

  // 6. Overdue receivables
  const { data: overdueAR } = await db.from("accounts_receivable").select("id, amount").eq("status", "pendente").lt("due_date", new Date().toISOString().split("T")[0]).limit(50);
  if (overdueAR && overdueAR.length > 0) {
    const totalAR = overdueAR.reduce((s, o) => s + Number(o.amount), 0);
    results.push({ module: "finance", severity: "warning", check_name: "overdue_receivables", message: `${overdueAR.length} conta(s) a receber vencida(s), total ${totalAR.toFixed(2)} MT.`, action_taken: null, status: "needs_manual", details: { count: overdueAR.length, total: totalAR } });
  }

  return results;
}

async function auditHR(db: ReturnType<typeof createClient>): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // 1. Zero salary employees
  const { data: zeroSalary } = await db.from("employees").select("id, full_name").eq("status", "active").eq("base_salary", 0).limit(50);
  if (zeroSalary && zeroSalary.length > 0) {
    results.push({ module: "hr", severity: "warning", check_name: "zero_salary_employees", message: `${zeroSalary.length} funcionário(s) ativo(s) com salário base zero.`, action_taken: null, status: "needs_manual", details: { employees: zeroSalary.map(e => e.full_name) } });
  } else {
    results.push({ module: "hr", severity: "info", check_name: "zero_salary_employees", message: "Todos os funcionários ativos têm salário configurado.", action_taken: null, status: "detected", details: null });
  }

  // 2. Employees without NUIT
  const { data: noNuit } = await db.from("employees").select("id, full_name").eq("status", "active").is("nuit", null).limit(50);
  if (noNuit && noNuit.length > 0) {
    results.push({ module: "hr", severity: "warning", check_name: "missing_nuit_employees", message: `${noNuit.length} funcionário(s) sem NUIT cadastrado.`, action_taken: null, status: "needs_manual", details: { employees: noNuit.map(e => e.full_name) } });
  }

  // 3. Employees without bank account
  const { data: noBank } = await db.from("employees").select("id, full_name").eq("status", "active").is("bank_account", null).limit(50);
  if (noBank && noBank.length > 0) {
    results.push({ module: "hr", severity: "warning", check_name: "missing_bank_employees", message: `${noBank.length} funcionário(s) sem conta bancária.`, action_taken: null, status: "needs_manual", details: { count: noBank.length } });
  }

  return results;
}

async function auditPOS(db: ReturnType<typeof createClient>): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // 1. Negative stock — auto-fix to 0
  const { data: negStock } = await db.from("product_stock").select("product_id, store_id, quantity").lt("quantity", 0).limit(50);
  if (negStock && negStock.length > 0) {
    for (const ps of negStock) {
      await db.from("product_stock").update({ quantity: 0 }).eq("product_id", ps.product_id).eq("store_id", ps.store_id);
    }
    results.push({ module: "pos", severity: "critical", check_name: "negative_stock", message: `${negStock.length} produto(s) com estoque negativo corrigido(s) para zero.`, action_taken: "Estoque negativo resetado para 0", status: "auto_resolved", details: { corrected: negStock.length } });
  } else {
    results.push({ module: "pos", severity: "info", check_name: "negative_stock", message: "Nenhum estoque negativo detectado.", action_taken: null, status: "detected", details: null });
  }

  // 2. Products with zero price
  const { count: zeroPriceCount } = await db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true).eq("sale_price", 0);
  if (zeroPriceCount && zeroPriceCount > 0) {
    results.push({ module: "pos", severity: "warning", check_name: "zero_price_products", message: `${zeroPriceCount} produto(s) ativo(s) com preço de venda zero.`, action_taken: null, status: "needs_manual", details: { count: zeroPriceCount } });
  }

  // 3. Open cash registers for more than 24h
  const { data: oldRegisters } = await db.from("cash_registers").select("id, store_id, opened_at").eq("status", "open").lt("opened_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).limit(20);
  if (oldRegisters && oldRegisters.length > 0) {
    results.push({ module: "pos", severity: "warning", check_name: "stale_cash_registers", message: `${oldRegisters.length} caixa(s) aberto(s) há mais de 24h.`, action_taken: null, status: "needs_manual", details: { register_ids: oldRegisters.map(r => r.id) } });
  }

  return results;
}

async function auditDocuments(db: ReturnType<typeof createClient>): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // 1. Fiscal documents with zero total
  const { data: zeroDocs } = await db.from("fiscal_documents").select("id, document_number").eq("total", 0).eq("status", "issued").limit(20);
  if (zeroDocs && zeroDocs.length > 0) {
    results.push({ module: "documents", severity: "warning", check_name: "zero_total_documents", message: `${zeroDocs.length} documento(s) fiscal(is) emitido(s) com total zero.`, action_taken: null, status: "needs_manual", details: { doc_numbers: zeroDocs.map(d => d.document_number) } });
  } else {
    results.push({ module: "documents", severity: "info", check_name: "zero_total_documents", message: "Todos os documentos fiscais emitidos têm valor válido.", action_taken: null, status: "detected", details: null });
  }

  return results;
}

async function auditCompliance(db: ReturnType<typeof createClient>): Promise<AuditResult[]> {
  const results: AuditResult[] = [];

  // 1. Companies without NIF
  const { data: noNif } = await db.from("companies").select("id, name").is("nif", null).eq("is_active", true).limit(20);
  if (noNif && noNif.length > 0) {
    results.push({ module: "compliance", severity: "warning", check_name: "missing_nif", message: `${noNif.length} empresa(s) ativa(s) sem NIF configurado.`, action_taken: null, status: "needs_manual", details: { companies: noNif.map(c => c.name) } });
  } else {
    results.push({ module: "compliance", severity: "info", check_name: "missing_nif", message: "Todas as empresas ativas possuem NIF.", action_taken: null, status: "detected", details: null });
  }

  // 2. Subscriptions expired
  const { data: expiredSubs } = await db.from("subscriptions").select("id, store_id").eq("status", "active").lt("current_period_end", new Date().toISOString()).limit(20);
  if (expiredSubs && expiredSubs.length > 0) {
    results.push({ module: "compliance", severity: "warning", check_name: "expired_subscriptions", message: `${expiredSubs.length} subscrição(ões) ativa(s) com período expirado.`, action_taken: null, status: "needs_manual", details: { count: expiredSubs.length } });
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // AUTH: This function aggregates data across ALL tenants using the service role,
    // so it is restricted to cron/service invocations only. User-facing audit views
    // must scope per-company via RLS-backed APIs, not this function.
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );


    // Run all audit modules in parallel
    const [finance, hr, pos, documents, compliance] = await Promise.all([
      auditFinance(supabaseAdmin),
      auditHR(supabaseAdmin),
      auditPOS(supabaseAdmin),
      auditDocuments(supabaseAdmin),
      auditCompliance(supabaseAdmin),
    ]);

    const results = [...finance, ...hr, ...pos, ...documents, ...compliance];

    // Save all results
    if (results.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("system_audit_logs").insert(results);
      if (insertError) console.error("Failed to insert audit logs:", insertError);
    }

    const summary = {
      timestamp: new Date().toISOString(),
      total_checks: results.length,
      critical: results.filter(r => r.severity === "critical").length,
      warnings: results.filter(r => r.severity === "warning").length,
      auto_resolved: results.filter(r => r.status === "auto_resolved").length,
      needs_manual: results.filter(r => r.status === "needs_manual").length,
      modules: [...new Set(results.map(r => r.module))],
      results,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
