import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePixRequest {
  tenantId: string;
  amount: number;
  description: string;
  customerId?: string;
  customerItemId?: string;
  externalReference?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreatePixRequest = await req.json();
    const { tenantId, amount, description, customerId, customerItemId, externalReference } = body;

    console.log('Creating PIX payment for tenant:', tenantId, 'amount:', amount);

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

    // Create PIX payment via MercadoPago API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: 'cliente@exemplo.com', // Will be updated with real customer data
        },
        external_reference: externalReference 
          ? (externalReference.includes('_') ? externalReference : `${tenantId}_${externalReference}`)
          : `${tenantId}_${customerItemId || customerId || Date.now()}`,
      }),
    });

    const mpData = await mpResponse.json();
    console.log('MercadoPago response:', mpData);

    if (!mpResponse.ok) {
      console.error('MercadoPago error:', mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || 'Erro ao criar pagamento PIX' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixInfo = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: String(mpData.id),
        qrCode: pixInfo?.qr_code,
        qrCodeBase64: pixInfo?.qr_code_base64,
        copyPaste: pixInfo?.qr_code,
        expiresAt: mpData.date_of_expiration,
        status: mpData.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mp-create-pix:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
