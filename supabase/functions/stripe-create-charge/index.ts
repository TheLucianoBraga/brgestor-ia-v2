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
      tenant_id,
      customer_id,
      customer_item_id,
      amount, // in cents
      currency = 'brl', // brl, usd, eur
      description,
      success_url,
      cancel_url,
      mode = 'payment', // payment or subscription
      price_id, // for subscriptions
    } = await req.json();

    console.log('Creating Stripe charge:', { tenant_id, customer_id, amount, currency, mode });

    // Get tenant's Stripe settings
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['stripe_secret_key', 'stripe_environment']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    const stripeSecretKey = settingsMap['stripe_secret_key'];
    if (!stripeSecretKey) {
      throw new Error('Stripe não configurado para este tenant');
    }

    // Get customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('full_name, email, whatsapp, cpf_cnpj')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    // Create or get Stripe customer
    let stripeCustomerId: string | null = null;
    
    // Check if customer already has a Stripe ID
    const { data: customerMeta } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    // Search for existing customer by email
    const searchResponse = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(customer.email)}`,
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
      // Create new Stripe customer
      const createCustomerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: customer.email,
          name: customer.full_name,
          phone: customer.whatsapp,
          'metadata[customer_id]': customer_id,
          'metadata[tenant_id]': tenant_id,
        }).toString(),
      });
      const newCustomer = await createCustomerResponse.json();
      stripeCustomerId = newCustomer.id;
    }

    // Validate currency
    const validCurrencies = ['brl', 'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
    const normalizedCurrency = currency.toLowerCase();
    if (!validCurrencies.includes(normalizedCurrency)) {
      throw new Error(`Moeda inválida: ${currency}. Suportadas: BRL, USD, EUR, GBP, CAD, AUD, JPY`);
    }

    // Create Checkout Session
    const sessionParams: Record<string, string> = {
      'customer': stripeCustomerId!,
      'mode': mode,
      'success_url': success_url || `${req.headers.get('origin')}/cliente/pagamentos?success=true`,
      'cancel_url': cancel_url || `${req.headers.get('origin')}/cliente/pagamentos?canceled=true`,
      'metadata[tenant_id]': tenant_id,
      'metadata[customer_id]': customer_id,
      'payment_method_types[0]': 'card',
    };

    if (customer_item_id) {
      sessionParams['metadata[customer_item_id]'] = customer_item_id;
    }

    // Add PIX for BRL
    if (normalizedCurrency === 'brl') {
      sessionParams['payment_method_types[1]'] = 'boleto';
    }

    if (mode === 'payment') {
      // One-time payment
      sessionParams['line_items[0][price_data][currency]'] = normalizedCurrency;
      sessionParams['line_items[0][price_data][product_data][name]'] = description || 'Pagamento';
      sessionParams['line_items[0][price_data][unit_amount]'] = String(amount);
      sessionParams['line_items[0][quantity]'] = '1';
    } else if (mode === 'subscription' && price_id) {
      // Subscription with existing price
      sessionParams['line_items[0][price]'] = price_id;
      sessionParams['line_items[0][quantity]'] = '1';
    }

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(sessionParams).toString(),
    });

    const session = await sessionResponse.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    console.log('Stripe session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        checkout_url: session.url,
        stripe_customer_id: stripeCustomerId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error creating Stripe charge:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
