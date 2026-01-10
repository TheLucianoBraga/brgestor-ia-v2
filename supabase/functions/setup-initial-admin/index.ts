import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const MASTER_ID = "a0000000-0000-0000-0000-000000000001";

  const { data: existing } = await supabase
    .from("tenant_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", MASTER_ID)
    .maybeSingle();

  if (existing) {
    return Response.json({ ok: true, alreadyConfigured: true });
  }

  await supabase.from("tenant_members").insert({
    tenant_id: MASTER_ID,
    user_id: user.id,
    role_in_tenant: "owner",
    status: "active",
  });

  await supabase.from("profiles").upsert({
    user_id: user.id,
    current_tenant_id: MASTER_ID,
  });

  return Response.json({ ok: true, configured: true });
});
