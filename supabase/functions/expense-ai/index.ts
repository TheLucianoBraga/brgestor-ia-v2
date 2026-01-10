import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpenseAction {
  action: 'create' | 'update' | 'delete' | 'mark_paid' | 'postpone' | 'cancel' | 'list' | 'summary';
  data?: any;
  confirmRequired?: boolean;
}

interface AIResponse {
  message: string;
  action?: ExpenseAction;
  requiresConfirmation?: boolean;
}

// Parse AI response to extract action
function parseAIResponse(content: string): AIResponse {
  const response: AIResponse = { message: content };
  
  // Check for action markers in the response
  const actionMatch = content.match(/\[ACTION:(\w+)(?::(.+?))?\]/);
  if (actionMatch) {
    const actionType = actionMatch[1].toLowerCase() as ExpenseAction['action'];
    const actionData = actionMatch[2] ? JSON.parse(actionMatch[2]) : null;
    
    // Critical actions require confirmation
    const criticalActions = ['delete', 'cancel', 'mark_paid'];
    
    response.action = {
      action: actionType,
      data: actionData,
      confirmRequired: criticalActions.includes(actionType)
    };
    response.requiresConfirmation = criticalActions.includes(actionType);
    
    // Clean the action marker from message
    response.message = content.replace(/\[ACTION:\w+(?::.+?)?\]/g, '').trim();
  }
  
  return response;
}

