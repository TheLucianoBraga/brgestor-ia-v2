import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AISettings {
  provider: 'openai' | 'gemini';
  model: string;
  personality: string;
  context: string;
  maxTokens: number;
  temperature: number;
  openaiKey?: string;
  geminiKey?: string;
  webSearch?: boolean;
}

interface ChatAction {
  type: 'create_expense' | 'create_customer' | 'create_charge' | 'update_customer' | 'delete_expense' | 'list_expenses' | 'list_customers' | 'transfer_human' | 'show_services';
  data: Record<string, any>;
  confirmRequired?: boolean;
}

interface AIResponse {
  response: string;
  action?: ChatAction;
  actionResult?: { success: boolean; message: string; data?: any };
  provider: string;
}

async function getAISettings(supabase: any, tenantId: string): Promise<AISettings> {
  const { data: settings, error } = await supabase
    .from('tenant_settings')
    .select('key, value')
    .eq('tenant_id', tenantId)
    .in('key', [
      'ai_enabled',
      'ai_provider',
      'ai_model',
      'ai_chatbot_personality',
      'ai_chatbot_context',
      'ai_max_tokens',
      'ai_temperature',
      'openai_api_key',
      'gemini_api_key',
      'ai_web_search'
    ]);

  if (error) {
    console.error("Error fetching AI settings:", error);
  }

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: { key: string; value: string }) => {
    settingsMap[s.key] = s.value;
  });

  const provider = settingsMap['ai_provider'] as 'openai' | 'gemini';
  
  return {
    provider: provider || 'gemini',
    model: settingsMap['ai_model'] || 'gemini-2.5-flash',
    personality: settingsMap['ai_chatbot_personality'] || '',
    context: settingsMap['ai_chatbot_context'] || '',
    maxTokens: parseInt(settingsMap['ai_max_tokens'] || '800', 10),
    temperature: parseFloat(settingsMap['ai_temperature'] || '0.7'),
    openaiKey: settingsMap['openai_api_key'],
    geminiKey: settingsMap['gemini_api_key'],
    webSearch: settingsMap['ai_web_search'] === 'true'
  };
}

async function callOpenAI(messages: any[], apiKey: string, model: string, maxTokens: number) {
  console.log("Calling OpenAI with model:", model);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error:", response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: "Limite de requisições da OpenAI excedido." };
    }
    if (response.status === 401) {
      throw { status: 401, message: "Chave da API OpenAI inválida. Verifique nas configurações." };
    }
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function normalizeGeminiModel(model: string | null | undefined): string {
  if (!model || typeof model !== 'string') return 'gemini-2.5-flash';
  
  if (model.includes('/')) {
    const parts = model.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith('gemini-')) return lastPart;
  }
  
  if (model.startsWith('gemini-')) return model;
  
  return 'gemini-2.5-flash';
}

async function callGemini(messages: any[], apiKey: string, model: string, maxTokens: number, webSearch: boolean = false) {
  const geminiModel = normalizeGeminiModel(model);
  console.log("Calling Gemini with model:", geminiModel, "webSearch:", webSearch);

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const systemMessage = messages.find(m => m.role === 'system');

  const requestBody: any = {
    contents,
    systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
    generationConfig: {
      maxOutputTokens: maxTokens,
    },
  };

  if (webSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: "Limite de requisições do Gemini excedido." };
    }
    if (response.status === 400 || response.status === 401) {
      throw { status: 401, message: "Chave da API Gemini inválida. Verifique nas configurações." };
    }
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function getServicesContext(supabase: any, tenantId: string): Promise<string> {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('id, name, description, price, is_active, parent_service_id, is_variation, variation_label')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error || !services || services.length === 0) {
      return '';
    }

    const mainServices = services.filter((s: any) => !s.is_variation);
    const variations = services.filter((s: any) => s.is_variation);

    let servicesText = '\n\nServiços disponíveis:\n';
    
    for (const service of mainServices) {
      const serviceVariations = variations.filter((v: any) => v.parent_service_id === service.id);
      
      if (serviceVariations.length > 0) {
        servicesText += `\n📦 ${service.name}`;
        if (service.description) servicesText += ` - ${service.description}`;
        servicesText += '\n   Variações disponíveis:';
        for (const variation of serviceVariations) {
          servicesText += `\n   • ${variation.variation_label || variation.name}: R$ ${(variation.price || 0).toFixed(2).replace('.', ',')}`;
        }
      } else {
        servicesText += `\n📋 ${service.name}`;
        if (service.price) servicesText += `: R$ ${service.price.toFixed(2).replace('.', ',')}`;
        if (service.description) servicesText += ` - ${service.description}`;
      }
    }

    return servicesText;
  } catch (err) {
    console.error('Error fetching services context:', err);
    return '';
  }
}

