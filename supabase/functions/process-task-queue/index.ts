import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // 1. Get tasks to process (PENDING or RETRY and due)
    const { data: tasks, error: fetchError } = await supabase
      .from('background_tasks')
      .select('*')
      .in('status', ['PENDING', 'RETRY'])
      .lte('next_retry_at', new Date().toISOString())
      .limit(10)
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No tasks to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const results = []

    for (const task of tasks) {
      // 2. Mark as PROCESSING
      await supabase
        .from('background_tasks')
        .update({ 
          status: 'PROCESSING', 
          started_at: new Date().toISOString(),
          attempts: task.attempts + 1 
        })
        .eq('id', task.id)

      try {
        console.log(`Processing task ${task.id} (${task.task_type})`)
        
        // 3. Execute task logic based on type
        // This is a placeholder for actual task processing logic
        // For now, we simulate success or specific built-in types
        let success = true;
        
        switch (task.task_type) {
          case 'test':
            console.log('Test task payload:', task.payload)
            break;
          default:
            console.warn(`Unknown task type: ${task.task_type}`)
        }

        if (success) {
          // 4. Mark as COMPLETED
          await supabase
            .from('background_tasks')
            .update({ 
              status: 'COMPLETED', 
              completed_at: new Date().toISOString() 
            })
            .eq('id', task.id)
          
          results.push({ id: task.id, status: 'COMPLETED' })
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error)
        
        const isRetryable = task.attempts + 1 < task.max_attempts
        const nextStatus = isRetryable ? 'RETRY' : 'FAILED'
        
        // Exponential backoff: 2^attempts * 30 seconds
        const backoffSeconds = Math.pow(2, task.attempts) * 30
        const nextRetry = new Date()
        nextRetry.setSeconds(nextRetry.getSeconds() + backoffSeconds)

        await supabase
          .from('background_tasks')
          .update({ 
            status: nextStatus, 
            last_error: error.message,
            next_retry_at: isRetryable ? nextRetry.toISOString() : null
          })
          .eq('id', task.id)
          
        results.push({ id: task.id, status: nextStatus, error: error.message })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
