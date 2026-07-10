// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables to include in the logical backup (public schema, user-facing).
const BACKUP_TABLES = [
  "companies", "stores", "branches", "profiles", "user_roles", "company_users",
  "products", "categories", "product_stock", "stock_movements", "stock_alerts",
  "sales", "sale_items", "customers", "customer_sellers",
  "cash_registers", "cash_movements",
  "suppliers", "purchase_orders", "purchase_order_items",
  "fiscal_documents", "fiscal_document_items", "document_series",
  "accounts_payable", "accounts_receivable", "expenses", "bank_accounts", "bank_transactions",
  "employees", "attendance", "payroll_runs", "commissions",
  "subscriptions", "manual_payments", "wallets", "wallet_transactions",
  "notifications", "audit_logs", "platform_settings", "feature_flags",
];

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify caller is founder
    const { data: userRes } = await userClient.auth.getUser();
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "unauthenticated" }, 401);

    const { data: isFounder } = await admin.rpc("is_founder", { _user_id: uid } as any);
    if (!isFounder) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "create");

    if (action === "create") return await handleCreate(admin, uid, body?.backup_type ?? "manual");
    if (action === "download") return await handleDownload(admin, uid, body?.id);
    if (action === "verify") return await handleVerify(admin, uid, body?.id);
    if (action === "restore") return await handleRestore(admin, uid, body?.id);

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("founder-backup error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

async function handleCreate(admin: any, uid: string, backupType: string) {
  const started = Date.now();
  const { data: bk, error: insErr } = await admin.from("founder_backups").insert({
    backup_type: backupType,
    status: "running",
    created_by: uid,
    filename: `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  }).select().single();
  if (insErr) throw insErr;

  try {
    const dump: Record<string, any[]> = {};
    let rowsTotal = 0;
    for (const table of BACKUP_TABLES) {
      const { data, error } = await admin.from(table).select("*").limit(50000);
      if (error) {
        console.warn(`skip ${table}: ${error.message}`);
        continue;
      }
      dump[table] = data ?? [];
      rowsTotal += (data ?? []).length;
    }

    const payload = {
      meta: {
        generated_at: new Date().toISOString(),
        generated_by: uid,
        version: "1.0",
        tables: BACKUP_TABLES.length,
        rows: rowsTotal,
      },
      data: dump,
    };

    const encoder = new TextEncoder();
    const bytes = encoder.encode(JSON.stringify(payload));
    const checksum = await sha256Hex(bytes);
    const path = `${new Date().getFullYear()}/${bk.id}.json`;

    const { error: upErr } = await admin.storage
      .from("founder-backups")
      .upload(path, bytes, { contentType: "application/json", upsert: true });
    if (upErr) throw upErr;

    const duration = Date.now() - started;
    await admin.from("founder_backups").update({
      status: "success",
      size_bytes: bytes.byteLength,
      checksum,
      storage_path: path,
      duration_ms: duration,
      completed_at: new Date().toISOString(),
    }).eq("id", bk.id);

    await admin.from("founder_audit_log").insert({
      founder_id: uid,
      action: "backup_create",
      target_type: "backup",
      target_id: bk.id,
      details: { size_bytes: bytes.byteLength, checksum, duration_ms: duration, tables: BACKUP_TABLES.length, rows: rowsTotal },
    });

    return json({ ok: true, id: bk.id, size: bytes.byteLength, checksum, duration_ms: duration });
  } catch (e) {
    await admin.from("founder_backups").update({
      status: "failed",
      error_message: (e as Error).message,
    }).eq("id", bk.id);
    throw e;
  }
}

async function handleDownload(admin: any, uid: string, id: string) {
  if (!id) return json({ error: "id required" }, 400);
  const { data: bk } = await admin.from("founder_backups").select("*").eq("id", id).single();
  if (!bk?.storage_path) return json({ error: "backup not available" }, 404);
  const { data: signed, error } = await admin.storage
    .from("founder-backups")
    .createSignedUrl(bk.storage_path, 600);
  if (error) throw error;
  await admin.from("founder_audit_log").insert({
    founder_id: uid, action: "backup_download", target_type: "backup", target_id: id, details: {},
  });
  return json({ url: signed.signedUrl, expires_in: 600 });
}

async function handleVerify(admin: any, uid: string, id: string) {
  if (!id) return json({ error: "id required" }, 400);
  const { data: bk } = await admin.from("founder_backups").select("*").eq("id", id).single();
  if (!bk?.storage_path) return json({ error: "backup not available" }, 404);
  const { data: file, error } = await admin.storage.from("founder-backups").download(bk.storage_path);
  if (error) throw error;
  const buf = new Uint8Array(await file.arrayBuffer());
  const checksum = await sha256Hex(buf);
  const ok = checksum === bk.checksum;
  await admin.from("founder_audit_log").insert({
    founder_id: uid, action: "backup_verify", target_type: "backup", target_id: id,
    details: { ok, checksum, expected: bk.checksum },
  });
  return json({ ok, checksum, expected: bk.checksum, size: buf.byteLength });
}

async function handleRestore(admin: any, uid: string, id: string) {
  // Safe restore is deferred — recording the intent for audit only.
  // A real restore would require a maintenance window and per-table upsert plan.
  if (!id) return json({ error: "id required" }, 400);
  await admin.from("founder_audit_log").insert({
    founder_id: uid, action: "backup_restore_requested", target_type: "backup", target_id: id,
    details: { note: "Restore requires maintenance window. Contact platform ops." },
  });
  return json({
    ok: false,
    message: "Restore request registrado. A restauração completa exige janela de manutenção — contactar operações da plataforma.",
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
