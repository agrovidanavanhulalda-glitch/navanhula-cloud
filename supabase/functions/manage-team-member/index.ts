import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Roles permitted in the public.app_role enum
const VALID_DB_ROLES = ['ceo', 'admin', 'manager', 'seller', 'cashier', 'viewer'];
// Roles that REQUIRE a branch_id to be assigned (operational)
const OPERATIONAL_ROLES = ['seller', 'cashier', 'driver'];
// Owner-level roles that bypass normal restrictions
const OWNER_ALIASES = ['owner', 'super_admin', 'superadmin', 'proprietario', 'proprietário'];

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Normalize an incoming role string to a valid DB enum value.
// Returns { dbRole, isOwner } so the caller can apply owner privileges.
function normalizeRole(input: string): { dbRole: string | null; isOwner: boolean } {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return { dbRole: null, isOwner: false };
  if (OWNER_ALIASES.includes(raw)) return { dbRole: 'admin', isOwner: true };
  if (raw === 'gerente') return { dbRole: 'manager', isOwner: false };
  if (raw === 'vendedor') return { dbRole: 'seller', isOwner: false };
  if (raw === 'caixa') return { dbRole: 'cashier', isOwner: false };
  if (VALID_DB_ROLES.includes(raw)) return { dbRole: raw, isOwner: raw === 'ceo' };
  return { dbRole: null, isOwner: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let payload: any = {};

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json(401, { error: 'Não autorizado', code: 'NO_AUTH_HEADER' });

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !callingUser) {
      console.error('[manage-team-member] invalid session', { userErr });
      return json(401, { error: 'Sessão inválida', code: 'INVALID_SESSION' });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_super_admin, company_id')
      .eq('id', callingUser.id)
      .maybeSingle();

    const { data: callerRoleRow } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .maybeSingle();

    const callerRoleName = (callerRoleRow?.role || '').toLowerCase();
    const isOwnerCaller = !!profile?.is_super_admin || ['ceo', 'admin'].includes(callerRoleName);
    const isAuthorized = isOwnerCaller || callerRoleName === 'manager';

    if (!isAuthorized) {
      console.error('[manage-team-member] forbidden caller', { callerId: callingUser.id, callerRoleName });
      return json(403, { error: 'Sem permissão para criar utilizadores', code: 'FORBIDDEN' });
    }

    const companyId = profile?.company_id;

    try {
      payload = await req.json();
    } catch (e) {
      console.error('[manage-team-member] invalid JSON body', e);
      return json(400, { error: 'Corpo da requisição inválido (JSON)', code: 'BAD_JSON' });
    }

    const { email, full_name, role, branch_id, store_id, password, send_email } = payload;

    if (!full_name || !role) {
      return json(400, { error: 'Nome e cargo são obrigatórios', code: 'MISSING_FIELDS' });
    }

    const { dbRole, isOwner } = normalizeRole(role);
    if (!dbRole) {
      console.error('[manage-team-member] invalid role', { role, payload });
      return json(400, {
        error: `Cargo inválido: "${role}". Use: owner, admin, ceo, manager, seller, cashier, viewer`,
        code: 'INVALID_ROLE',
      });
    }

    // Hierarchy: owner/super_admin caller bypasses. Otherwise cannot assign >= own level.
    if (!isOwnerCaller) {
      const ROLE_LEVELS: Record<string, number> = { ceo: 5, admin: 4, manager: 3, seller: 2, cashier: 2, viewer: 1 };
      const callerLevel = ROLE_LEVELS[callerRoleName] ?? 0;
      const assignLevel = ROLE_LEVELS[dbRole] ?? 0;
      if (assignLevel >= callerLevel) {
        return json(403, {
          error: 'Não pode atribuir um cargo igual ou superior ao seu',
          code: 'ROLE_ESCALATION',
        });
      }
    }

    // Branch is only required for operational roles
    const effectiveBranch = branch_id || store_id || null;
    const incomingRoleLc = String(role).toLowerCase();
    if (OPERATIONAL_ROLES.includes(incomingRoleLc) && !effectiveBranch) {
      return json(400, {
        error: `O cargo "${role}" exige seleção de filial/loja`,
        code: 'BRANCH_REQUIRED',
      });
    }

    // Email is OPTIONAL for owners: if missing, synthesize a placeholder so auth.users can be created
    const safeEmail = (email && String(email).trim().toLowerCase())
      || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@local.navanhula`;

    const tempPassword =
      password ||
      (Math.random().toString(36).slice(-6) +
        Math.random().toString(36).toUpperCase().slice(-4) +
        '1!');

    // 1. Create auth user
    let newUserId: string | null = null;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: safeEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        company_id: companyId,
        role: dbRole,
        branch_id: effectiveBranch,
        actor_id: callingUser.id,
      },
    });

    if (authError) {
      const isDuplicate =
        authError.message?.toLowerCase().includes('already') ||
        authError.message?.toLowerCase().includes('registered');

      console.error('[manage-team-member] auth.createUser error', {
        role,
        dbRole,
        branch_id: effectiveBranch,
        email: safeEmail,
        payload,
        supabase_error: authError,
      });

      if (isDuplicate) {
        // Find existing user by email and proceed — per business rule
        const { data: list, error: listErr } = await adminClient.auth.admin.listUsers();
        if (listErr) {
          return json(500, {
            error: 'Email já registado e falhou a busca do utilizador existente',
            code: 'LOOKUP_FAILED',
            details: listErr.message,
          });
        }
        const existing = list?.users?.find(
          (u) => (u.email || '').toLowerCase() === safeEmail.toLowerCase()
        );
        if (!existing) {
          return json(409, {
            error: 'Este email já está registado mas não foi encontrado',
            code: 'EMAIL_CONFLICT',
          });
        }
        newUserId = existing.id;
      } else {
        return json(400, {
          error: authError.message,
          code: 'AUTH_CREATE_FAILED',
          details: authError,
        });
      }
    } else {
      newUserId = authData.user.id;
    }

    if (!newUserId) {
      return json(500, { error: 'Falha ao obter ID do utilizador', code: 'NO_USER_ID' });
    }

    // 2. Ensure profile + role + company_users rows exist (idempotent upserts).
    // Triggers normally handle this on creation, but we re-assert to cover the
    // "user already existed" branch and any partial trigger failures.
    const { error: profileErr } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: newUserId,
          full_name,
          company_id: companyId,
          store_id: effectiveBranch,
          branch_id: effectiveBranch,
        },
        { onConflict: 'id' }
      );
    if (profileErr) {
      console.error('[manage-team-member] profile upsert failed', {
        newUserId,
        payload,
        supabase_error: profileErr,
      });
    }

    const { error: roleErr } = await adminClient
      .from('user_roles')
      .upsert(
        { user_id: newUserId, role: dbRole, company_id: companyId },
        { onConflict: 'user_id,role' }
      );
    if (roleErr) {
      console.error('[manage-team-member] user_roles upsert failed', {
        newUserId,
        dbRole,
        supabase_error: roleErr,
      });
    }

    if (companyId) {
      await adminClient
        .from('company_users')
        .upsert(
          { user_id: newUserId, company_id: companyId, role: dbRole },
          { onConflict: 'user_id,company_id' }
        );
    }

    return json(200, {
      success: true,
      user_id: newUserId,
      email: safeEmail,
      role: dbRole,
      is_owner: isOwner,
      message: 'Utilizador criado com sucesso',
    });
  } catch (error: any) {
    console.error('[manage-team-member] unhandled error', { payload, error });
    return json(500, {
      error: error?.message || 'Erro interno',
      code: 'UNHANDLED',
      details: String(error?.stack || error),
    });
  }
});
