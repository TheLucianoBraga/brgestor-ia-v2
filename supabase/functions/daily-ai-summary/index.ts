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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log('Generating daily summaries for:', yesterdayStr);

    // Buscar todos os tenants com resumo diário habilitado
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('tenant_id')
      .eq('daily_summary_enabled', true);

    if (!preferences || preferences.length === 0) {
      // Se não há preferências, gerar para todos os tenants ativos
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .eq('status', 'active')
        .in('type', ['master', 'adm', 'revenda']);

      if (tenants) {
        for (const tenant of tenants) {
          await generateSummaryForTenant(supabase, tenant.id, yesterdayStr);
        }
      }
    } else {
      for (const pref of preferences) {
        await generateSummaryForTenant(supabase, pref.tenant_id, yesterdayStr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, date: yesterdayStr }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating daily summaries:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateSummaryForTenant(supabase: any, tenantId: string, date: string) {
  console.log('Generating summary for tenant:', tenantId);

  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  // Buscar métricas do dia
  const [paymentsResult, customersResult, tenantsResult, chargesResult] = await Promise.all([
    // Pagamentos recebidos
    supabase
      .from('payments')
      .select('amount')
      .eq('seller_tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', startOfDay)
      .lte('paid_at', endOfDay),

    // Novos clientes
    supabase
      .from('customers')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay),

    // Novos tenants (revendas/clientes)
    supabase
      .from('tenants')
      .select('id, name, type')
      .eq('parent_tenant_id', tenantId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay),

    // Cobranças criadas
    supabase
      .from('customer_charges')
      .select('amount, status')
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay),
  ]);

  const payments = paymentsResult.data || [];
  const customers = customersResult.data || [];
  const tenants = tenantsResult.data || [];
  const charges = chargesResult.data || [];

  const metrics = {
    payments_received: payments.length,
    total_revenue: payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0),
    new_customers: customers.length,
    new_resellers: tenants.filter((t: any) => t.type === 'revenda').length,
    charges_created: charges.length,
    charges_paid: charges.filter((c: any) => c.status === 'paid').length,
  };

  // Gerar resumo com IA
  const summaryPrompt = `
Gere um resumo executivo conciso e positivo para WhatsApp sobre as atividades do dia ${date}:

Métricas:
- Pagamentos recebidos: ${metrics.payments_received} (R$ ${metrics.total_revenue.toFixed(2)})
- Novos clientes: ${metrics.new_customers}
- Novas revendas: ${metrics.new_resellers}
- Cobranças criadas: ${metrics.charges_created}
- Cobranças pagas: ${metrics.charges_paid}

${customers.length > 0 ? `Novos clientes: ${customers.map((c: any) => c.full_name).join(', ')}` : ''}
${tenants.length > 0 ? `Novos tenants: ${tenants.map((t: any) => `${t.name} (${t.type})`).join(', ')}` : ''}

Regras:
- Use emojis relevantes
- Máximo 500 caracteres
- Tom profissional mas amigável
- Destaque os pontos positivos
- Se não houver atividade, sugira ações para melhorar
`;

  let summaryContent = '';
  let aiInsights: string[] = [];

  try {
    // Chamar Lovable AI
    const aiResponse = await fetch('https://api.lovable.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um assistente executivo que gera resumos diários concisos.' },
          { role: 'user', content: summaryPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      summaryContent = aiData.choices?.[0]?.message?.content || '';
    }
  } catch (aiError) {
    console.error('AI summary error:', aiError);
  }

  // Fallback se IA falhar
  if (!summaryContent) {
    summaryContent = `📊 *Resumo do Dia - ${date}*\n\n`;
    summaryContent += `💰 Receita: R$ ${metrics.total_revenue.toFixed(2)} (${metrics.payments_received} pagamentos)\n`;
    summaryContent += `👥 Novos clientes: ${metrics.new_customers}\n`;
    if (metrics.new_resellers > 0) {
      summaryContent += `🚀 Novas revendas: ${metrics.new_resellers}\n`;
    }
    summaryContent += `📝 Cobranças: ${metrics.charges_paid}/${metrics.charges_created} pagas\n\n`;
    
    if (metrics.total_revenue === 0 && metrics.new_customers === 0) {
      summaryContent += `💡 Dica: Que tal enviar uma mensagem para seus clientes inativos?`;
    } else {
      summaryContent += `✨ Continue o ótimo trabalho!`;
    }
  }

  // Gerar insights
  if (metrics.total_revenue > 0) {
    aiInsights.push(`Receita de R$ ${metrics.total_revenue.toFixed(2)} no dia`);
  }
  if (metrics.new_customers > 0) {
    aiInsights.push(`${metrics.new_customers} novo(s) cliente(s) cadastrado(s)`);
  }
  if (metrics.new_resellers > 0) {
    aiInsights.push(`${metrics.new_resellers} nova(s) revenda(s) cadastrada(s)`);
  }

  // Verificar se já existe resumo do dia
  const { data: existingSummary } = await supabase
    .from('daily_summaries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('summary_date', date)
    .maybeSingle();

  if (existingSummary) {
    // Atualizar
    await supabase
      .from('daily_summaries')
      .update({
        summary_content: summaryContent,
        metrics,
        ai_insights: aiInsights,
      })
      .eq('id', existingSummary.id);
  } else {
    // Inserir
    await supabase.from('daily_summaries').insert({
      tenant_id: tenantId,
      summary_date: date,
      summary_content: summaryContent,
      metrics,
      ai_insights: aiInsights,
    });
  }

  // Enviar via WhatsApp se configurado
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('key, value')
    .eq('tenant_id', tenantId)
    .in('key', ['notification_whatsapp', 'whatsapp_session_id', 'waha_api_url']);

  const settingsMap = Object.fromEntries((settings || []).map((s: any) => [s.key, s.value]));
  const whatsappNumber = settingsMap['notification_whatsapp'];
  const wahaSessionId = settingsMap['whatsapp_session_id'];
  const wahaApiUrl = settingsMap['waha_api_url'] || Deno.env.get('WAHA_API_URL');

  if (whatsappNumber && wahaSessionId && wahaApiUrl) {
    try {
      await fetch(`${wahaApiUrl}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session: wahaSessionId,
          chatId: `${whatsappNumber.replace(/\D/g, '')}@c.us`,
          text: summaryContent,
        }),
      });

      // Atualizar registro com info de envio
      await supabase
        .from('daily_summaries')
        .update({
          sent_at: new Date().toISOString(),
          sent_channels: ['whatsapp'],
        })
        .eq('tenant_id', tenantId)
        .eq('summary_date', date);

      console.log('WhatsApp summary sent for tenant:', tenantId);
    } catch (waError) {
      console.error('Error sending WhatsApp summary:', waError);
    }
  }

  console.log('Summary generated for tenant:', tenantId, metrics);
}
