import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePreferenceRequest {
  tenantId: string;
  amount: number;
  description: string;
  customerId?: string;
  customerItemId?: string;
  externalReference?: string;
  successUrl?: string;
  failureUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreatePreferenceRequest = await req.json();
    const { tenantId, amount, description, customerId, customerItemId, externalReference, successUrl, failureUrl } = body;

    console.log('Creating card preference for tenant:', tenantId, 'amount:', amount);

    // Get MercadoPago settings from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['mp_access_token', 'mp_environment']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar configurações' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const accessToken = settingsMap['mp_access_token'];
    if (!accessToken) {
      console.error('MercadoPago access token not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Token MercadoPago não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create preference via MercadoPago API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: description,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: amount,
          },
        ],
        external_reference: externalReference || `${tenantId}_${customerItemId || customerId || Date.now()}`,
        back_urls: {
          success: successUrl || 'https://example.com/success',
          failure: failureUrl || 'https://example.com/failure',
          pending: successUrl || 'https://example.com/pending',
        },
        auto_return: 'approved',
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      }),
    });

    const mpData = await mpResponse.json();
    console.log('MercadoPago preference response:', mpData);

    if (!mpResponse.ok) {
      console.error('MercadoPago error:', mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || 'Erro ao criar preferência' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        preferenceId: mpData.id,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mp-create-preference:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
