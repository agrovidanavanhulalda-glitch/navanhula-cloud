import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crc32 } from "https://deno.land/x/crc32@v0.2.2/mod.ts"
import { Md5 } from "https://deno.land/std@0.168.0/hash/md5.ts"
import { PDFDocument, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1"
import QRCode from "https://esm.sh/qrcode@1.5.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ============ Artifact generation & storage pipeline ============

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

function md5Hex(bytes: Uint8Array): string {
  return new Md5().update(bytes).toString()
}

function crc32Hex(bytes: Uint8Array): string {
  return crc32(bytes)
}

async function safeUpload(
  supabase: any, path: string, bytes: Uint8Array, contentType: string
): Promise<{ path: string; sha256: string; md5: string; crc32: string; size: number }> {
  const [sha, md5, crc] = [await sha256Hex(bytes), md5Hex(bytes), crc32Hex(bytes)]
  const { error } = await supabase.storage.from('fiscal-documents').upload(path, bytes, {
    contentType, upsert: true,
  })
  if (error) throw new Error(`STORAGE_UPLOAD_FAILED:${path}:${error.message}`)
  return { path, sha256: sha, md5, crc32: crc, size: bytes.length }
}

async function generateArtifacts(supabase: any, docId: string, companyId: string, docNumber: string) {
  const now = new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const base = `${companyId}/fiscal/${yyyy}/${mm}/${docId}`

  const { data: canonical, error: canErr } = await supabase.rpc('fiscal_document_canonical', { p_document_id: docId })
  if (canErr) throw new Error(`CANONICAL_FAILED:${canErr.message}`)

  const artifacts: Record<string, any> = { storage_paths: {} }
  const errors: string[] = []
  const encoder = new TextEncoder()

  // JSON (always)
  try {
    const jsonBytes = encoder.encode(JSON.stringify(canonical, null, 2))
    const r = await safeUpload(supabase, `${base}/document.json`, jsonBytes, 'application/json')
    artifacts.json_path = r.path
    artifacts.storage_paths.json = r
    artifacts.sha256 = r.sha256; artifacts.md5 = r.md5; artifacts.crc32 = r.crc32
    artifacts.file_size_bytes = r.size
  } catch (e: any) { errors.push(`JSON:${e.message}`) }

  // QR Code
  try {
    const qrPayload = JSON.stringify({ doc: docNumber, id: docId })
    const qrDataUrl: string = await QRCode.toDataURL(qrPayload, { type: 'image/png', width: 256 })
    const qrB64 = qrDataUrl.split(',')[1]
    const qrBytes = Uint8Array.from(atob(qrB64), c => c.charCodeAt(0))
    const r = await safeUpload(supabase, `${base}/qr.png`, qrBytes, 'image/png')
    artifacts.qr_path = r.path; artifacts.storage_paths.qr = r
  } catch (e: any) { errors.push(`QR:${e.message}`) }

  // PDF
  try {
    const pdf = await PDFDocument.create()
    const page = pdf.addPage([595, 842])
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    let y = 800
    page.drawText('DOCUMENTO FISCAL', { x: 50, y, size: 18, font: bold }); y -= 30
    page.drawText(`Nº ${docNumber}`, { x: 50, y, size: 12, font: bold }); y -= 20
    page.drawText(`Documento ID: ${docId}`, { x: 50, y, size: 9, font }); y -= 14
    page.drawText(`Emitido em: ${now.toISOString()}`, { x: 50, y, size: 9, font }); y -= 20
    const lines = JSON.stringify(canonical, null, 2).split('\n').slice(0, 60)
    for (const line of lines) {
      if (y < 40) break
      page.drawText(line.slice(0, 95), { x: 50, y, size: 7, font })
      y -= 10
    }
    const pdfBytes = await pdf.save()
    const r = await safeUpload(supabase, `${base}/document.pdf`, pdfBytes, 'application/pdf')
    artifacts.pdf_path = r.path; artifacts.storage_paths.pdf = r
  } catch (e: any) { errors.push(`PDF:${e.message}`) }

  // XML
  try {
    const esc = (s: any) => String(s ?? '').replace(/[<>&'"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[c]!))
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<FiscalDocument>\n  <Number>${esc(docNumber)}</Number>\n  <Id>${esc(docId)}</Id>\n  <IssuedAt>${now.toISOString()}</IssuedAt>\n  <Payload><![CDATA[${JSON.stringify(canonical)}]]></Payload>\n</FiscalDocument>`
    const r = await safeUpload(supabase, `${base}/document.xml`, encoder.encode(xml), 'application/xml')
    artifacts.xml_path = r.path; artifacts.storage_paths.xml = r
  } catch (e: any) { errors.push(`XML:${e.message}`) }

  // Metadata
  try {
    const meta = {
      document_id: docId, document_number: docNumber, company_id: companyId,
      generated_at: now.toISOString(), artifacts: artifacts.storage_paths, errors,
    }
    const r = await safeUpload(supabase, `${base}/metadata.json`, encoder.encode(JSON.stringify(meta, null, 2)), 'application/json')
    artifacts.metadata_path = r.path; artifacts.storage_paths.metadata = r
    artifacts.metadata = meta
  } catch (e: any) { errors.push(`META:${e.message}`) }

  // Checksums files (sidecar)
  try {
    const sums = Object.entries(artifacts.storage_paths).map(([k, v]: any) => `${v.sha256}  ${k}\n`).join('')
    const r = await safeUpload(supabase, `${base}/checksums.sha256`, encoder.encode(sums), 'text/plain')
    artifacts.checksum_sha256_path = r.path
  } catch (e: any) { errors.push(`SHA_SIDECAR:${e.message}`) }

  const hasCore = artifacts.json_path && artifacts.metadata_path
  artifacts.integrity_status = hasCore && errors.length === 0 ? 'verified' : (hasCore ? 'partial' : 'failed')
  return { artifacts, errors }
}



async function handleFiscalIssuance(supabase: any, task: any) {
  const payload = task.payload || {}
  const saleId = payload?.sale_id
  const startedAt = new Date()
  const t0 = performance.now()

  const auditBase: Record<string, any> = {
    job_id: task.id,
    sale_id: saleId,
    worker: 'process-task-queue',
    started_at: startedAt.toISOString(),
    retry_count: task.attempts,
    source: 'worker',
  }

  if (!saleId) {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'FAILED', error_code: 'MISSING_SALE_ID',
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    throw new Error('MISSING_SALE_ID')
  }

  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('id, store_id, company_id, subtotal, discount_amount, total, payment_method, status, customer_name, customer_phone, sale_items(product_name, quantity, unit_price)')
    .eq('id', saleId)
    .maybeSingle()

  if (saleErr || !sale) {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'FAILED',
      error_code: saleErr ? 'SALE_LOAD_FAILED' : 'SALE_NOT_FOUND',
      error_stack: saleErr?.message || null,
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    throw new Error(saleErr ? `SALE_LOAD_FAILED: ${saleErr.message}` : 'SALE_NOT_FOUND')
  }
  auditBase.company_id = sale.company_id
  auditBase.store_id = sale.store_id

  if (sale.status !== 'completed') {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'SKIPPED', error_code: 'SALE_NOT_COMPLETED',
      result: { sale_status: sale.status },
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    throw new Error(`SALE_NOT_COMPLETED: ${sale.status}`)
  }

  const notesTag = `Venda PDV #${String(sale.id).slice(0, 8)}`

  // Idempotency by notes tag
  const { data: dup } = await supabase
    .from('fiscal_documents')
    .select('id, document_number')
    .ilike('notes', `%${notesTag}%`)
    .limit(1)
  if (dup && dup.length > 0) {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'SKIPPED',
      fiscal_document_id: dup[0].id, document_number: dup[0].document_number,
      result: { skipped: true, reason: 'ALREADY_ISSUED' },
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    return { document_id: dup[0].id, document_number: dup[0].document_number, skipped: true }
  }

  const items = (sale.sale_items || []).map((it: any) => ({
    description: it.product_name || 'Item',
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    tax_rate: 0,
  }))

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('issue_fiscal_document', {
    p_document_type: 'invoice_receipt',
    p_customer_name: sale.customer_name || 'Consumidor Final',
    p_items: items,
    p_store_id: sale.store_id,
    p_customer_phone: sale.customer_phone || null,
    p_customer_email: null,
    p_customer_nuit: null,
    p_customer_address: null,
    p_valid_until: null,
    p_notes: `${notesTag} | ${sale.payment_method}`,
    p_tax_rate: 0,
    p_discount_amount: Number(sale.discount_amount || 0),
  })

  if (rpcErr) {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'FAILED', error_code: 'FISCAL_RPC_FAILED',
      error_stack: rpcErr.message,
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    throw new Error(`FISCAL_RPC_FAILED: ${rpcErr.message}`)
  }
  const r = rpcRes as any
  if (!r?.success) {
    await supabase.from('fiscal_audit_log').insert({
      ...auditBase, status: 'FAILED', error_code: 'FISCAL_RPC_ERROR',
      error_stack: r?.error || 'unknown',
      finished_at: new Date().toISOString(), duration_ms: Math.round(performance.now() - t0),
    })
    throw new Error(`FISCAL_RPC_ERROR: ${r?.error || 'unknown'}`)
  }

  // Compute hash/checksum & mark document integrity
  let hashOut: string | null = null
  try {
    const { data: verifyRes } = await supabase.rpc('verify_fiscal_document_integrity', {
      p_document_id: r.document_id,
    })
    hashOut = (verifyRes as any)?.hash || null
  } catch (e) {
    console.warn('integrity check failed:', (e as any)?.message)
  }

  const finishedAt = new Date()
  await supabase.from('fiscal_audit_log').insert({
    ...auditBase, status: 'SUCCESS',
    fiscal_document_id: r.document_id, document_number: r.document_number,
    hash: hashOut,
    result: { document_id: r.document_id, document_number: r.document_number },
    finished_at: finishedAt.toISOString(),
    duration_ms: Math.round(performance.now() - t0),
  })

  return { document_id: r.document_id, document_number: r.document_number }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: tasks, error: fetchError } = await supabase
      .from('background_tasks')
      .select('*')
      .in('status', ['PENDING', 'RETRY'])
      .lte('next_retry_at', new Date().toISOString())
      .limit(20)
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No tasks to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const results: any[] = []

    for (const task of tasks) {
      await supabase
        .from('background_tasks')
        .update({
          status: 'PROCESSING',
          started_at: new Date().toISOString(),
          attempts: task.attempts + 1,
        })
        .eq('id', task.id)

      try {
        console.log(`Processing task ${task.id} (${task.task_type}) attempt=${task.attempts + 1}`)
        let output: any = null

        switch (task.task_type) {
          case 'ISSUE_FISCAL_DOCUMENT':
            output = await handleFiscalIssuance(supabase, task)
            break
          case 'test':
            console.log('Test task payload:', task.payload)
            break
          default:
            console.warn(`Unknown task type: ${task.task_type}`)
        }

        await supabase
          .from('background_tasks')
          .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString(),
            last_error: null,
            payload: { ...task.payload, result: output },
          })
          .eq('id', task.id)

        results.push({ id: task.id, status: 'COMPLETED', output })
      } catch (error: any) {
        console.error(`Task ${task.id} failed:`, error?.message)
        const attempts = task.attempts + 1
        const isRetryable = attempts < task.max_attempts
        const nextStatus = isRetryable ? 'RETRY' : 'FAILED' // FAILED = Dead Letter Queue
        const backoffSeconds = Math.pow(2, attempts) * 30
        const nextRetry = new Date()
        nextRetry.setSeconds(nextRetry.getSeconds() + backoffSeconds)

        await supabase
          .from('background_tasks')
          .update({
            status: nextStatus,
            last_error: String(error?.message || error).slice(0, 500),
            next_retry_at: isRetryable ? nextRetry.toISOString() : null,
          })
          .eq('id', task.id)

        results.push({ id: task.id, status: nextStatus, error: error?.message })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