// Learn from user patterns
async function learnPattern(supabase: any, tenantId: string, patternType: string, patternKey: string, patternValue: any) {
  const { data: existing } = await supabase
    .from('expense_ai_learning')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('pattern_type', patternType)
    .eq('pattern_key', patternKey)
    .single();

  if (existing) {
    await supabase
      .from('expense_ai_learning')
      .update({
        occurrences: existing.occurrences + 1,
        confidence: Math.min((existing.confidence || 0) + 0.1, 1.0),
        last_used_at: new Date().toISOString(),
        pattern_value: patternValue
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('expense_ai_learning')
      .insert({
        tenant_id: tenantId,
        pattern_type: patternType,
        pattern_key: patternKey,
        pattern_value: patternValue,
        occurrences: 1,
        confidence: 0.5
      });
  }
}

// Get learned patterns for context
async function getLearnedPatterns(supabase: any, tenantId: string) {
  const { data } = await supabase
    .from('expense_ai_learning')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('confidence', 0.6)
    .order('occurrences', { ascending: false })
    .limit(20);

  return data || [];
}

// Get expense context
async function getExpenseContext(supabase: any, tenantId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get pending expenses
  const { data: pending } = await supabase
    .from('expenses')
    .select('*, category:expense_categories(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .order('due_date');

  // Get overdue expenses
  const { data: overdue } = await supabase
    .from('expenses')
    .select('*, category:expense_categories(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'overdue');

  // Get categories
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Get cost centers
  const { data: costCenters } = await supabase
    .from('expense_cost_centers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Get monthly summary
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount, status')
    .eq('tenant_id', tenantId)
    .gte('due_date', startOfMonth.toISOString().split('T')[0]);

  const monthTotal = monthExpenses?.reduce((sum: number, e: any) => sum + e.amount, 0) || 0;
  const monthPaid = monthExpenses?.filter((e: any) => e.status === 'paid').reduce((sum: number, e: any) => sum + e.amount, 0) || 0;

  return {
    pending: pending || [],
    overdue: overdue || [],
    categories: categories || [],
    costCenters: costCenters || [],
    monthSummary: {
      total: monthTotal,
      paid: monthPaid,
      pending: monthTotal - monthPaid
    },
    today
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, tenantId, action, actionData, previousMessages = [] } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: "tenantId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Gemini API key from tenant settings
    const { data: settingsData } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['gemini_api_key', 'ai_model', 'ai_max_tokens']);

    const settingsMap: Record<string, string> = {};
    (settingsData || []).forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const geminiApiKey = settingsMap['gemini_api_key'];
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Chave da API Gemini não configurada. Vá em Configurações > Integrações." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get context for AI
    const context = await getExpenseContext(supabase, tenantId);
    const patterns = await getLearnedPatterns(supabase, tenantId);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context, patterns);

    // Build messages for Gemini format
    const allMessages = [
      ...previousMessages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    // Convert to Gemini format
    const contents = allMessages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    // Normaliza model ID
    const rawModel = settingsMap['ai_model'];
    let geminiModel = 'gemini-2.5-flash';
    if (rawModel) {
      if (rawModel.includes('/')) {
        const parts = rawModel.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart.startsWith('gemini-')) geminiModel = lastPart;
      } else if (rawModel.startsWith('gemini-')) {
        geminiModel = rawModel;
      }
    }
    
    // Call Gemini API directly
    console.log("📞 Calling Gemini API for expense-ai with model:", geminiModel);
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            maxOutputTokens: parseInt(settingsMap['ai_max_tokens'] || '1000', 10),
            temperature: 0.7,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("❌ Gemini API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições do Gemini excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 401 || aiResponse.status === 400) {
        return new Response(JSON.stringify({ error: "Chave da API Gemini inválida. Verifique nas configurações." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Gemini API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação.";
    
    console.log("✅ Gemini response received for expense-ai");
    
    const parsedResponse = parseAIResponse(content);

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in expense-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildSystemPrompt(context: any, patterns: any[]) {
  const formatCurrency = (v: number | null | undefined) => {
    const value = typeof v === 'number' && !isNaN(v) ? v : 0;
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };
  
  const pendingList = context.pending.slice(0, 5).map((e: any) => 
    `- ${e.description}: ${formatCurrency(e.amount)} (venc: ${e.due_date})`
  ).join('\n');

  const overdueList = context.overdue.map((e: any) => 
    `- ${e.description}: ${formatCurrency(e.amount)} (venceu: ${e.due_date})`
  ).join('\n');

  const categoriesList = context.categories.map((c: any) => c.name).join(', ');
  const costCentersList = context.costCenters.map((c: any) => c.name).join(', ');

  const patternsContext = patterns.length > 0 
    ? `\nPadrões aprendidos:\n${patterns.map((p: any) => `- ${p.pattern_type}: ${p.pattern_key}`).join('\n')}`
    : '';

  // Garantir que os valores numéricos sejam válidos
  const totalMes = formatCurrency(context.monthSummary?.total);
  const pagoMes = formatCurrency(context.monthSummary?.paid);
  const pendenteMes = formatCurrency(context.monthSummary?.pending);

  return `Você é um assistente financeiro inteligente especializado em gestão de despesas.

CONTEXTO ATUAL (${context.today}):

Resumo do Mês:
- Total de despesas do mês: ${totalMes}
- Despesas pagas este mês: ${pagoMes}
- Despesas pendentes este mês: ${pendenteMes}

Despesas Pendentes (próximas a vencer):
${pendingList || 'Nenhuma despesa pendente'}

Despesas Vencidas (ATENÇÃO - precisam de ação):
${overdueList || 'Nenhuma despesa vencida'}

Categorias disponíveis: ${categoriesList || 'Nenhuma categoria cadastrada'}
Centros de custo: ${costCentersList || 'Nenhum centro de custo cadastrado'}
${patternsContext}

INSTRUÇÕES IMPORTANTES PARA RESPOSTAS:
1. SEMPRE inclua os valores numéricos nas suas respostas - nunca deixe "R$" sem valor
2. Quando informar valores, use o formato completo: "R$ 150,00" (nunca apenas "R$")
3. Se um valor for zero, diga explicitamente "R$ 0,00"
4. Seja claro e objetivo em português

AÇÕES DISPONÍVEIS:
Para executar ações, inclua no final da resposta o marcador de ação no formato:
[ACTION:tipo:{"dados": "json"}]

Tipos de ação:
- create: Criar despesa [ACTION:create:{"description":"...", "amount":100, "due_date":"2024-01-15", "category_id":"...", "supplier":"..."}]
- update: Atualizar despesa [ACTION:update:{"id":"...", "description":"...", "amount":100}]
- delete: Excluir despesa [ACTION:delete:{"id":"..."}]
- mark_paid: Marcar como paga [ACTION:mark_paid:{"id":"..."}]
- postpone: Adiar vencimento [ACTION:postpone:{"id":"...", "days":3}]
- cancel: Cancelar despesa [ACTION:cancel:{"id":"..."}]
- list: Listar despesas [ACTION:list:{"status":"pending"}]
- summary: Resumo financeiro [ACTION:summary:{}]

REGRAS IMPORTANTES:
1. Para ações críticas (excluir, cancelar, marcar paga), SEMPRE peça confirmação antes
2. Use linguagem clara e objetiva em português
3. Sugira categorias baseado nos padrões aprendidos
4. Alerte sobre despesas vencidas quando relevante
5. Forneça resumos úteis quando solicitado
6. Se não tiver certeza de uma ação, pergunte ao usuário
7. NUNCA deixe valores em branco - sempre mostre o valor completo

Responda de forma útil e proativa, ajudando a manter as finanças organizadas.`;
}

async function executeAction(supabase: any, tenantId: string, actionData: ExpenseAction) {
  const { action, data } = actionData;

  try {
    switch (action) {
      case 'create': {
        const { error } = await supabase
          .from('expenses')
          .insert({ ...data, tenant_id: tenantId });
        if (error) throw error;
        return { success: true, message: 'Despesa criada com sucesso!' };
      }

      case 'update': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        return { success: true, message: 'Despesa atualizada!' };
      }

      case 'delete': {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', data.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        return { success: true, message: 'Despesa excluída!' };
      }

      case 'mark_paid': {
        const { error } = await supabase
          .from('expenses')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', data.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        return { success: true, message: 'Despesa marcada como paga!' };
      }

      case 'postpone': {
        const { data: expense } = await supabase
          .from('expenses')
          .select('due_date')
          .eq('id', data.id)
          .single();

        if (!expense) throw new Error('Despesa não encontrada');

        const newDate = new Date(expense.due_date);
        newDate.setDate(newDate.getDate() + data.days);

        const { error } = await supabase
          .from('expenses')
          .update({ due_date: newDate.toISOString().split('T')[0] })
          .eq('id', data.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        return { success: true, message: `Vencimento adiado em ${data.days} dias!` };
      }

      case 'cancel': {
        const { error } = await supabase
          .from('expenses')
          .update({ status: 'cancelled' })
          .eq('id', data.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
        return { success: true, message: 'Despesa cancelada!' };
      }

      case 'list': {
        let query = supabase
          .from('expenses')
          .select('*, category:expense_categories(name)')
          .eq('tenant_id', tenantId);

        if (data?.status) {
          query = query.eq('status', data.status);
        }

        const { data: expenses, error } = await query.order('due_date').limit(10);
        if (error) throw error;
        return { success: true, data: expenses };
      }

      case 'summary': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, status')
          .eq('tenant_id', tenantId)
          .gte('due_date', startOfMonth.toISOString().split('T')[0]);

        const total = expenses?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
        const paid = expenses?.filter((e: any) => e.status === 'paid').reduce((s: number, e: any) => s + e.amount, 0) || 0;
        
        return { 
          success: true, 
          data: { total, paid, pending: total - paid }
        };
      }

      default:
        return { success: false, message: 'Ação não reconhecida' };
    }
  } catch (error) {
    console.error('Execute action error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao executar ação' };
  }
}
