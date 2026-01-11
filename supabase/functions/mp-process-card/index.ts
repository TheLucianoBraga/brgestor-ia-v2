import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCardRequest {
  tenantId: string;
  chargeId: string;
  token: string;
  amount: number;
  installments: number;
  email: string;
  cpf: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenantId, chargeId, token, amount, installments, email, cpf } = await req.json() as ProcessCardRequest;

    console.log('Processing card payment:', { tenantId, chargeId, amount, installments });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tenant's MercadoPago access token
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['mp_access_token']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Erro ao buscar configurações');
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach(s => {
      if (s.value) settingsMap[s.key] = s.value;
    });

    const accessToken = settingsMap['mp_access_token'];
    if (!accessToken) {
      throw new Error('MercadoPago não configurado');
    }

    // Create payment with MercadoPago
    const paymentData = {
      transaction_amount: amount,
      token: token,
      installments: installments,
      payer: {
        email: email,
        identification: {
          type: 'CPF',
          number: cpf,
        },
      },
      external_reference: chargeId,
    };

    console.log('Sending payment to MercadoPago:', paymentData);

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${chargeId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const mpResult = await mpResponse.json();
    console.log('MercadoPago response:', mpResult);

    if (!mpResponse.ok) {
      const errorMessage = mpResult.message || mpResult.cause?.[0]?.description || 'Erro ao processar pagamento';
      throw new Error(errorMessage);
    }

    // Check payment status
    const status = mpResult.status;
    const approved = status === 'approved';

    if (approved) {
      // Update charge status
      const { error: updateError } = await supabase
        .from('charges')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString() 
        })
        .eq('id', chargeId);

      if (updateError) {
        console.error('Error updating charge:', updateError);
      }
    }

    return new Response(JSON.stringify({
      success: approved,
      status: status,
      paymentId: mpResult.id,
      statusDetail: mpResult.status_detail,
      error: !approved ? getStatusMessage(status, mpResult.status_detail) : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error processing card payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getStatusMessage(status: string, statusDetail: string): string {
  const messages: Record<string, string> = {
    'rejected': 'Pagamento recusado',
    'pending': 'Pagamento pendente',
    'in_process': 'Pagamento em análise',
    'cc_rejected_bad_filled_card_number': 'Número do cartão incorreto',
    'cc_rejected_bad_filled_date': 'Data de validade incorreta',
    'cc_rejected_bad_filled_security_code': 'Código de segurança incorreto',
    'cc_rejected_bad_filled_other': 'Dados do cartão incorretos',
    'cc_rejected_call_for_authorize': 'Ligue para sua operadora',
    'cc_rejected_card_disabled': 'Cartão desabilitado',
    'cc_rejected_duplicated_payment': 'Pagamento duplicado',
    'cc_rejected_high_risk': 'Pagamento recusado por risco',
    'cc_rejected_insufficient_amount': 'Saldo insuficiente',
    'cc_rejected_invalid_installments': 'Parcelas inválidas',
    'cc_rejected_max_attempts': 'Limite de tentativas excedido',
  };

  return messages[statusDetail] || messages[status] || 'Erro ao processar pagamento';
}
