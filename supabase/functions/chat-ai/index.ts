import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CustomerContext {
  customer: {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    status: string;
  } | null;
  services: Array<{
    id: string;
    product_name: string;
    status: string;
    due_date: string | null;
    expires_at: string | null;
    price: number | null;
  }>;
  pendingCharges: Array<{
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
  }>;
  availableServices: Array<{
    id: string;
    name: string;
    price: number;
    description: string | null;
  }>;
  knowledgeBase: Array<{
    question: string;
    answer: string;
  }>;
}

interface ChatAction {
  type: 'generate_pix' | 'show_plans' | 'create_ticket' | 'transfer_human' | 'show_services' | 'show_charges' | 'confirm_action';
  payload: Record<string, any>;
}

interface AIResponse {
  message: string;
  action?: ChatAction;
  proactiveAlerts?: string[];
}

async function getCustomerContext(supabase: any, customerId: string, tenantId: string): Promise<CustomerContext> {
  console.log("Fetching customer context for:", customerId);
  
  // Fetch customer data
  const { data: customer } = await supabase
    .from('customers')
    .select('id, full_name, email, whatsapp, status')
    .eq('id', customerId)
    .single();

  // Fetch customer services/items
  const { data: services } = await supabase
    .from('customer_items')
    .select('id, product_name, status, due_date, expires_at, price')
    .eq('customer_id', customerId);

  // Fetch pending charges (via clients table linked by email/phone)
  let pendingCharges: any[] = [];
  if (customer?.email) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('email', customer.email)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    
    if (client) {
      const { data: charges } = await supabase
        .from('charges')
        .select('id, description, amount, due_date, status')
        .eq('client_id', client.id)
        .in('status', ['pending', 'overdue']);
      pendingCharges = charges || [];
    }
  }

  // Fetch available services for upsell
  const { data: availableServices } = await supabase
    .from('services')
    .select('id, name, price, description')
    .eq('seller_tenant_id', tenantId)
    .eq('active', true)
    .limit(5);

  // Fetch knowledge base
  const { data: knowledgeBase } = await supabase
    .from('chatbot_knowledge_base')
    .select('question, answer')
    .eq('tenant_id', tenantId)
    .eq('type', 'faq')
    .eq('is_active', true)
    .limit(20);

  return {
    customer: customer ? {
      id: customer.id,
      name: customer.full_name,
      email: customer.email,
      whatsapp: customer.whatsapp,
      status: customer.status
    } : null,
    services: services || [],
    pendingCharges: pendingCharges || [],
    availableServices: availableServices || [],
    knowledgeBase: knowledgeBase || []
  };
}