async function getPlansContext(supabase: any, tenantId: string): Promise<string> {
  try {
    const { data: plans, error } = await supabase
      .from('tenant_plans')
      .select('id, name, description, price, billing_cycle, features, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('price');

    if (error || !plans || plans.length === 0) {
      return '';
    }

    let plansText = '\n\nPlanos disponíveis:\n';
    
    for (const plan of plans) {
      plansText += `\n🎯 ${plan.name}: R$ ${(plan.price || 0).toFixed(2).replace('.', ',')}`;
      if (plan.billing_cycle) plansText += `/${plan.billing_cycle}`;
      if (plan.description) plansText += ` - ${plan.description}`;
      if (plan.features && Array.isArray(plan.features) && plan.features.length > 0) {
        plansText += `\n   Inclui: ${plan.features.join(', ')}`;
      }
    }

    return plansText;
  } catch (err) {
    console.error('Error fetching plans context:', err);
    return '';
  }
}

async function getExpenseCategoriesContext(supabase: any, tenantId: string): Promise<string> {
  try {
    const { data: categories, error } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error || !categories || categories.length === 0) {
      return '\n\nCategorias de despesa: Nenhuma cadastrada (será criada automaticamente)';
    }

    return `\n\nCategorias de despesa disponíveis:\n${categories.map((c: any) => `- ${c.name} (ID: ${c.id})`).join('\n')}`;
  } catch (err) {
    return '';
  }
}

function parseAIResponse(responseText: string): { message: string; action?: ChatAction } {
  const result: { message: string; action?: ChatAction } = {
    message: responseText
  };

  const actionMatch = responseText.match(/\[ACTION:(\w+):(\{.*?\})\]/s);
  if (actionMatch) {
    try {
      const actionType = actionMatch[1] as ChatAction['type'];
      const actionData = JSON.parse(actionMatch[2]);
      
      const criticalActions = ['delete_expense', 'delete_customer'];
      
      result.action = {
        type: actionType,
        data: actionData,
        confirmRequired: criticalActions.includes(actionType)
      };
      result.message = responseText.replace(actionMatch[0], '').trim();
    } catch (e) {
      console.error("Error parsing action:", e);
    }
  }

  return result;
}

