import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
            output = await handleFiscalIssuance(supabase, task.payload)
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