function buildSystemPrompt(
  context: CustomerContext,
  personality: string,
  businessContext: string,
  businessHours: string,
  menuOptions: any[]
): string {
  let prompt = personality || `Você é um assistente virtual inteligente e prestativo de uma empresa brasileira.
Responda de forma clara, educada e objetiva.
Use emojis ocasionalmente para tornar a conversa mais amigável.
Responda sempre em português brasileiro.`;

  // Add business context
  if (businessContext) {
    prompt += `\n\nContexto sobre a empresa:\n${businessContext}`;
  }

  // Add business hours
  if (businessHours) {
    prompt += `\n\nHorário de funcionamento:\n${businessHours}`;
  }

  // Add customer context if available
  if (context.customer) {
    prompt += `\n\n=== DADOS DO CLIENTE ===
Nome: ${context.customer.name}
Email: ${context.customer.email}
WhatsApp: ${context.customer.whatsapp}
Status: ${context.customer.status}`;
  }

  // Add services
  if (context.services.length > 0) {
    prompt += `\n\n=== SERVIÇOS DO CLIENTE ===`;
    context.services.forEach((s, i) => {
      prompt += `\n${i + 1}. ${s.product_name} - Status: ${s.status}`;
      if (s.due_date) prompt += ` | Vencimento: ${s.due_date}`;
      if (s.expires_at) prompt += ` | Expira: ${s.expires_at}`;
      if (s.price) prompt += ` | Valor: R$ ${s.price}`;
    });
  }

  // Add pending charges
  if (context.pendingCharges.length > 0) {
    prompt += `\n\n=== COBRANÇAS PENDENTES ===`;
    context.pendingCharges.forEach((c, i) => {
      prompt += `\n${i + 1}. ${c.description} - R$ ${c.amount} - Venc: ${c.due_date} (${c.status})`;
    });
    prompt += `\n\nIMPORTANTE: O cliente tem cobranças pendentes. Se apropriado, mencione proativamente.`;
  }

  // Add available services for upsell
  if (context.availableServices.length > 0) {
    prompt += `\n\n=== SERVIÇOS DISPONÍVEIS PARA UPGRADE ===`;
    context.availableServices.forEach((s, i) => {
      prompt += `\n${i + 1}. ${s.name} - R$ ${s.price}`;
    });
  }

  // Add knowledge base
  if (context.knowledgeBase.length > 0) {
    prompt += `\n\n=== BASE DE CONHECIMENTO (FAQ) ===`;
    context.knowledgeBase.forEach((kb, i) => {
      prompt += `\n\nP: ${kb.question}\nR: ${kb.answer}`;
    });
  }

  // Add function calling instructions
  prompt += `\n\n=== AÇÕES DISPONÍVEIS ===
Você pode executar ações para ajudar o cliente. Quando identificar uma intenção, responda com a ação apropriada.

IMPORTANTE: Ao detectar uma das intenções abaixo, inclua no final da sua resposta uma linha especial no formato:
[ACTION:tipo_da_acao:dados_json]

Ações disponíveis:
1. generate_pix - Cliente quer 2ª via ou pagar uma fatura
   Formato: [ACTION:generate_pix:{"charge_id":"id_da_cobranca"}]

2. show_plans - Cliente quer ver planos ou fazer upgrade
   Formato: [ACTION:show_plans:{}]

3. create_ticket - Cliente tem problema ou reclamação que precisa de suporte
   Formato: [ACTION:create_ticket:{"subject":"assunto","message":"descrição"}]

4. transfer_human - Cliente pede para falar com humano ou atendente
   Formato: [ACTION:transfer_human:{"context":"resumo da conversa"}]

5. show_services - Cliente quer ver seus serviços ativos
   Formato: [ACTION:show_services:{}]

6. show_charges - Cliente quer ver suas faturas/cobranças
   Formato: [ACTION:show_charges:{}]

REGRAS:
- Seja proativo: se cliente tem fatura vencida, mencione
- Se serviço expira em 7 dias, sugira renovação
- Para cancelamentos, tente entender o motivo e oferecer soluções antes
- Detecte intenção de churn e ofereça retenção
- Responda sempre de forma empática e prestativa`;

  return prompt;
}

function parseAIResponse(responseText: string): AIResponse {
  const result: AIResponse = {
    message: responseText,
    proactiveAlerts: []
  };

  // Extract action if present
  const actionMatch = responseText.match(/\[ACTION:(\w+):(\{.*\})\]/);
  if (actionMatch) {
    try {
      const actionType = actionMatch[1] as ChatAction['type'];
      const actionPayload = JSON.parse(actionMatch[2]);
      result.action = {
        type: actionType,
        payload: actionPayload
      };
      // Remove action from message
      result.message = responseText.replace(actionMatch[0], '').trim();
    } catch (e) {
      console.error("Error parsing action:", e);
    }
  }

  return result;
}

// Normaliza model ID (remove prefixo "google/" se existir)
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

async function callGemini(messages: any[], apiKey: string, model: string, maxTokens: number): Promise<string> {
  const geminiModel = normalizeGeminiModel(model);
  console.log("Calling Gemini with model:", geminiModel);

  // Convert messages to Gemini format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  // Add system instruction if present
  const systemMessage = messages.find(m => m.role === 'system');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: maxTokens,
        },
      }),
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

