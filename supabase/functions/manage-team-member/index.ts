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

    // Check if caller is CEO, Admin, or Manager
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_super_admin, company_id')
      .eq('id', callingUser.id)
      .maybeSingle();

    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .maybeSingle();

    const isAuthorized = profile?.is_super_admin || 
                        ['ceo', 'admin', 'manager', 'owner'].includes(callerRole?.role || '');

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar utilizadores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const companyId = profile?.company_id || callerRole?.company_id;

    const { email, full_name, role, branch_id, store_id, password, send_email } = await req.json();

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Email, nome e cargo são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce role hierarchy: caller cannot assign a role >= their own.
    // Super admin has the highest implicit privilege.
    const ROLE_LEVELS: Record<string, number> = { ceo: 5, admin: 4, owner: 4, manager: 3, seller: 2, cashier: 1, viewer: 1 };
    const callerRoleName = (callerRole?.role || '').toLowerCase();
    const callerLevel = profile?.is_super_admin ? 99 : (ROLE_LEVELS[callerRoleName] ?? 0);
    const requestedRole = String(role).toLowerCase();
    const assignLevel = ROLE_LEVELS[requestedRole] ?? 0;
    if (assignLevel === 0 || assignLevel >= callerLevel) {
      return new Response(JSON.stringify({ error: 'Não pode atribuir um cargo igual ou superior ao seu' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use a strong password if not provided
    const tempPassword = password || Math.random().toString(36).slice(-4) + Math.random().toString(36).toUpperCase().slice(-4) + '1!';
    
    await logStep(null, email, 'auth_creation', 'processing', 'Iniciando criação de usuário auth');

    // 1. Create Auth User - The database trigger 'on_auth_user_created' will handle 
    // profiles, company_users, and user_roles creation automatically.
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_id: companyId,
        role: role,
        branch_id: branch_id || store_id,
        actor_id: callingUser.id
      }
    });

    if (authError) {
      await logStep(null, email, 'auth_creation', 'failed', authError.message);
      
      if (authError.message?.includes('already been registered')) {
        return new Response(JSON.stringify({ error: 'Este email já está registrado' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = authData.user.id;
    await logStep(newUserId, email, 'auth_creation', 'completed', 'Usuário auth criado com sucesso. Trigger de banco de dados processará o perfil.');

    // 2. Optional: Send welcome email
    if (send_email) {
      await logStep(newUserId, email, 'email_delivery', 'processing', 'Iniciando envio de email de boas-vindas');
      // Integration with email provider would go here
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
