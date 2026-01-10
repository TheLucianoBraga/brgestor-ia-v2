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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      tenantId,
      customerId,
      customerItemId,
      chargeId,
      subscriptionId,
      amount,
      description,
      expiresInMinutes = 30,
    } = await req.json();

    console.log('Creating Stripe PIX:', { tenantId, customerId, chargeId, amount, description });

    if (!tenantId || !amount) {
      throw new Error('tenantId and amount are required');
    }

    // Get tenant's Stripe settings
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['stripe_secret_key', 'stripe_publishable_key']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    const stripeSecretKey = settingsMap['stripe_secret_key'];
    if (!stripeSecretKey) {
      throw new Error('Stripe não configurado para este tenant');
    }

    // Get customer info - support both customers and tenants (for tenant payments)
    let customerEmail = '';
    let customerName = '';
    let customerTaxId = '';
    
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('full_name, email, cpf_cnpj')
        .eq('id', customerId)
        .single();

      if (customer) {
        customerEmail = customer.email || '';
        customerName = customer.full_name || '';
        customerTaxId = customer.cpf_cnpj?.replace(/\D/g, '') || '';
      }
    }
    
    // If no customer, try to get info from the charge/payment (for tenant-to-tenant payments)
    if (!customerEmail && chargeId) {
      console.log('Looking for payment with chargeId:', chargeId);
      
      // Try payments table first (tenant subscriptions)
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('buyer_tenant_id')
        .eq('id', chargeId)
        .maybeSingle();
      
      console.log('Payment lookup result:', { payment, error: paymentError?.message });
      
      if (payment?.buyer_tenant_id) {
        // Get buyer tenant info
        const { data: buyerTenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', payment.buyer_tenant_id)
          .maybeSingle();
        
        if (buyerTenant) {
          customerName = buyerTenant.name || '';
        }
        
        // Get owner email via tenant_members (owner is the first member with role 'owner')
        const { data: members } = await supabase
          .from('tenant_members')
          .select('user_id, role_in_tenant')
          .eq('tenant_id', payment.buyer_tenant_id)
          .eq('role_in_tenant', 'owner')
          .limit(1);
        
        console.log('Tenant members:', members);
        
        if (members && members.length > 0) {
          const ownerId = members[0].user_id;
          
          // Get email from auth.users via admin API
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(ownerId);
          
          if (user?.email) {
            customerEmail = user.email;
            console.log('Found owner email:', customerEmail);
          } else {
            console.log('Could not get user email:', userError?.message);
          }
        }
      }
      
      // Try customer_charges if still no email
      if (!customerEmail) {
        const { data: charge } = await supabase
          .from('customer_charges')
          .select('customer_id')
          .eq('id', chargeId)
          .maybeSingle();
        
        if (charge?.customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('full_name, email, cpf_cnpj')
            .eq('id', charge.customer_id)
            .single();
          
          if (customer) {
            customerEmail = customer.email || '';
            customerName = customer.full_name || '';
            customerTaxId = customer.cpf_cnpj?.replace(/\D/g, '') || '';
          }
        }
      }
    }

    if (!customerEmail) {
      throw new Error('Email do cliente/tenant é obrigatório para PIX no Stripe. Verifique se o email está cadastrado.');
    }

    // Create or get Stripe customer
    let stripeCustomerId: string | null = null;

    const searchResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(customerEmail)}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      }
    );
    const searchData = await searchResponse.json();

    if (searchData.data && searchData.data.length > 0) {
      stripeCustomerId = searchData.data[0].id;
    } else {
      // Create new Stripe customer with tax_id for PIX
      const createParams: Record<string, string> = {
        email: customerEmail,
        name: customerName,
        'metadata[customer_id]': customerId || '',
        'metadata[tenant_id]': tenantId,
      };

      const createResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(createParams).toString(),
      });
      const newCustomer = await createResponse.json();
      stripeCustomerId = newCustomer.id;
    }

    // Build external reference for webhook
    let externalReference = `${tenantId}`;
    if (customerItemId) {
      externalReference += `_${customerItemId}_item`;
    } else if (subscriptionId) {
      externalReference += `_${subscriptionId}_subscription`;
    } else if (chargeId) {
      externalReference += `_${chargeId}_charge`;
    } else if (customerId) {
      externalReference += `_${customerId}_${Date.now()}`;
    }

    // Create Payment Intent with PIX
    const paymentIntentParams: Record<string, string> = {
      amount: Math.round(amount * 100).toString(),
      currency: 'brl',
      customer: stripeCustomerId!,
      'payment_method_types[0]': 'pix',
      'payment_method_options[pix][expires_after_seconds]': String(expiresInMinutes * 60),
      'metadata[tenant_id]': tenantId,
      'metadata[external_reference]': externalReference,
    };

    if (description) {
      paymentIntentParams.description = description;
    }

    if (customerId) {
      paymentIntentParams['metadata[customer_id]'] = customerId;
    }

    if (customerItemId) {
      paymentIntentParams['metadata[customer_item_id]'] = customerItemId;
    }

    if (chargeId) {
      paymentIntentParams['metadata[charge_id]'] = chargeId;
    }

    if (subscriptionId) {
      paymentIntentParams['metadata[subscription_id]'] = subscriptionId;
    }

    console.log('Creating PIX payment intent...');

    const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(paymentIntentParams).toString(),
    });

    const paymentIntent = await paymentIntentResponse.json();

    if (paymentIntent.error) {
      console.error('Stripe error:', paymentIntent.error);
      throw new Error(paymentIntent.error.message);
    }

    console.log('Payment intent created:', paymentIntent.id, 'Status:', paymentIntent.status);

    // Confirm the payment intent to generate PIX code
    const confirmParams: Record<string, string> = {
      'payment_method_data[type]': 'pix',
      'return_url': `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhook`,
    };

    const confirmResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(confirmParams).toString(),
    });

    const confirmedIntent = await confirmResponse.json();

    if (confirmedIntent.error) {
      console.error('Stripe confirm error:', confirmedIntent.error);
      throw new Error(confirmedIntent.error.message);
    }

    console.log('Confirmed payment intent:', confirmedIntent.id);
    console.log('Next action:', JSON.stringify(confirmedIntent.next_action));

    // Extract PIX data from next_action
    const pixAction = confirmedIntent.next_action?.pix_display_qr_code;
    
    if (!pixAction) {
      throw new Error('PIX não disponível. Verifique se sua conta Stripe suporta PIX.');
    }

    const expirationDate = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: confirmedIntent.id,
        qrCode: pixAction.data, // Base64 QR code image
        qrCodeUrl: pixAction.image_url_png || pixAction.image_url_svg,
        copyPaste: pixAction.hosted_instructions_url, // URL with copy/paste code
        expiresAt: expirationDate.toISOString(),
        amount,
        status: confirmedIntent.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error creating Stripe PIX:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
