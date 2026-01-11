import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    console.log('Asaas webhook received:', JSON.stringify(body));

    // Asaas webhook structure
    const { event, payment } = body;

    if (!event || !payment) {
      console.log('Invalid webhook payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Event:', event);
    console.log('Payment ID:', payment.id);
    console.log('Payment status:', payment.status);

    // Only process confirmed payments
    const confirmedEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_CREDIT_CARD_CAPTURE_CONFIRMED',
    ];

    if (!confirmedEvents.includes(event)) {
      console.log('Ignoring event:', event);
      return new Response(JSON.stringify({ received: true, event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse externalReference to get tenant and item info
    // Format: tenantId_customerItemId or tenantId_customerId_type
    const externalRef = payment.externalReference;
    if (!externalRef) {
      console.log('No external reference in payment');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parts = externalRef.split('_');
    const tenantId = parts[0];
    const customerItemId = parts[1];
    const paymentType = parts[2] || 'item';

    console.log('Parsed reference - Tenant:', tenantId, 'CustomerItem:', customerItemId, 'Type:', paymentType);

    // Handle customer_item payment
    if (paymentType === 'item' && customerItemId && customerItemId.length === 36) {
      // Calculate expires_at based on plan duration (default 30 days)
      const startsAt = new Date();
      let expiresAt = new Date(startsAt);
      expiresAt.setDate(expiresAt.getDate() + 30); // Default 30 days

      const { data: itemData, error: itemError } = await supabase
        .from('customer_items')
        .update({
          status: 'active',
          starts_at: startsAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', customerItemId)
        .select('*, customers(full_name, whatsapp, tenant_id)')
        .single();

      if (itemError) {
        console.error('Error updating customer_item:', itemError);
      } else {
        console.log('Customer item activated:', customerItemId);

        const customer = (itemData as any)?.customers;
        const customerTenantId = customer?.tenant_id || tenantId;

        // Create notification for tenant owner
        const { data: tenantMembers } = await supabase
          .from('tenant_members')
          .select('user_id')
          .eq('tenant_id', customerTenantId)
          .eq('role', 'owner')
          .limit(1);

        if (tenantMembers?.length) {
          await supabase.from('notifications').insert({
            tenant_id: customerTenantId,
            user_id: tenantMembers[0].user_id,
            type: 'payment',
            title: '💰 Pagamento Confirmado (Asaas)!',
            message: `O pagamento de ${customer?.full_name || 'cliente'} para ${itemData.product_name} foi confirmado. Valor: R$ ${payment.value?.toFixed(2)}`,
            reference_type: 'customer_item',
            reference_id: customerItemId,
          });
          console.log('Notification created');
        }

        // Try to send WhatsApp confirmation
        if (customer?.whatsapp) {
          try {
            const { data: wahaSettings } = await supabase
              .from('tenant_settings')
              .select('key, value')
              .eq('tenant_id', customerTenantId)
              .in('key', ['waha_api_url', 'waha_session']);

            const wahaMap: Record<string, string> = {};
            wahaSettings?.forEach((s: any) => {
              wahaMap[s.key] = s.value;
            });

            if (wahaMap['waha_api_url'] && wahaMap['waha_session']) {
              const phone = customer.whatsapp.replace(/\D/g, '');
              const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;

              const paymentMethodText = payment.billingType === 'BOLETO' 
                ? 'Boleto' 
                : payment.billingType === 'PIX' 
                ? 'PIX' 
                : 'Cartão';

              const message = `✅ *Pagamento Confirmado!*\n\n` +
                `Olá ${customer.full_name?.split(' ')[0] || 'Cliente'}!\n\n` +
                `Seu pagamento via *${paymentMethodText}* de *R$ ${payment.value?.toFixed(2)}* para *${itemData.product_name}* foi confirmado!\n\n` +
                `Seu serviço já está ativo. Obrigado pela preferência! 🙏`;

              await fetch(`${wahaMap['waha_api_url']}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chatId: `${formattedPhone}@c.us`,
                  text: message,
                  session: wahaMap['waha_session'],
                }),
              });
              console.log('WhatsApp confirmation sent');
            }
          } catch (whatsappError) {
            console.error('Error sending WhatsApp:', whatsappError);
          }
        }
      }
    }

    // Handle subscription payment
    if (paymentType === 'subscription' && customerItemId) {
      // Get plan duration to calculate end_date
      const { data: subscription } = await supabase
        .from('customer_plan_subscriptions')
        .select('*, tenant_plans(duration_days)')
        .eq('id', customerItemId)
        .single();

      const startDate = new Date();
      let endDate = new Date(startDate);
      const durationDays = (subscription as any)?.tenant_plans?.duration_days || 30;
      endDate.setDate(endDate.getDate() + durationDays);

      const { error: subError } = await supabase
        .from('customer_plan_subscriptions')
        .update({ 
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          next_billing_date: endDate.toISOString(),
        })
        .eq('id', customerItemId);

      if (subError) {
        console.error('Error updating subscription:', subError);
      } else {
        console.log('Subscription activated:', customerItemId);
      }
    }

    // Handle customer_charges payment
    if (paymentType === 'customer_charge' && customerItemId) {
      const { error: chargeError } = await supabase
        .from('customer_charges')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', customerItemId);

      if (chargeError) {
        console.error('Error updating customer_charge:', chargeError);
      } else {
        console.log('Customer charge marked as paid:', customerItemId);
      }
    }

    // Handle tenant payment (reseller paying master)
    if (paymentType === 'tenant' && customerItemId) {
      const { error: payError } = await supabase
        .from('payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', customerItemId);

      if (payError) {
        console.error('Error updating tenant payment:', payError);
      } else {
        console.log('Tenant payment confirmed:', customerItemId);
      }
    }

    // Handle charge payment
    if (paymentType === 'charge' && customerItemId) {
      const { error: chargeError } = await supabase
        .from('charges')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', customerItemId);

      if (chargeError) {
        console.error('Error updating charge:', chargeError);
      } else {
        console.log('Charge marked as paid:', customerItemId);
      }
    }

    console.log('Webhook processed successfully');
    return new Response(
      JSON.stringify({ received: true, processed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in asaas-webhook:', error);
    return new Response(
      JSON.stringify({ received: true, error: 'Internal processing error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
