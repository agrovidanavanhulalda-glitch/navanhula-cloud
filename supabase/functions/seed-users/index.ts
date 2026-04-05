import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSeed {
  username: string;
  email: string;
  password: string;
  role: string;
  full_name: string;
}

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

const USERS_TO_CREATE: Omit<UserSeed, "password">[] = [
  { username: "ceo_01", email: "ceo@navanhula.co.mz", role: "ceo", full_name: "CEO Principal" },
  { username: "diretor_01", email: "diretor1@navanhula.co.mz", role: "director", full_name: "Diretor Financeiro" },
  { username: "diretor_02", email: "diretor2@navanhula.co.mz", role: "director", full_name: "Diretor Operacional" },
  { username: "gestor_01", email: "gestor1@navanhula.co.mz", role: "manager", full_name: "Gestor Vendas" },
  { username: "gestor_02", email: "gestor2@navanhula.co.mz", role: "manager", full_name: "Gestor Logística" },
  { username: "gestor_03", email: "gestor3@navanhula.co.mz", role: "manager", full_name: "Gestor Produção" },
  { username: "rh_01", email: "rh1@navanhula.co.mz", role: "hr", full_name: "Técnico RH 1" },
  { username: "rh_02", email: "rh2@navanhula.co.mz", role: "hr", full_name: "Técnico RH 2" },
  { username: "caixa_01", email: "caixa1@navanhula.co.mz", role: "cashier", full_name: "Caixa 1" },
  { username: "caixa_02", email: "caixa2@navanhula.co.mz", role: "cashier", full_name: "Caixa 2" },
  { username: "caixa_03", email: "caixa3@navanhula.co.mz", role: "cashier", full_name: "Caixa 3" },
  { username: "revendedor_01", email: "revendedor1@navanhula.co.mz", role: "reseller", full_name: "Revendedor 1" },
  { username: "revendedor_02", email: "revendedor2@navanhula.co.mz", role: "reseller", full_name: "Revendedor 2" },
  { username: "revendedor_03", email: "revendedor3@navanhula.co.mz", role: "reseller", full_name: "Revendedor 3" },
  { username: "revendedor_04", email: "revendedor4@navanhula.co.mz", role: "reseller", full_name: "Revendedor 4" },
  { username: "revendedor_05", email: "revendedor5@navanhula.co.mz", role: "reseller", full_name: "Revendedor 5" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: { username: string; email: string; password: string; role: string; status: string }[] = [];

    for (const userDef of USERS_TO_CREATE) {
      const password = generatePassword();

      // Create auth user with auto-confirm
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userDef.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: userDef.full_name },
      });

      if (authError) {
        results.push({
          username: userDef.username,
          email: userDef.email,
          password: "",
          role: userDef.role,
          status: `error: ${authError.message}`,
        });
        continue;
      }

      const userId = authData.user.id;

      // Assign role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: userDef.role,
      }, { onConflict: "user_id,role" });

      results.push({
        username: userDef.username,
        email: userDef.email,
        password,
        role: userDef.role,
        status: "created",
      });
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