async function callOpenAI(messages: any[], apiKey: string, model: string, maxTokens: number): Promise<string> {
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

async function logAction(supabase: any, sessionId: string, tenantId: string, customerId: string | null, action: ChatAction) {
  try {
    await supabase
      .from('chatbot_actions')
      .insert({
        session_id: sessionId,
        tenant_id: tenantId,
        customer_id: customerId,
        action_type: action.type,
        action_data: action.payload
      });
  } catch (e) {
    console.error("Error logging action:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      previousMessages, 
      tenantId, 
      customerId,
      sessionId,
      businessHours, 
      menuOptions 
    } = await req.json();
    
    if (!tenantId) {
      throw { status: 400, message: "Tenant ID é obrigatório" };
    }

    console.log("Processing AI chat for tenant:", tenantId, "customer:", customerId);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI settings
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('key, value')
      .eq('tenant_id', tenantId)
      .in('key', ['ai_provider', 'ai_model', 'ai_chatbot_personality', 'ai_chatbot_context', 'ai_max_tokens', 'openai_api_key', 'gemini_api_key']);

    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: { key: string; value: string }) => {
      settingsMap[s.key] = s.value;
    });

    const provider = settingsMap['ai_provider'] as 'openai' | 'gemini' || 'gemini';
    const model = settingsMap['ai_model'] || 'gemini-2.5-flash';
    const personality = settingsMap['ai_chatbot_personality'] || '';
    const businessContext = settingsMap['ai_chatbot_context'] || '';
    const maxTokens = parseInt(settingsMap['ai_max_tokens'] || '800', 10);
    const openaiKey = settingsMap['openai_api_key'];
    const geminiKey = settingsMap['gemini_api_key'];

    // Validate API keys
    if (provider === 'openai' && !openaiKey) {
      throw { status: 400, message: "Chave da API OpenAI não configurada. Vá em Configurações > Integrações." };
    }
    if (provider === 'gemini' && !geminiKey) {
      throw { status: 400, message: "Chave da API Gemini não configurada. Vá em Configurações > Integrações." };
    }

    // Get customer context if customer is logged in
    let customerContext: CustomerContext = {
      customer: null,
      services: [],
      pendingCharges: [],
      availableServices: [],
      knowledgeBase: []
    };

    if (customerId) {
      customerContext = await getCustomerContext(supabase, customerId, tenantId);
    } else {
      // Still fetch knowledge base for non-logged users
      const { data: knowledgeBase } = await supabase
        .from('chatbot_knowledge_base')
        .select('question, answer')
        .eq('tenant_id', tenantId)
        .eq('type', 'faq')
        .eq('is_active', true)
        .limit(20);
      customerContext.knowledgeBase = knowledgeBase || [];
    }

    // Build system prompt with all context
    const systemPrompt = buildSystemPrompt(
      customerContext,
      personality,
      businessContext,
      businessHours || '',
      menuOptions || []
    );

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add previous messages (limit to last 20 for token management)
    if (previousMessages && Array.isArray(previousMessages)) {
      const recentMessages = previousMessages.slice(-20);
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'bot' ? 'assistant' : 'user',
          content: msg.content
        });
      }
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Call AI based on provider
    let responseText = "";
    if (provider === 'openai') {
      responseText = await callOpenAI(messages, openaiKey!, model, maxTokens);
    } else {
      responseText = await callGemini(messages, geminiKey!, model, maxTokens);
    }

    // Parse response for actions
    const aiResponse = parseAIResponse(responseText);

    // Log action if present
    if (aiResponse.action && sessionId) {
      await logAction(supabase, sessionId, tenantId, customerId, aiResponse.action);
      
      // Update session action count using RPC or direct increment
      const { data: currentSession } = await supabase
        .from('chatbot_sessions')
        .select('total_actions')
        .eq('id', sessionId)
        .single();
      
      await supabase
        .from('chatbot_sessions')
        .update({ total_actions: (currentSession?.total_actions || 0) + 1 })
        .eq('id', sessionId);
    }

    // Add proactive alerts
    if (customerContext.pendingCharges.length > 0) {
      const overdueCharges = customerContext.pendingCharges.filter(c => c.status === 'overdue');
      if (overdueCharges.length > 0) {
        aiResponse.proactiveAlerts = aiResponse.proactiveAlerts || [];
        aiResponse.proactiveAlerts.push(`Você tem ${overdueCharges.length} fatura(s) vencida(s)`);
      }
    }

    // Check for expiring services
    const today = new Date();
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringServices = customerContext.services.filter(s => {
      if (s.expires_at) {
        const expiresDate = new Date(s.expires_at);
        return expiresDate <= sevenDaysFromNow && expiresDate >= today;
      }
      return false;
    });
    if (expiringServices.length > 0) {
      aiResponse.proactiveAlerts = aiResponse.proactiveAlerts || [];
      aiResponse.proactiveAlerts.push(`${expiringServices.length} serviço(s) expira(m) em breve`);
    }

    console.log("AI response generated successfully with provider:", provider);

    return new Response(
      JSON.stringify({ 
        response: aiResponse.message,
        action: aiResponse.action,
        proactiveAlerts: aiResponse.proactiveAlerts,
        customerContext: customerId ? {
          hasCustomer: true,
          servicesCount: customerContext.services.length,
          pendingChargesCount: customerContext.pendingCharges.length
        } : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in chat-ai function:", error);
    
    const status = error?.status || 500;
    const message = error?.message || (error instanceof Error ? error.message : "Erro desconhecido");
    
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
