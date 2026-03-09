import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the calling user is admin/manager
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser } } = await userClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check caller is admin/manager
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .maybeSingle();

    const allowedRoles = ['admin', 'manager', 'ceo'];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar vendedores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get caller's company
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('company_id, store_id')
      .eq('id', callingUser.id)
      .single();

    if (!callerProfile?.company_id) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { name, email, phone, store_id, role, password } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Nome e email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawPassword = typeof password === 'string' ? password.trim() : '';
    const safePassword = rawPassword.length >= 6 ? rawPassword : '123456';

    // Create auth user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: safePassword,
      email_confirm: true, // Auto-confirm for seller accounts created by admin
      user_metadata: {
        full_name: name,
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
      // Check if user already exists
      if (createError.message?.includes('already been registered')) {
        return new Response(JSON.stringify({ error: 'Este email já está registrado' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sellerId = newUser.user.id;

    // Upsert profile — handles both cases: trigger already created it, or not yet
    const targetStoreId = store_id || callerProfile.store_id;
    await adminClient.from('profiles').upsert({
      id: sellerId,
      full_name: name,
      email,
      phone: phone || null,
      company_id: callerProfile.company_id,
      store_id: targetStoreId,
      is_active: true,
      onboarding_completed: true,
    }, { onConflict: 'id' });

    // Assign role
    const dbRole = role === 'admin' ? 'manager' : 'seller';
    await adminClient.from('user_roles').upsert({
      user_id: sellerId,
      role: dbRole,
    }, { onConflict: 'user_id,role' });

    return new Response(JSON.stringify({
      success: true,
      seller_id: sellerId,
      temporary_password: safePassword,
      message: 'Vendedor criado com sucesso',
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
