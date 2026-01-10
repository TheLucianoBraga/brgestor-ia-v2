import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCardRequest {
  tenant_id: string;
  customer_id: string;
  amount: number; // in cents
  description: string;
  card: {
    holder: {
      name: string;
    };
    number: string;
    exp_month: string;
    exp_year: string;
    security_code: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ProcessCardRequest = await req.json();
    const {
      tenant_id,
      customer_id,
      amount,
      description,
      card,
    } = body;

    console.log('Processing PagSeguro card payment for tenant:', tenant_id, 'amount:', amount);

    // Get PagSeguro settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['pagseguro_token', 'pagseguro_environment']);

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

    const token = settingsMap['pagseguro_token'];
    const environment = settingsMap['pagseguro_environment'] || 'sandbox';

    if (!token) {
      console.error('PagSeguro token not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Token do PagSeguro não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = environment === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    // Get customer info
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('full_name, email, whatsapp, cpf_cnpj')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      console.error('Customer not found:', customerError);
      return new Response(
        JSON.stringify({ success: false, error: 'Cliente não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer address
    const { data: address } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    // Build the charge request
    const chargePayload = {
      reference_id: customer_id,
      description: description || 'Pagamento',
      amount: {
        value: amount,
        currency: 'BRL',
      },
      payment_method: {
        type: 'CREDIT_CARD',
        installments: 1,
        capture: true,
        card: {
          holder: {
            name: card.holder.name,
          },
          number: card.number,
          exp_month: card.exp_month,
          exp_year: card.exp_year,
          security_code: card.security_code,
          store: false,
        },
      },
      notification_urls: [
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagseguro-webhook`
      ],
      metadata: {
        tenant_id,
        customer_id,
      },
    };

    console.log('Creating PagSeguro charge with card...');

    const chargeResponse = await fetch(`${baseUrl}/charges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-version': '4.0',
      },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeResponse.json();
    console.log('PagSeguro charge response:', JSON.stringify(chargeData));

    if (!chargeResponse.ok) {
      console.error('Error creating charge:', chargeData);
      const errorMessage = chargeData.error_messages?.[0]?.description || 
                          chargeData.error_messages?.[0]?.parameter_name ||
                          'Erro ao processar pagamento';
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was confirmed
    const isPaid = chargeData.status === 'PAID' || chargeData.status === 'AUTHORIZED';

    return new Response(
      JSON.stringify({
        success: true,
        chargeId: chargeData.id,
        status: chargeData.status,
        isPaid,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in pagseguro-process-card:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
