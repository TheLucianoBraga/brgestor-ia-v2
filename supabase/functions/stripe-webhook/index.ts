import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    console.log('Stripe webhook received');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse the event
    const event = JSON.parse(body);
    console.log('Event type:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment_intent.succeeded': {
        const paymentData = event.data.object;
        const metadata = paymentData.metadata || {};
        const customerId = metadata.customer_id;
        const customerItemId = metadata.customer_item_id;
        const tenantId = metadata.tenant_id;
        const currency = paymentData.currency?.toUpperCase() || 'BRL';
        const amount = paymentData.amount_received || paymentData.amount_total;

        console.log('Payment succeeded:', {
          customerId,
          customerItemId,
          tenantId,
          amount,
          currency
        });

        // Activate customer item if present
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
        const customerChargeId = metadata.customer_charge_id || metadata.charge_id;
        if (customerChargeId) {
          await supabase
            .from('customer_charges')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
            })
            .eq('id', customerChargeId);
        }

        // Create notification for tenant owner
        if (tenantId) {
          // Get customer info
          let customerName = 'Cliente';
          if (customerId) {
            const { data: customer } = await supabase
              .from('customers')
              .select('full_name')
              .eq('id', customerId)
              .single();
            customerName = customer?.full_name || 'Cliente';
          }

          // Get tenant owner
          const { data: members } = await supabase
            .from('tenant_members')
            .select('user_id')
            .eq('tenant_id', tenantId)
            .eq('role', 'owner');

          if (members && members.length > 0) {
            const formattedAmount = new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
              style: 'currency',
              currency: currency
            }).format((amount || 0) / 100);

            await supabase.from('notifications').insert({
              tenant_id: tenantId,
              user_id: members[0].user_id,
              title: '💳 Pagamento Stripe Confirmado',
              message: `Pagamento de ${formattedAmount} de ${customerName} confirmado via Stripe`,
              type: 'payment',
              reference_type: 'customer_item',
              reference_id: customerItemId || customerId,
            });
          }

          // Send WhatsApp confirmation if configured
          if (customerId) {
            await sendWhatsAppConfirmation(supabase, tenantId, customerId, amount, currency);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const metadata = invoice.metadata || invoice.subscription_details?.metadata || {};
        const tenantId = metadata.tenant_id;
        const subscriptionId = invoice.subscription;

        console.log('Invoice paid:', { tenantId, subscriptionId });

        // Handle subscription payment
        if (subscriptionId && tenantId) {
          // Update subscription status
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('external_id', subscriptionId)
            .single();

          if (subscription) {
            await supabase
              .from('payments')
              .insert({
                buyer_tenant_id: subscription.buyer_tenant_id,
                seller_tenant_id: subscription.seller_tenant_id,
                subscription_id: subscription.id,
                amount: invoice.amount_paid / 100,
                status: 'paid',
                paid_at: new Date().toISOString(),
              });
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const metadata = subscription.metadata || {};
        const tenantId = metadata.tenant_id;

        console.log('Subscription event:', event.type, { tenantId });

        // Update subscription status in database
        if (subscription.id) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('external_id', subscription.id)
            .single();

          if (existingSub) {
            await supabase
              .from('subscriptions')
              .update({
                status: subscription.status === 'active' ? 'active' : subscription.status,
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('id', existingSub.id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        console.log('Subscription canceled:', subscription.id);

        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('external_id', subscription.id)
          .single();

        if (existingSub) {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled' })
            .eq('id', existingSub.id);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Stripe webhook error:', error);
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
  amount: number,
  currency: string
) {
  try {
    // Get tenant's WAHA settings
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .in('key', ['waha_api_url', 'waha_api_key']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    if (!settingsMap['waha_api_url'] || !settingsMap['waha_api_key']) {
      console.log('WAHA not configured for tenant');
      return;
    }

    // Get customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('full_name, whatsapp')
      .eq('id', customerId)
      .single();

    if (!customer?.whatsapp) {
      console.log('Customer has no WhatsApp');
      return;
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    const formattedAmount = new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);

    const message = `✅ *Pagamento Confirmado!*\n\n` +
      `Olá ${customer.full_name.split(' ')[0]}!\n\n` +
      `Recebemos seu pagamento de *${formattedAmount}* via Stripe.\n\n` +
      `Seu acesso foi liberado automaticamente! 🎉\n\n` +
      `Obrigado pela confiança!\n` +
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

    console.log('WhatsApp confirmation sent');
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
  }
}
