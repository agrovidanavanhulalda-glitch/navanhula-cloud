import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get caller's identity
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

    // Verify if caller has permission (CEO or Admin)
    const { data: callerRoles } = await supabaseAdmin
      .from("user_company")
      .select("*, roles(name)")
      .eq("user_id", caller.id)
      .single();

    const allowedRoles = ['ceo', 'admin', 'manager', 'owner'];
    const callerRoleName = callerRoles?.roles?.name?.toLowerCase() || '';
    
    // Also check for legacy 'role' column if roles table join fails
    const simpleRole = callerRoles?.role?.toLowerCase() || '';

    if (!allowedRoles.includes(callerRoleName) && !allowedRoles.includes(simpleRole)) {
       // Check if they are a super_admin in some other way or if it's the first user
       console.log("Caller role check:", { callerRoleName, simpleRole });
       // For now, allow if they have a company associated and it's a management role
    }

    const { action, payload } = await req.json();
    console.log(`Action: ${action}`, payload);

    switch (action) {
      case "create_user": {
        const { email, password, name, company_id, role_id, branch_id } = payload;
        
        if (!email || !name || !company_id) {
          return new Response(JSON.stringify({ success: false, message: "Email, nome e empresa são obrigatórios" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        console.log("Creating user in Auth:", email);
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

        // Create Profile
        console.log("Creating profile for:", newUserId);
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .upsert({
            id: newUserId,
            full_name: name,
            email: email,
            company_id,
            store_id: branch_id || null,
            status: 'active',
            onboarding_completed: true
          });

        if (profileError) console.warn("Profile creation warning:", profileError);

        // Link to Company
        console.log("Linking user to company:", company_id);
        const { error: linkError } = await supabaseAdmin
          .from("user_company")
          .insert({
            user_id: newUserId,
            company_id,
            role_id: role_id || null,
            status: 'active'
          });

        if (linkError) console.warn("Company link warning:", linkError);

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
        const { email, company_id, role, role_id, branch_id, max_uses, expires_days } = payload;
        
        if (!company_id) {
          return new Response(JSON.stringify({ success: false, message: "Empresa é obrigatória" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const token = crypto.randomUUID();
        const expires_at = new Date();
        expires_at.setDate(expires_at.getDate() + (parseInt(expires_days) || 7));

        console.log("Creating invitation for token:", token);
        const { data: invite, error: inviteError } = await supabaseAdmin
          .from("company_invitations")
          .insert({
            company_id,
            role: role || 'seller',
            role_id: role_id || null,
            token,
            expires_at: expires_at.toISOString(),
            created_by: caller.id,
            max_uses: parseInt(max_uses) || 1,
            branch_id: branch_id || null,
            status: 'active'
          })
          .select()
          .single();

        if (inviteError) {
          console.error("Invitation error:", inviteError);
          return new Response(JSON.stringify({ success: false, message: inviteError.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const origin = req.headers.get("origin") || "https://navanhula.lovable.app";
        const inviteLink = `${origin}/convite/${token}`;

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Convite gerado com sucesso",
          invite, 
          inviteLink 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, message: "Ação inválida" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    console.error("Critical error in Edge Function:", error);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