async function executeAction(supabase: any, tenantId: string, action: ChatAction): Promise<{ success: boolean; message: string; data?: any }> {
  const { type, data } = action;

  try {
    switch (type) {
      case 'create_expense': {
        // Find or create category
        let categoryId = data.category_id;
        if (!categoryId && data.category_name) {
          const { data: existingCat } = await supabase
            .from('expense_categories')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('name', data.category_name)
            .maybeSingle();

          if (existingCat) {
            categoryId = existingCat.id;
          } else {
            const { data: newCat, error: catError } = await supabase
              .from('expense_categories')
              .insert({ tenant_id: tenantId, name: data.category_name })
              .select()
              .single();
            if (!catError && newCat) categoryId = newCat.id;
          }
        }

        const { data: expense, error } = await supabase
          .from('expenses')
          .insert({
            tenant_id: tenantId,
            description: data.description,
            amount: parseFloat(data.amount) || 0,
            category_id: categoryId || null,
            expense_date: data.date || new Date().toISOString().split('T')[0],
            payment_method: data.payment_method || 'pix',
            status: 'paid',
            notes: data.notes || null
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, message: `✅ Despesa "${data.description}" de R$ ${parseFloat(data.amount).toFixed(2)} cadastrada com sucesso!`, data: expense };
      }

      case 'create_customer': {
        const { data: customer, error } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenantId,
            full_name: data.name,
            email: data.email || '',
            whatsapp: data.whatsapp || data.phone || '',
            status: 'active',
            notes: data.notes || null
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, message: `✅ Cliente "${data.name}" cadastrado com sucesso!`, data: customer };
      }

      case 'create_charge': {
        // First find the customer
        let customerId = data.customer_id;
        if (!customerId && data.customer_name) {
          const { data: customer } = await supabase
            .from('customers')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('full_name', `%${data.customer_name}%`)
            .maybeSingle();
          
          if (customer) customerId = customer.id;
        }

        if (!customerId) {
          return { success: false, message: '❌ Cliente não encontrado. Por favor, especifique o nome do cliente.' };
        }

        const { data: charge, error } = await supabase
          .from('customer_charges')
          .insert({
            tenant_id: tenantId,
            customer_id: customerId,
            description: data.description,
            amount: parseFloat(data.amount) || 0,
            due_date: data.due_date || new Date().toISOString().split('T')[0],
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, message: `✅ Cobrança de R$ ${parseFloat(data.amount).toFixed(2)} criada com sucesso!`, data: charge };
      }

      case 'list_expenses': {
        const { data: expenses, error } = await supabase
          .from('expenses')
          .select('id, description, amount, expense_date, status, expense_categories(name)')
          .eq('tenant_id', tenantId)
          .order('expense_date', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        if (!expenses || expenses.length === 0) {
          return { success: true, message: 'Nenhuma despesa encontrada.', data: [] };
        }

        const list = expenses.map((e: any) => 
          `• ${e.description}: R$ ${e.amount.toFixed(2)} (${e.expense_date}) - ${e.expense_categories?.name || 'Sem categoria'}`
        ).join('\n');

        return { success: true, message: `📋 Últimas despesas:\n${list}`, data: expenses };
      }

      case 'list_customers': {
        const { data: customers, error } = await supabase
          .from('customers')
          .select('id, full_name, email, whatsapp, status')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('full_name')
          .limit(10);

        if (error) throw error;
        
        if (!customers || customers.length === 0) {
          return { success: true, message: 'Nenhum cliente ativo encontrado.', data: [] };
        }

        const list = customers.map((c: any) => 
          `• ${c.full_name} - ${c.whatsapp || c.email || 'Sem contato'}`
        ).join('\n');

        return { success: true, message: `👥 Clientes ativos:\n${list}`, data: customers };
      }

      case 'delete_expense': {
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', data.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true, message: '✅ Despesa excluída com sucesso!' };
      }

      default:
        return { success: false, message: `Ação "${type}" não implementada.` };
    }
  } catch (error) {
    console.error('Execute action error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao executar ação' };
  }
}

function buildSystemPromptWithActions(basePrompt: string, categoriesContext: string): string {
  return `${basePrompt}
${categoriesContext}

=== AÇÕES DISPONÍVEIS (IMPORTANTE!) ===
Você pode executar ações no sistema para ajudar o usuário. Quando identificar uma intenção clara de criar, listar ou modificar dados, responda normalmente E inclua no final da resposta um marcador de ação.

FORMATO DA AÇÃO (inclua no final da sua resposta):
[ACTION:tipo_da_acao:{"campo1":"valor1","campo2":"valor2"}]

AÇÕES DISPONÍVEIS:

1. CRIAR DESPESA - Quando usuário pedir para cadastrar/anotar uma despesa
   [ACTION:create_expense:{"description":"Descrição da despesa","amount":"100.00","category_name":"Alimentação","date":"2026-01-09","payment_method":"pix","notes":"observações"}]
   Exemplo: "Anota aí uma despesa de 50 reais de almoço" → cria despesa

2. CRIAR CLIENTE - Quando usuário pedir para cadastrar um cliente
   [ACTION:create_customer:{"name":"Nome do Cliente","email":"email@email.com","whatsapp":"11999999999"}]

3. CRIAR COBRANÇA - Quando usuário pedir para criar uma cobrança
   [ACTION:create_charge:{"customer_name":"Nome do cliente","description":"Descrição","amount":"100.00","due_date":"2026-01-15"}]

4. LISTAR DESPESAS - Quando usuário perguntar sobre despesas recentes
   [ACTION:list_expenses:{}]

5. LISTAR CLIENTES - Quando usuário perguntar sobre clientes
   [ACTION:list_customers:{}]

REGRAS IMPORTANTES:
- SEMPRE execute a ação quando o usuário pedir claramente (ex: "cadastra", "anota", "cria", "registra")
- Extraia valores monetários (ex: "50 reais" → amount: "50.00")
- Use a data de hoje se não for especificada
- Para despesas sem categoria específica, use uma categoria genérica como "Geral" ou "Outros"
- Responda de forma amigável confirmando que a ação foi realizada
- Se faltar informação essencial (como valor de despesa), pergunte antes de executar`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, previousMessages, tenantId, businessHours, menuOptions, executeAction: shouldExecute, actionData } = await req.json();
    
    if (!tenantId) {
      throw { status: 400, message: "Tenant ID é obrigatório" };
    }

    console.log("Processing chatbot request for tenant:", tenantId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If action execution requested
    if (shouldExecute && actionData) {
      const result = await executeAction(supabase, tenantId, actionData);
      return new Response(JSON.stringify({ actionResult: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiSettings = await getAISettings(supabase, tenantId);
    
    console.log("AI Settings:", {
      provider: aiSettings.provider,
      model: aiSettings.model,
      hasApiKey: aiSettings.provider === 'openai' ? !!aiSettings.openaiKey : !!aiSettings.geminiKey,
    });

    if (aiSettings.provider === 'openai' && !aiSettings.openaiKey) {
      throw { status: 400, message: "Chave da API OpenAI não configurada. Vá em Configurações > Integrações." };
    }
    if (aiSettings.provider === 'gemini' && !aiSettings.geminiKey) {
      throw { status: 400, message: "Chave da API Gemini não configurada. Vá em Configurações > Integrações." };
    }

    const [servicesContext, plansContext, categoriesContext] = await Promise.all([
      getServicesContext(supabase, tenantId),
      getPlansContext(supabase, tenantId),
      getExpenseCategoriesContext(supabase, tenantId)
    ]);

    let basePrompt = aiSettings.personality || 
      `Você é um assistente virtual inteligente e prestativo de uma empresa brasileira.
Responda de forma clara, educada e objetiva.
Use emojis ocasionalmente para tornar a conversa mais amigável.
Se não souber a resposta, seja honesto e sugira que o cliente entre em contato com um atendente.
Responda sempre em português brasileiro.`;

    if (aiSettings.context) {
      basePrompt += `\n\nContexto sobre a empresa:\n${aiSettings.context}`;
    }

    if (servicesContext) basePrompt += servicesContext;
    if (plansContext) basePrompt += plansContext;

    if (businessHours) {
      basePrompt += `\n\nHorário de funcionamento:\n${businessHours}`;
    }

    if (menuOptions && menuOptions.length > 0) {
      const optionsText = menuOptions.map((o: any) => `- ${o.label}`).join('\n');
      basePrompt += `\n\nOpções disponíveis:\n${optionsText}`;
    }

    const systemPrompt = buildSystemPromptWithActions(basePrompt, categoriesContext);

    const messages = [
      { role: "system", content: systemPrompt }
    ];

    if (previousMessages && Array.isArray(previousMessages)) {
      for (const msg of previousMessages) {
        messages.push({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    messages.push({ role: "user", content: message });

    let responseText = "";

    if (aiSettings.provider === 'openai') {
      responseText = await callOpenAI(messages, aiSettings.openaiKey!, aiSettings.model, aiSettings.maxTokens);
    } else {
      responseText = await callGemini(messages, aiSettings.geminiKey!, aiSettings.model, aiSettings.maxTokens, aiSettings.webSearch);
    }

    console.log("AI response generated successfully");

    // Parse response for actions
    const parsed = parseAIResponse(responseText);
    
    let actionResult: { success: boolean; message: string; data?: any } | undefined;
    
    // Auto-execute non-critical actions
    if (parsed.action && !parsed.action.confirmRequired) {
      console.log("Executing action:", parsed.action.type);
      actionResult = await executeAction(supabase, tenantId, parsed.action);
      if (actionResult.success) {
        parsed.message = `${parsed.message}\n\n${actionResult.message}`;
      } else {
        parsed.message = `${parsed.message}\n\n❌ ${actionResult.message}`;
      }
    }

    const response: AIResponse = {
      response: parsed.message,
      action: parsed.action,
      actionResult,
      provider: aiSettings.provider
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("Error in chatbot-response function:", error);
    
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Erro desconhecido");
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});