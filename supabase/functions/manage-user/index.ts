import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_MAP: Record<string, string> = {
  'ceo': 'CEO',
  'admin': 'Admin',
  'manager': 'Gerente',
  'seller': 'Vendedor',
  'cashier': 'Vendedor',
  'accountant': 'Financeiro',
  'director': 'CEO'
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !caller) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { action, payload } = await req.json();
    console.log(`Action: ${action} by ${caller.email}`, payload);

    switch (action) {
      case "create_user": {
        const { email, password, name, company_id, role, branch_id } = payload;
        
        if (!email || !name || !company_id) {
          return new Response(JSON.stringify({ success: false, message: "Email, nome e empresa são obrigatórios" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // 1. Create User in Auth
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: password || "12345678",
          email_confirm: true,
          user_metadata: { full_name: name },
        });

        if (createError) {
          console.error("Auth creation error:", createError);
          return new Response(JSON.stringify({ success: false, message: createError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const newUserId = userData.user.id;

        // 2. Resolve Role
        const requestedRole = (role || 'seller').toLowerCase();
        const dbRoleName = ROLE_MAP[requestedRole] || 'Vendedor';
        
        const { data: roleData } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("name", dbRoleName)
          .maybeSingle();

        // 3. Create Profile
        await supabaseAdmin.from("profiles").upsert({
          id: newUserId,
          full_name: name,
          email: email,
          company_id,
          store_id: branch_id || null,
          status: 'active',
          onboarding_completed: true
        });

        // 4. Link to Company (Multiple tables for compatibility)
        await supabaseAdmin.from("user_company").upsert({
          user_id: newUserId,
          company_id,
          role_id: roleData?.id || null,
          status: 'active'
        });

        await supabaseAdmin.from("company_users").upsert({
          user_id: newUserId,
          company_id,
          role: requestedRole,
          branch_id: branch_id || null,
          status: 'active'
        });

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Utilizador criado com sucesso",
          user: userData.user 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "invite_user": {
        const { email, company_id, role, branch_id, max_uses, expires_days } = payload;
        
        if (!company_id) {
          throw new Error("Company ID is required");
        }

        const token = crypto.randomUUID();
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + (parseInt(expires_days) || 7));

        const requestedRole = (role || 'seller').toLowerCase();
        const dbRoleName = ROLE_MAP[requestedRole] || 'Vendedor';
        
        const { data: roleData } = await supabaseAdmin
          .from("roles")
          .select("id")
          .eq("name", dbRoleName)
          .maybeSingle();

        const { data: invite, error: inviteError } = await supabaseAdmin
          .from("company_invitations")
          .insert({
            company_id,
            role: requestedRole,
            role_id: roleData?.id || null,
            token,
            expires_at: expires_at.toISOString(),
            created_by: caller.id,
            max_uses: parseInt(max_uses) || 1,
            branch_id: branch_id || null,
            status: 'active'
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        const origin = req.headers.get("origin") || "https://navanhula.lovable.app";
        const inviteLink = `${origin}/convite/${token}`;

        return new Response(JSON.stringify({ 
          success: true, 
          invite, 
          inviteLink 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Critical error:", error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Return 200 but success: false for better client handling
    });
  }
});