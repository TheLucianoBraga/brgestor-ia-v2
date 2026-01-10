import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTenantRequest {
  tenantName: string;
  tenantType: string;
  ownerEmail: string;
  ownerName: string;
  ownerWhatsapp: string;
  sendInviteEmail: boolean;
  sendInviteWhatsapp: boolean;
  parentTenantId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Não autorizado", code: "UNAUTHORIZED" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user making the request
    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Não autorizado", code: "UNAUTHORIZED" } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateTenantRequest = await req.json();
    const { tenantName, tenantType, ownerEmail, ownerName, ownerWhatsapp, sendInviteEmail, sendInviteWhatsapp, parentTenantId } = body;

    // Validate required fields
    if (!tenantName || !tenantType || !ownerEmail || !ownerName || !ownerWhatsapp || !parentTenantId) {
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Campos obrigatórios não preenchidos", code: "VALIDATION_ERROR" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email?.toLowerCase() === ownerEmail.toLowerCase());
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Email já cadastrado no sistema", code: "EMAIL_EXISTS" } }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the tenant with 7 days trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    
    const insertData: Record<string, unknown> = {
      name: tenantName,
      type: tenantType,
      parent_tenant_id: parentTenantId,
      status: 'active',
      trial_ends_at: trialEndsAt.toISOString(),
    };

    if (tenantType === 'cliente') {
      insertData.owner_tenant_id = parentTenantId;
    }

    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert(insertData)
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError);
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Erro ao criar conta", code: "TENANT_ERROR" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create user in auth.users with a temporary password
    const tempPassword = crypto.randomUUID().slice(0, 12);
    
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        whatsapp: ownerWhatsapp || null,
      }
    });

    if (userError) {
      // Rollback tenant creation
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id);
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ ok: false, error: { message: "Erro ao criar usuário", code: "USER_ERROR" } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Update profile with name
    await supabaseAdmin
      .from('profiles')
      .update({ 
        full_name: ownerName,
        current_tenant_id: tenant.id 
      })
      .eq('user_id', newUser.user.id);

    // 4. Create tenant_member linking user to tenant as admin
    const { error: memberError } = await supabaseAdmin
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: newUser.user.id,
        role_in_tenant: 'admin',
        status: 'active'
      });

    if (memberError) {
      console.error("Error creating tenant member:", memberError);
    }

    // 5. Generate ref_code for first access (password reset)
    const { data: refCode, error: refCodeError } = await supabaseAdmin
      .from('ref_codes')
      .insert({
        kind: 'first_access',
        owner_tenant_id: tenant.id,
        payload: { 
          user_id: newUser.user.id, 
          email: ownerEmail,
          name: ownerName
        },
        active: true,
      })
      .select('code')
      .single();

    if (refCodeError) {
      console.error("Error creating ref code:", refCodeError);
    }

    const accessLink = refCode ? `${req.headers.get('origin') || ''}/r/${refCode.code}` : null;

    // 6. Send invite email if requested
    let emailSent = false;
    if (sendInviteEmail && accessLink) {
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Sistema <noreply@resend.dev>",
              to: [ownerEmail],
              subject: `Acesso à sua conta ${tenantName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333;">Bem-vindo(a), ${ownerName}!</h1>
                  <p>Sua conta <strong>${tenantName}</strong> foi criada com sucesso.</p>
                  <p>Clique no botão abaixo para definir sua senha e acessar o sistema:</p>
                  <a href="${accessLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
                    Acessar minha conta
                  </a>
                  <p style="color: #666; font-size: 14px;">Se o botão não funcionar, copie e cole este link no navegador:</p>
                  <p style="color: #666; font-size: 12px; word-break: break-all;">${accessLink}</p>
                </div>
              `,
            }),
          });
          
          emailSent = emailResponse.ok;
        }
      } catch (e) {
        console.error("Error sending email:", e);
      }
    }

    // 7. Send invite WhatsApp if requested
    let whatsappSent = false;
    if (sendInviteWhatsapp && accessLink && ownerWhatsapp) {
      try {
        // Fetch tenant settings to get WAHA API info
        const { data: tenantSettings } = await supabaseAdmin
          .from('tenant_settings')
          .select('waha_api_url, waha_session_name')
          .eq('tenant_id', parentTenantId)
          .single();
        
        if (tenantSettings?.waha_api_url && tenantSettings?.waha_session_name) {
          const wahaUrl = tenantSettings.waha_api_url;
          const sessionName = tenantSettings.waha_session_name;
          
          // Format phone number (remove non-digits and add country code if needed)
          let phone = ownerWhatsapp.replace(/\D/g, '');
          if (!phone.startsWith('55')) {
            phone = '55' + phone;
          }
          
          const message = `Olá ${ownerName}! 👋

Sua conta *${tenantName}* foi criada com sucesso!

Acesse o link abaixo para definir sua senha e começar a usar o sistema:

${accessLink}`;
          
          const wahaResponse = await fetch(`${wahaUrl}/api/sendText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chatId: `${phone}@c.us`,
              text: message,
              session: sessionName,
            }),
          });
          
          whatsappSent = wahaResponse.ok;
        }
      } catch (e) {
        console.error("Error sending WhatsApp:", e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          tenant: {
            id: tenant.id,
            name: tenant.name,
            type: tenant.type,
            status: tenant.status,
            created_at: tenant.created_at,
          },
          owner: {
            id: newUser.user.id,
            email: ownerEmail,
            name: ownerName,
            whatsapp: ownerWhatsapp,
          },
          accessLink,
          refCode: refCode?.code,
          emailSent,
          whatsappSent,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: { message: "Erro interno", code: "INTERNAL_ERROR" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
