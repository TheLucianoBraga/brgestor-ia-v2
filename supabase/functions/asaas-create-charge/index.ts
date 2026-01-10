import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChargeRequest {
  tenantId: string;
  customerId?: string;
  customerItemId?: string;
  customerName: string;
  customerCpfCnpj: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number;
  description: string;
  dueDate: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
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

    const body: CreateChargeRequest = await req.json();
    const {
      tenantId,
      customerId,
      customerItemId,
      customerName,
      customerCpfCnpj,
      customerEmail,
      customerPhone,
      amount,
      description,
      dueDate,
      billingType,
      externalReference,
    } = body;

    console.log('Creating Asaas charge for tenant:', tenantId, 'amount:', amount);

    // Get Asaas settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['asaas_api_key', 'asaas_environment']);

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

    const apiKey = settingsMap['asaas_api_key'];
    const environment = settingsMap['asaas_environment'] || 'sandbox';

    if (!apiKey) {
      console.error('Asaas API key not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API Key do Asaas não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = environment === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    // First, find or create customer in Asaas
    const cleanCpfCnpj = customerCpfCnpj.replace(/\D/g, '');
    
    // Search for existing customer
    const searchResponse = await fetch(`${baseUrl}/customers?cpfCnpj=${cleanCpfCnpj}`, {
      headers: { 'access_token': apiKey },
    });
    
    const searchData = await searchResponse.json();
    let asaasCustomerId: string;

    if (searchData.data?.length > 0) {
      asaasCustomerId = searchData.data[0].id;
      console.log('Found existing Asaas customer:', asaasCustomerId);
    } else {
      // Create new customer
      const createCustomerResponse = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: {
          'access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerName,
          cpfCnpj: cleanCpfCnpj,
          email: customerEmail,
          phone: customerPhone?.replace(/\D/g, ''),
          notificationDisabled: false,
        }),
      });

      const createCustomerData = await createCustomerResponse.json();
      
      if (!createCustomerResponse.ok) {
        console.error('Error creating Asaas customer:', createCustomerData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: createCustomerData.errors?.[0]?.description || 'Erro ao criar cliente no Asaas'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      asaasCustomerId = createCustomerData.id;
      console.log('Created new Asaas customer:', asaasCustomerId);
    }

    // Create the charge
    const extRef = externalReference || `${tenantId}_${customerItemId || customerId || Date.now()}_item`;

    const chargePayload: Record<string, any> = {
      customer: asaasCustomerId,
      billingType,
      value: amount,
      dueDate,
      description,
      externalReference: extRef,
    };

    // Add installment info for credit card if needed
    if (billingType === 'CREDIT_CARD') {
      chargePayload.installmentCount = 1;
      chargePayload.installmentValue = amount;
    }

    const chargeResponse = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeResponse.json();
    console.log('Asaas charge response:', chargeData);

    if (!chargeResponse.ok) {
      console.error('Error creating charge:', chargeData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: chargeData.errors?.[0]?.description || 'Erro ao criar cobrança'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment details (PIX QR code, boleto URL, etc.)
    let paymentDetails: Record<string, any> = {
      paymentId: chargeData.id,
      invoiceUrl: chargeData.invoiceUrl,
      bankSlipUrl: chargeData.bankSlipUrl,
      status: chargeData.status,
    };

    // If PIX, get the QR code
    if (billingType === 'PIX') {
      const pixResponse = await fetch(`${baseUrl}/payments/${chargeData.id}/pixQrCode`, {
        headers: { 'access_token': apiKey },
      });
      
      if (pixResponse.ok) {
        const pixData = await pixResponse.json();
        paymentDetails.pixQrCode = pixData.encodedImage;
        paymentDetails.pixCopyPaste = pixData.payload;
        paymentDetails.expirationDate = pixData.expirationDate;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...paymentDetails,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in asaas-create-charge:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
