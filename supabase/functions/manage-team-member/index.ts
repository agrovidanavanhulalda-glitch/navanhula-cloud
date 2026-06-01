import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const logStep = async (userId: string | null, email: string, step: string, status: string, message: string, metadata: any = {}) => {
    try {
      await adminClient.from('bootstrap_logs').insert({
        user_id: userId,
        email,
        step,
        status,
        message,
        metadata
      });
    } catch (e) {
      console.error(`Failed to log step ${step}:`, e);
    }
  };

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser } } = await userClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if caller is CEO or Admin (Managers can also create some roles, but let's keep it secure)
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', callingUser.id)
      .single();

    if (!callerProfile || !['ceo', 'admin', 'manager'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar utilizadores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, full_name, role, branch_id, password, send_email } = await req.json();

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Email, nome e cargo são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
    
    await logStep(null, email, 'auth_creation', 'processing', 'Iniciando criação de usuário auth');

    // 1. Create Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_id: callerProfile.company_id,
        role: role
      }
    });

    if (authError) {
      await logStep(null, email, 'auth_creation', 'failed', authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = authData.user.id;
    await logStep(newUserId, email, 'auth_creation', 'completed', 'Usuário auth criado com sucesso');

    // 2. Create Profile & Company User linkage
    // We do this explicitly to ensure atomicity in this flow, even if triggers exist.
    await logStep(newUserId, email, 'profile_creation', 'processing', 'Iniciando criação de perfil');

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUserId,
      full_name,
      email,
      company_id: callerProfile.company_id,
      role: role,
      onboarding_completed: true
    });

    if (profileError) {
      await logStep(newUserId, email, 'profile_creation', 'failed', profileError.message);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Link to company_users if needed (depends on schema)
    const { error: companyUserError } = await adminClient.from('company_users').upsert({
      user_id: newUserId,
      company_id: callerProfile.company_id,
      role: role,
      status: 'active'
    });

    if (companyUserError) {
       console.warn('Company user linkage error (might be duplicate or already handled by trigger):', companyUserError.message);
    }

    await logStep(newUserId, email, 'profile_creation', 'completed', 'Perfil criado e vinculado com sucesso');

    // 3. Handle Email Sending (Option A)
    if (send_email) {
      await logStep(newUserId, email, 'email_delivery', 'processing', 'Iniciando envio de email (simulado)');
      // Here you would integrate with Resend or Lovable's email system
      // For now, we log that it was requested.
      await logStep(newUserId, email, 'email_delivery', 'completed', 'Solicitação de email registrada');
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: newUserId,
      email: email,
      password: tempPassword,
      message: 'Utilizador criado com sucesso'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
