import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('PagSeguro webhook received:', JSON.stringify(body));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // PagSeguro sends different notification formats
    // Format 1: charges (new API)
    // Format 2: transactions (legacy API)
    
    const notificationType = body.notificationType || body.type;
    
    if (notificationType === 'CHARGE' || body.charges) {
      // Handle charge notification (new API)
      const charge = body.charges?.[0] || body;
      const status = charge.status;
      const metadata = charge.metadata || {};
      const customerId = metadata.customer_id;
      const customerItemId = metadata.customer_item_id;
      const tenantId = metadata.tenant_id;
      const amount = charge.amount?.value || charge.paid_amount?.value;

      console.log('PagSeguro charge:', { status, customerId, customerItemId, tenantId, amount });

      // Check if payment is confirmed
      const paidStatuses = ['PAID', 'AVAILABLE', 'CONFIRMED'];
      
      if (paidStatuses.includes(status)) {
        // Activate customer item
        if (customerItemId) {
          // Calculate expires_at
          const startsAt = new Date();
          let expiresAt = new Date(startsAt);
          expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days

          const { error: updateError } = await supabase
            .from('customer_items')
            .update({
              status: 'active',
              starts_at: startsAt.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .eq('id', customerItemId);

          if (updateError) {
            console.error('Error updating customer_item:', updateError);
          } else {
            console.log('Customer item activated:', customerItemId);
          }
        }

        // Handle subscription
        const subscriptionId = metadata.subscription_id;
        if (subscriptionId) {
          const { data: subscription } = await supabase
            .from('customer_plan_subscriptions')
            .select('*, tenant_plans(duration_days)')
            .eq('id', subscriptionId)
            .single();

          const startDate = new Date();
          let endDate = new Date(startDate);
          const durationDays = (subscription as any)?.tenant_plans?.duration_days || 30;
          endDate.setDate(endDate.getDate() + durationDays);

          await supabase
            .from('customer_plan_subscriptions')
            .update({ 
              status: 'active',
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              next_billing_date: endDate.toISOString(),
            })
            .eq('id', subscriptionId);
        }

        // Handle customer_charges
        const customerChargeId = metadata.customer_charge_id;
        if (customerChargeId) {
          await supabase
            .from('customer_charges')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', customerChargeId);
        }

        // Create notification
        if (tenantId) {
          let customerName = 'Cliente';
          if (customerId) {
            const { data: customer } = await supabase
              .from('customers')
              .select('full_name')
              .eq('id', customerId)
              .single();
            customerName = customer?.full_name || 'Cliente';
          }

          const { data: members } = await supabase
            .from('tenant_members')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .eq('role', 'owner');

          if (members && members.length > 0) {
            const formattedAmount = new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format((amount || 0) / 100);

            await supabase.from('notifications').insert({
              tenant_id: tenantId,
              user_id: members[0].user_id,
              title: '💳 Pagamento PagSeguro Confirmado',
              message: `Pagamento de ${formattedAmount} de ${customerName} confirmado via PagSeguro`,
              type: 'payment',
              reference_type: 'customer_item',
              reference_id: customerItemId || customerId,
            });
          }

          // Send WhatsApp confirmation
          if (customerId) {
            await sendWhatsAppConfirmation(supabase, tenantId, customerId, amount);
          }
        }
      }
    } else if (notificationType === 'transaction' || body.notificationCode) {
      // Handle legacy transaction notification
      const notificationCode = body.notificationCode;
      
      // Need to fetch transaction details from PagSeguro
      // This requires the tenant's token, which we need to look up
      console.log('Legacy transaction notification:', notificationCode);
      
      // For legacy API, we need to fetch transaction details
      // This is more complex as we need to identify the tenant first
      // Usually done by reference in the transaction
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('PagSeguro webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendWhatsAppConfirmation(
  supabase: any,
  tenantId: string,
  customerId: string,
  amount: number
) {
  try {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['waha_api_url', 'waha_api_key']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    if (!settingsMap['waha_api_url'] || !settingsMap['waha_api_key']) {
      console.log('WAHA not configured');
      return;
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('full_name, whatsapp')
      .eq('id', customerId)
      .single();

    if (!customer?.whatsapp) {
      return;
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);

    const message = `✅ *Pagamento Confirmado!*\n\n` +
      `Olá ${customer.full_name.split(' ')[0]}!\n\n` +
      `Recebemos seu pagamento de *${formattedAmount}* via PagSeguro.\n\n` +
      `Seu acesso foi liberado automaticamente! 🎉\n\n` +
      `Obrigado!\n` +
      `*${tenant?.name || 'Equipe'}*`;

    const phone = customer.whatsapp.replace(/\D/g, '');
    const chatId = phone.startsWith('55') ? `${phone}@c.us` : `55${phone}@c.us`;

    await fetch(`${settingsMap['waha_api_url']}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settingsMap['waha_api_key']}`,
      },
      body: JSON.stringify({
        session: 'default',
        chatId,
        text: message,
      }),
    });

    console.log('WhatsApp sent');
  } catch (error) {
    console.error('WhatsApp error:', error);
  }
}
