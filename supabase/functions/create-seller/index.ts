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

    // Check caller is admin/manager/ceo
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: callerRole } = await adminClient
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', callingUser.id)
      .maybeSingle();

    const allowedRoles = ['admin', 'manager', 'ceo', 'owner'];
    if (!callerRole || !allowedRoles.includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: 'Sem permissão para criar vendedores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { name, email, phone, store_id, branch_id, role, password } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'Nome e email são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce a strong password policy
    const rawPassword = typeof password === 'string' ? password.trim() : '';
    const isStrong = rawPassword.length >= 8
      && /[a-z]/.test(rawPassword)
      && /[A-Z]/.test(rawPassword)
      && /[0-9]/.test(rawPassword);

    let safePassword = rawPassword;
    if (!isStrong) {
      const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const lower = "abcdefghijkmnopqrstuvwxyz";
      const digits = "23456789";
      const symbols = "!@#$%&*";
      const all = upper + lower + digits + symbols;
      const rand = (n: number) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
      let pwd = upper[rand(upper.length)] + lower[rand(lower.length)] + digits[rand(digits.length)] + symbols[rand(symbols.length)];
      for (let i = 4; i < 14; i++) pwd += all[rand(all.length)];
      safePassword = pwd.split("").sort(() => rand(2) - 0.5).join("");
    }

    // Create auth user via admin API
    // The database trigger 'on_auth_user_created' handles profile, role, and company linkage.
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: safePassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        company_id: callerRole.company_id,
        role: role || 'seller',
        branch_id: branch_id || store_id,
        actor_id: callingUser.id,
        phone: phone || null
      },
    });

    if (createError) {
      console.error('Create user error:', createError);
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

    return new Response(JSON.stringify({
      success: true,
      user_id: newUser.user.id,
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
