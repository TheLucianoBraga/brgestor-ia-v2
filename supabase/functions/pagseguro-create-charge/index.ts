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
      description,
      payment_method = 'pix', // pix, boleto, credit_card
      redirect_url,
      notification_url,
    } = await req.json();

    console.log('Creating PagSeguro charge:', { tenant_id, customer_id, amount, payment_method });

    // Get tenant's PagSeguro settings
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['pagseguro_token', 'pagseguro_environment']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    const token = settingsMap['pagseguro_token'];
    if (!token) {
      throw new Error('PagSeguro não configurado para este tenant');
    }

    const environment = settingsMap['pagseguro_environment'] || 'sandbox';
    const baseUrl = environment === 'production'
      ? 'https://api.pagseguro.com'
      : 'https://sandbox.api.pagseguro.com';

    // Get customer info
    const { data: customer } = await supabase
      .from('customers')
      .select('full_name, email, whatsapp, cpf_cnpj')
      .eq('id', customer_id)
      .single();

    if (!customer) {
      throw new Error('Cliente não encontrado');
    }

    // Get customer address
    const { data: address } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer_id)
      .single();

    // Prepare customer data
    const customerData = {
      name: customer.full_name,
      email: customer.email,
      tax_id: customer.cpf_cnpj?.replace(/\D/g, ''),
      phones: [
        {
          country: '55',
          area: customer.whatsapp?.replace(/\D/g, '').slice(0, 2),
          number: customer.whatsapp?.replace(/\D/g, '').slice(2),
          type: 'MOBILE'
        }
      ]
    };

    // Build request based on payment method
    let requestBody: any = {
      reference_id: customer_item_id || customer_id,
      customer: customerData,
      items: [
        {
          reference_id: customer_item_id || 'item',
          name: description || 'Pagamento',
          quantity: 1,
          unit_amount: amount,
        }
      ],
      notification_urls: [
        notification_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagseguro-webhook`
      ],
      metadata: {
        tenant_id,
        customer_id,
        customer_item_id: customer_item_id || '',
      }
    };

    if (payment_method === 'pix') {
      requestBody.qr_codes = [
        {
          amount: {
            value: amount
          },
          expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }
      ];
    } else if (payment_method === 'boleto') {
      requestBody.charges = [
        {
          reference_id: customer_item_id || 'charge',
          description: description || 'Pagamento',
          amount: {
            value: amount,
            currency: 'BRL'
          },
          payment_method: {
            type: 'BOLETO',
            boleto: {
              due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
              instruction_lines: {
                line_1: 'Pagamento referente a serviços contratados',
                line_2: 'Não receber após vencimento'
              },
              holder: {
                name: customer.full_name,
                tax_id: customer.cpf_cnpj?.replace(/\D/g, ''),
                email: customer.email,
                address: address ? {
                  street: address.street,
                  number: address.number,
                  complement: address.complement,
                  locality: address.district,
                  city: address.city,
                  region: address.state,
                  region_code: address.state,
                  country: 'BRA',
                  postal_code: address.cep?.replace(/\D/g, '')
                } : undefined
              }
            }
          }
        }
      ];
    } else if (payment_method === 'credit_card') {
      // For credit card, create a checkout
      requestBody = {
        reference_id: customer_item_id || customer_id,
        customer: customerData,
        items: [
          {
            reference_id: customer_item_id || 'item',
            name: description || 'Pagamento',
            quantity: 1,
            unit_amount: amount,
          }
        ],
        payment_methods: [
          { type: 'CREDIT_CARD' },
          { type: 'DEBIT_CARD' }
        ],
        payment_methods_configs: [
          {
            type: 'CREDIT_CARD',
            config_options: [
              { option: 'INSTALLMENTS_LIMIT', value: '12' }
            ]
          }
        ],
        redirect_urls: {
          return_url: redirect_url || `${req.headers.get('origin')}/cliente/pagamentos`,
        },
        notification_urls: [
          notification_url || `${Deno.env.get('SUPABASE_URL')}/functions/v1/pagseguro-webhook`
        ],
        metadata: {
          tenant_id,
          customer_id,
          customer_item_id: customer_item_id || '',
        }
      };
    }

    // Create order/charge
    const endpoint = payment_method === 'credit_card' ? '/checkouts' : '/orders';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-api-version': '4.0'
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('PagSeguro error:', result);
      throw new Error(result.error_messages?.[0]?.description || 'Erro ao criar cobrança');
    }

    console.log('PagSeguro charge created:', result.id);

    // Build response based on payment method
    let responseData: any = {
      success: true,
      order_id: result.id,
      reference_id: result.reference_id,
    };

    if (payment_method === 'pix' && result.qr_codes?.[0]) {
      responseData.pix = {
        qr_code: result.qr_codes[0].text,
        qr_code_image: result.qr_codes[0].links?.find((l: any) => l.media === 'image/png')?.href,
        expiration_date: result.qr_codes[0].expiration_date,
      };
    } else if (payment_method === 'boleto' && result.charges?.[0]?.payment_method?.boleto) {
      const boleto = result.charges[0].payment_method.boleto;
      responseData.boleto = {
        barcode: boleto.barcode,
        formatted_barcode: boleto.formatted_barcode,
        due_date: boleto.due_date,
        pdf_url: result.charges[0].links?.find((l: any) => l.media === 'application/pdf')?.href,
      };
    } else if (payment_method === 'credit_card') {
      responseData.checkout_url = result.links?.find((l: any) => l.rel === 'PAY')?.href;
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error creating PagSeguro charge:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
