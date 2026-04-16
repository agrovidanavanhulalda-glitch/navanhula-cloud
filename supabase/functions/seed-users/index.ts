import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  
  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is CEO
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
      if (caller) {
        const { data: callerRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", caller.id)
          .single();
        if (callerRole?.role !== "ceo" && callerRole?.role !== "admin") {
          return new Response(JSON.stringify({ error: "Apenas CEO ou Admin podem criar usuários" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const body = await req.json();
    const users: { email: string; full_name: string; role: string; password?: string }[] = body.users || [];

    if (!users.length) {
      return new Response(JSON.stringify({ error: "Nenhum usuário fornecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get master company and store
    const { data: masterCompany } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("is_system_owner", true)
      .single();

    const { data: mainStore } = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("company_id", masterCompany?.id)
      .limit(1)
      .single();

    const results: { email: string; password: string; role: string; full_name: string; status: string }[] = [];

    for (const u of users) {
      const password = u.password || generatePassword();

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });

      if (authError) {
        results.push({ email: u.email, password: "", role: u.role, full_name: u.full_name, status: `error: ${authError.message}` });
        continue;
      }

      const userId = authData.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: u.email,
        full_name: u.full_name,
        company_id: masterCompany?.id,
        store_id: mainStore?.id,
        is_active: true,
        onboarding_completed: true,
      }, { onConflict: "id" });

      // Assign role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: u.role,
      }, { onConflict: "user_id,role" });

      results.push({ email: u.email, password, role: u.role, full_name: u.full_name, status: "created" });
    }

    return new Response(JSON.stringify({ success: true, users: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
