import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckStatusRequest {
  tenantId: string;
  paymentId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CheckStatusRequest = await req.json();
    const { tenantId, paymentId } = body;

    console.log('Checking payment status:', paymentId, 'for tenant:', tenantId);

    // Get MercadoPago settings from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['mp_access_token']);

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

    // Get payment status from MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const mpData = await mpResponse.json();
    console.log('MercadoPago payment status:', mpData.status);

    if (!mpResponse.ok) {
      console.error('MercadoPago error:', mpData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: mpData.message || 'Erro ao verificar pagamento' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPaid = mpData.status === 'approved';

    // If paid, process the payment
    if (isPaid && mpData.external_reference) {
      console.log('Payment approved! Processing...', mpData.external_reference);
      
      // Parse external_reference: format is tenantId_customerItemId
      const parts = mpData.external_reference.split('_');
      if (parts.length >= 2) {
        const customerItemId = parts[1];
        
        // Update customer_item status to active
        const { error: updateError } = await supabase
          .from('customer_items')
          .update({ status: 'active' })
          .eq('id', customerItemId);

        if (updateError) {
          console.error('Error updating customer_item:', updateError);
        } else {
          console.log('Customer item activated:', customerItemId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: mpData.status,
        paid: isPaid,
        paidAt: mpData.date_approved,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mp-check-status:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
