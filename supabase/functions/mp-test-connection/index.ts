import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get MercadoPago settings from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['mp_access_token']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const accessToken = settingsMap['mp_access_token'];

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access Token não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test connection with MercadoPago API
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(
        JSON.stringify({ 
          success: true, 
          account: data.email || data.nickname || 'Conta verificada'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('MercadoPago API error:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Token inválido ou sem permissão',
          details: errorData 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error testing MercadoPago connection:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao testar conexão' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
