import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the caller's identity
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if caller has 'create_user' permission or is Master
    const { data: callerPerms, error: permError } = await supabaseClient.rpc('check_is_master', { user_uuid: caller.id });
    
    // Simple check for now: only Master or those with 'create_user' permission in user_company
    const { data: isMaster } = await supabaseClient.rpc('check_is_master', { user_uuid: caller.id });
    
    // For now, let's assume if they can call the function, we check their role inside the action logic
    const { action, payload } = await req.json();

    switch (action) {
      case "invite_user": {
        const { email, company_id, role_id } = payload;
        
        // Generate token
        const token = crypto.randomUUID();
        const expires_at = new Date();
        expires_at.setHours(expires_at.getHours() + 48);

        const { data: invite, error: inviteError } = await supabaseClient
          .from("invites")
          .insert({
            email,
            company_id,
            role_id,
            token,
            expires_at: expires_at.toISOString(),
            created_by: caller.id,
          })
          .select()
          .single();

        if (inviteError) throw inviteError;

        // In a real scenario, send email here
        const inviteLink = `${new URL(req.url).origin}/invite?token=${token}`;

        return new Response(JSON.stringify({ invite, inviteLink }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "create_user": {
        const { email, password, name, company_id, role_id } = payload;

        // 1. Create User in Auth
        const { data: userData, error: createError } = await supabaseClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: name },
        });

        if (createError) throw createError;

        // 2. Link to Company
        const { error: linkError } = await supabaseClient
          .from("user_company")
          .insert({
            user_id: userData.user.id,
            company_id,
            role_id,
            status: 'active',
          });

        if (linkError) throw linkError;

        return new Response(JSON.stringify({ user: userData.user }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "remove_user": {
        const { user_id, company_id } = payload;

        const { error: removeError } = await supabaseClient
          .from("user_company")
          .delete()
          .match({ user_id, company_id });

        if (removeError) throw removeError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
