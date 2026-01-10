import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      tenantId, 
      customerId, 
      amount, 
      currency = 'brl', 
      description,
      customerItemId,
      chargeId 
    } = await req.json();

    console.log('Creating payment intent:', { tenantId, customerId, amount, currency, description });

    if (!tenantId || !amount) {
      throw new Error('tenantId and amount are required');
    }

    // Validate currency
    const supportedCurrencies = ['brl', 'usd', 'eur', 'gbp', 'cad', 'aud'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      throw new Error(`Unsupported currency: ${currency}. Supported: ${supportedCurrencies.join(', ')}`);
    }

    // Get Stripe settings for tenant (using correct column names: key, value)
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['stripe_secret_key', 'stripe_environment']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch tenant settings');
    }

    const stripeSecretKey = settings?.find(s => s.key === 'stripe_secret_key')?.value;
    const stripeEnv = settings?.find(s => s.key === 'stripe_environment')?.value || 'test';

    if (!stripeSecretKey) {
      throw new Error('Stripe não está configurado para este tenant');
    }

    // Get customer info if provided
    let customerEmail = '';
    let customerName = '';
    if (customerId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('email, full_name, whatsapp')
        .eq('id', customerId)
        .maybeSingle();

      if (customer) {
        customerEmail = customer.email || '';
        customerName = customer.full_name || '';
      }
    }

    // Create or get Stripe customer
    let stripeCustomerId = null;
    if (customerEmail) {
      // Search for existing customer
      const searchResponse = await fetch(
        `https://api.stripe.com/v1/customers/search?query=email:'${customerEmail}'`,
        {
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
          },
        }
      );
      const searchData = await searchResponse.json();
      
      if (searchData.data && searchData.data.length > 0) {
        stripeCustomerId = searchData.data[0].id;
        console.log('Found existing Stripe customer:', stripeCustomerId);
      } else {
        // Create new customer
        const createResponse = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            email: customerEmail,
            name: customerName,
            'metadata[tenant_id]': tenantId,
            'metadata[customer_id]': customerId || '',
          }),
        });
        const createData = await createResponse.json();
        stripeCustomerId = createData.id;
        console.log('Created new Stripe customer:', stripeCustomerId);
      }
    }

    // Create Payment Intent
    const paymentIntentParams: Record<string, string> = {
      amount: Math.round(amount * 100).toString(), // Convert to cents
      currency: currency.toLowerCase(),
      'automatic_payment_methods[enabled]': 'true',
      'metadata[tenant_id]': tenantId,
    };

    if (description) {
      paymentIntentParams.description = description;
    }

    if (stripeCustomerId) {
      paymentIntentParams.customer = stripeCustomerId;
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

    console.log('Creating payment intent with params:', paymentIntentParams);

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(paymentIntentParams),
    });

    const paymentIntent = await response.json();

    if (paymentIntent.error) {
      console.error('Stripe error:', paymentIntent.error);
      throw new Error(paymentIntent.error.message);
    }

    console.log('Payment intent created:', paymentIntent.id);

    // Get publishable key for frontend
    const { data: publishableKeySetting } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'stripe_publishable_key')
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: publishableKeySetting?.value,
        amount,
        currency,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error creating payment intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
