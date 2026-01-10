import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find tenants with trial ending in 3 days
    const { data: tenantsNear3Days, error: err3 } = await supabase
      .from("tenants")
      .select("id, name, trial_ends_at, owner_tenant_id")
      .not("trial_ends_at", "is", null)
      .gte("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", threeDaysFromNow.toISOString())
      .gt("trial_ends_at", oneDayFromNow.toISOString())
      .eq("status", "active");

    if (err3) throw err3;

    // Find tenants with trial ending in 1 day
    const { data: tenantsNear1Day, error: err1 } = await supabase
      .from("tenants")
      .select("id, name, trial_ends_at, owner_tenant_id")
      .not("trial_ends_at", "is", null)
      .gte("trial_ends_at", now.toISOString())
      .lte("trial_ends_at", oneDayFromNow.toISOString())
      .eq("status", "active");

    if (err1) throw err1;

    // Find tenants with expired trial
    const { data: tenantsExpired, error: errExp } = await supabase
      .from("tenants")
      .select("id, name, trial_ends_at, owner_tenant_id")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", now.toISOString())
      .eq("status", "active");

    if (errExp) throw errExp;

    let notificationsSent = 0;

    // Process 3-day notifications
    for (const tenant of tenantsNear3Days || []) {
      const result = await sendTrialNotification(supabase, tenant, "3_days");
      if (result) notificationsSent++;
    }

    // Process 1-day notifications
    for (const tenant of tenantsNear1Day || []) {
      const result = await sendTrialNotification(supabase, tenant, "1_day");
      if (result) notificationsSent++;
    }

    // Process expired notifications
    for (const tenant of tenantsExpired || []) {
      const result = await sendTrialNotification(supabase, tenant, "expired");
      if (result) notificationsSent++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent,
        processed: {
          near3Days: tenantsNear3Days?.length || 0,
          near1Day: tenantsNear1Day?.length || 0,
          expired: tenantsExpired?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error processing trial notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendTrialNotification(
  supabase: any,
  tenant: { id: string; name: string; trial_ends_at: string; owner_tenant_id: string | null },
  notificationType: "3_days" | "1_day" | "expired"
) {
  const channels = ["in_app", "whatsapp", "email"];
  let sent = false;

  for (const channel of channels) {
    // Check if notification already sent
    const { data: existing } = await supabase
      .from("trial_notifications")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("notification_type", notificationType)
      .eq("channel", channel)
      .single();

    if (existing) continue;

    // Get tenant members to notify
    const { data: members } = await supabase
      .from("tenant_members")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "active");

    if (!members || members.length === 0) continue;

    // Create in-app notification
    if (channel === "in_app") {
      const title = getNotificationTitle(notificationType);
      const message = getNotificationMessage(notificationType, tenant.name);

      for (const member of members) {
        await supabase.from("notifications").insert({
          tenant_id: tenant.id,
          user_id: member.user_id,
          title,
          message,
          type: "trial_warning",
          reference_type: "trial",
        });
      }
    }

    // Record that notification was sent
    await supabase.from("trial_notifications").insert({
      tenant_id: tenant.id,
      notification_type: notificationType,
      channel,
    });

    sent = true;
  }

  return sent;
}

function getNotificationTitle(type: "3_days" | "1_day" | "expired"): string {
  switch (type) {
    case "3_days":
      return "⚠️ Seu trial expira em 3 dias";
    case "1_day":
      return "🚨 Seu trial expira amanhã!";
    case "expired":
      return "❌ Seu trial expirou";
  }
}

function getNotificationMessage(type: "3_days" | "1_day" | "expired", tenantName: string): string {
  switch (type) {
    case "3_days":
      return `O período de trial de ${tenantName} expira em 3 dias. Faça upgrade agora para não perder acesso às funcionalidades.`;
    case "1_day":
      return `O período de trial de ${tenantName} expira amanhã! Não perca tempo, faça upgrade agora.`;
    case "expired":
      return `O período de trial de ${tenantName} expirou. Faça upgrade para continuar usando todos os recursos.`;
  }
}
