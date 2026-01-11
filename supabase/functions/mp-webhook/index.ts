import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('MercadoPago webhook received:', JSON.stringify(body));

    // MercadoPago sends different types of notifications
    const { type, data, action } = body;

    // Only process payment notifications
    if (type !== 'payment' && !action?.includes('payment')) {
      console.log('Ignoring non-payment notification:', type, action);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.log('No payment ID in webhook');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing payment:', paymentId);

    // We need to find which tenant owns this payment
    const { data: allTokenSettings, error: tokensError } = await supabase
      .from('tenant_settings')
      .select('tenant_id, value')
      .eq('key', 'mp_access_token');

    if (tokensError || !allTokenSettings?.length) {
      console.error('No MercadoPago tokens found:', tokensError);
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try each token until we find the payment
    let paymentData = null;
    let ownerTenantId = null;

    for (const tokenSetting of allTokenSettings) {
      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenSetting.value}`,
          },
        });

        if (mpResponse.ok) {
          paymentData = await mpResponse.json();
          ownerTenantId = tokenSetting.tenant_id;
          console.log('Payment found for tenant:', ownerTenantId);
          break;
        }
      } catch (err) {
        console.log('Token failed for tenant:', tokenSetting.tenant_id);
      }
    }

    if (!paymentData) {
      console.log('Payment not found with any configured token');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment status:', paymentData.status);
    console.log('External reference:', paymentData.external_reference);

    // Only process approved payments
    if (paymentData.status !== 'approved') {
      console.log('Payment not approved yet, status:', paymentData.status);
      return new Response(JSON.stringify({ received: true, status: paymentData.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalRef = paymentData.external_reference;
    if (!externalRef) {
      console.log('No external reference in payment');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parts = externalRef.split('_');
    const tenantId = parts[0];
    const referenceId = parts[1];
    const paymentType = parts[2] || 'auto'; // auto-detect if not specified

    console.log('Parsed reference - Tenant:', tenantId, 'ReferenceId:', referenceId, 'Type:', paymentType);

    // Helper to create notification
    const createNotification = async (targetTenantId: string, title: string, message: string, refType: string, refId: string) => {
      try {
        const { data: tenantMembers } = await supabase
          .from('tenant_members')
          .select('user_id')
          .eq('tenant_id', targetTenantId)
          .eq('role', 'owner')
          .limit(1);

        if (tenantMembers?.length) {
          await supabase.from('notifications').insert({
            tenant_id: targetTenantId,
            user_id: tenantMembers[0].user_id,
            type: 'payment',
            title,
            message,
            reference_type: refType,
            reference_id: refId,
          });
          console.log('Notification created');
        }
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    };

    // Helper to send WhatsApp
    const sendWhatsApp = async (targetTenantId: string, phone: string, customerName: string, amount: number, productName: string) => {
      try {
        const { data: wahaSettings } = await supabase
          .from('tenant_settings')
          .select('key, value')
          .eq('tenant_id', targetTenantId)
          .in('key', ['waha_api_url', 'waha_session']);

        const wahaMap: Record<string, string> = {};
        wahaSettings?.forEach((s: any) => { wahaMap[s.key] = s.value; });

        if (wahaMap['waha_api_url'] && wahaMap['waha_session']) {
          const cleanPhone = phone.replace(/\D/g, '');
          const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

          const message = `✅ *Pagamento Confirmado!*\n\n` +
            `Olá ${customerName?.split(' ')[0] || 'Cliente'}!\n\n` +
            `Seu pagamento de *R$ ${amount.toFixed(2)}* para *${productName}* foi confirmado com sucesso!\n\n` +
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
          console.log('WhatsApp sent to:', formattedPhone);
        }
      } catch (err) {
        console.error('Error sending WhatsApp:', err);
      }
    };

    // Try to identify and process the payment type
    let processed = false;

    // 1. Try customer_charges first (most common for invoices)
    if (!processed && referenceId?.length === 36) {
      const { data: charge, error: chargeError } = await supabase
        .from('customer_charges')
        .select('*, customers(full_name, whatsapp, tenant_id)')
        .eq('id', referenceId)
        .maybeSingle();

      if (charge && !chargeError) {
        console.log('Found customer_charge:', referenceId);
        
        await supabase
          .from('customer_charges')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', referenceId);

        const customer = (charge as any).customers;
        const targetTenantId = customer?.tenant_id || tenantId;

        await createNotification(
          targetTenantId,
          '💰 Pagamento Confirmado!',
          `O pagamento de ${customer?.full_name || 'cliente'} foi confirmado. Valor: R$ ${paymentData.transaction_amount?.toFixed(2)}. Descrição: ${charge.description}`,
          'customer_charge',
          referenceId
        );

        if (customer?.whatsapp) {
          await sendWhatsApp(targetTenantId, customer.whatsapp, customer.full_name, paymentData.transaction_amount, charge.description);
        }

        processed = true;
        console.log('Customer charge marked as paid:', referenceId);
      }
    }

    // 2. Try customer_items
    if (!processed && referenceId?.length === 36) {
      const { data: item, error: itemError } = await supabase
        .from('customer_items')
        .select('*, customers(full_name, whatsapp, tenant_id)')
        .eq('id', referenceId)
        .maybeSingle();

      if (item && !itemError) {
        console.log('Found customer_item:', referenceId);

        const startsAt = new Date();
        const expiresAt = new Date(startsAt);
        expiresAt.setDate(expiresAt.getDate() + 30);

        await supabase
          .from('customer_items')
          .update({
            status: 'active',
            starts_at: startsAt.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', referenceId);

        const customer = (item as any).customers;
        const targetTenantId = customer?.tenant_id || tenantId;

        await createNotification(
          targetTenantId,
          '💰 Pagamento Confirmado!',
          `O pagamento de ${customer?.full_name || 'cliente'} para ${item.product_name} foi confirmado. Valor: R$ ${paymentData.transaction_amount?.toFixed(2)}`,
          'customer_item',
          referenceId
        );

        if (customer?.whatsapp) {
          await sendWhatsApp(targetTenantId, customer.whatsapp, customer.full_name, paymentData.transaction_amount, item.product_name);
        }

        processed = true;
        console.log('Customer item activated:', referenceId);
      }
    }

    // 3. Try subscriptions (tenant buying from another tenant)
    if (!processed && referenceId?.length === 36) {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*, services(name), tenants!subscriptions_buyer_tenant_id_fkey(name)')
        .eq('id', referenceId)
        .maybeSingle();

      if (subscription && !subError) {
        console.log('Found subscription:', referenceId);

        const startsAt = new Date();
        const endsAt = new Date(startsAt);
        endsAt.setMonth(endsAt.getMonth() + 1); // Monthly default

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
          })
          .eq('id', referenceId);

        // Also update the related payment record
        await supabase
          .from('payments')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('subscription_id', referenceId)
          .eq('status', 'pending');

        const serviceName = (subscription as any).services?.name || 'Serviço';
        const buyerName = (subscription as any).tenants?.name || 'Cliente';

        await createNotification(
          tenantId,
          '💰 Assinatura Confirmada!',
          `${buyerName} confirmou o pagamento da assinatura de ${serviceName}. Valor: R$ ${paymentData.transaction_amount?.toFixed(2)}`,
          'subscription',
          referenceId
        );

        processed = true;
        console.log('Subscription activated:', referenceId);
      }
    }

    // 4. Try payments table directly
    if (!processed && referenceId?.length === 36) {
      const { data: payment, error: payError } = await supabase
        .from('payments')
        .select('*, subscriptions(id, service_id, services(name)), tenants!payments_buyer_tenant_id_fkey(name)')
        .eq('id', referenceId)
        .maybeSingle();

      if (payment && !payError) {
        console.log('Found payment record:', referenceId);

        await supabase
          .from('payments')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('id', referenceId);

        // If it has a subscription, activate it too
        if ((payment as any).subscription_id) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', (payment as any).subscription_id);
        }

        const serviceName = (payment as any).subscriptions?.services?.name || 'Serviço';
        const buyerName = (payment as any).tenants?.name || 'Cliente';

        await createNotification(
          tenantId,
          '💰 Pagamento Confirmado!',
          `${buyerName} confirmou o pagamento de ${serviceName}. Valor: R$ ${paymentData.transaction_amount?.toFixed(2)}`,
          'payment',
          referenceId
        );

        processed = true;
        console.log('Payment marked as paid:', referenceId);
      }
    }

    // 5. Try customer_plan_subscriptions
    if (!processed && paymentType === 'subscription' && referenceId?.length === 36) {
      const { data: planSub } = await supabase
        .from('customer_plan_subscriptions')
        .select('*, tenant_plans(name, duration_days)')
        .eq('id', referenceId)
        .maybeSingle();

      if (planSub) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        const durationDays = (planSub as any).tenant_plans?.duration_days || 30;
        endDate.setDate(endDate.getDate() + durationDays);

        await supabase
          .from('customer_plan_subscriptions')
          .update({
            status: 'active',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            next_billing_date: endDate.toISOString(),
          })
          .eq('id', referenceId);

        processed = true;
        console.log('Customer plan subscription activated:', referenceId);
      }
    }

    if (!processed) {
      console.log('Could not identify payment type for reference:', externalRef);
    }

    console.log('Webhook processed successfully');
    return new Response(
      JSON.stringify({ received: true, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mp-webhook:', error);
    return new Response(
      JSON.stringify({ received: true, error: 'Internal processing error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
