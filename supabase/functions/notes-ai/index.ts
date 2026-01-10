import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NoteAction {
  action: 'create' | 'update' | 'delete' | 'pin' | 'unpin' | 'list' | 'search';
  data?: any;
  confirmRequired?: boolean;
}

interface AIResponse {
  message: string;
  action?: NoteAction;
  requiresConfirmation?: boolean;
}

// Parse AI response to extract action
function parseAIResponse(content: string): AIResponse {
  const response: AIResponse = { message: content };
  
  const actionMatch = content.match(/\[ACTION:(\w+)(?::(.+?))?\]/);
  if (actionMatch) {
    const actionType = actionMatch[1].toLowerCase() as NoteAction['action'];
    let actionData = null;
    
    if (actionMatch[2]) {
      try {
        actionData = JSON.parse(actionMatch[2]);
      } catch {
        console.error('Failed to parse action data:', actionMatch[2]);
      }
    }
    
    // Delete is the only critical action
    const criticalActions = ['delete'];
    
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

// Get notes context
async function getNotesContext(supabase: any, userId: string) {
  // Get recent notes
  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get pinned notes
  const { data: pinned } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_pinned', true);

  // Get tags
  const allTags = new Set<string>();
  (notes || []).forEach((note: any) => {
    (note.tags || []).forEach((tag: string) => allTags.add(tag));
  });

  // Category counts
  const categoryCounts: Record<string, number> = {};
  (notes || []).forEach((note: any) => {
    categoryCounts[note.category] = (categoryCounts[note.category] || 0) + 1;
  });

  return {
    notes: notes || [],
    pinned: pinned || [],
    tags: Array.from(allTags),
    categoryCounts,
    totalNotes: notes?.length || 0
  };
}

function buildSystemPrompt(context: any) {
  const notesList = context.notes.slice(0, 10).map((n: any) => 
    `- [${n.id.slice(0, 8)}] "${n.title || 'Sem título'}" (${n.category}) ${n.is_pinned ? '📌' : ''}`
  ).join('\n');

  const pinnedList = context.pinned.map((n: any) => 
    `- [${n.id.slice(0, 8)}] "${n.title || 'Sem título'}"`
  ).join('\n');

  const tagsList = context.tags.join(', ');

  return `Você é um assistente de anotações inteligente. Ajude o usuário a criar, editar, organizar e encontrar suas notas.

CONTEXTO ATUAL:
- Total de notas: ${context.totalNotes}
- Notas fixadas: ${context.pinned.length}
- Tags utilizadas: ${tagsList || 'Nenhuma'}
- Categorias: Ideia, Tarefa, Reunião, Bug

Notas Recentes:
${notesList || 'Nenhuma nota ainda'}

Notas Fixadas:
${pinnedList || 'Nenhuma nota fixada'}

CATEGORIAS DISPONÍVEIS:
- idea: Para ideias e brainstorms
- task: Para tarefas e to-dos
- meeting: Para notas de reunião
- bug: Para bugs e problemas técnicos

AÇÕES DISPONÍVEIS:
Para executar ações, inclua no final da resposta o marcador no formato:
[ACTION:tipo:{"dados": "json"}]

Tipos de ação:
- create: Criar nota [ACTION:create:{"title":"Título", "content":"Conteúdo da nota", "category":"idea", "tags":["tag1", "tag2"]}]
- update: Atualizar nota [ACTION:update:{"id":"id-da-nota", "title":"Novo título", "content":"Novo conteúdo"}]
- delete: Excluir nota [ACTION:delete:{"id":"id-da-nota"}]
- pin: Fixar nota [ACTION:pin:{"id":"id-da-nota"}]
- unpin: Desafixar nota [ACTION:unpin:{"id":"id-da-nota"}]
- search: Buscar notas [ACTION:search:{"query":"termo de busca"}]
- list: Listar notas [ACTION:list:{"category":"idea"}]

REGRAS IMPORTANTES:
1. Quando o usuário pedir para criar uma nota, SEMPRE inclua o marcador de ação
2. Quando criar notas, seja criativo com o título se não for especificado
3. Escolha a categoria mais apropriada baseado no contexto
4. Para excluir, SEMPRE peça confirmação primeiro
5. Use linguagem amigável e direta em português
6. Se o usuário mencionar uma nota existente, use o ID correto
7. Sugira tags relevantes baseado no conteúdo

EXEMPLOS:
- "Anota aí: comprar leite" → Cria nota de tarefa
- "Ideia: app de receitas" → Cria nota de ideia
- "Fixar a última nota" → Fixa a nota mais recente
- "O que anotei sobre reunião?" → Busca notas com categoria meeting

Seja proativo e útil!`;
}

async function executeAction(supabase: any, userId: string, actionData: NoteAction) {
  const { action, data } = actionData;

  try {
    switch (action) {
      case 'create': {
        const { error, data: newNote } = await supabase
          .from('notes')
          .insert({ 
            user_id: userId,
            title: data.title || null,
            content: data.content || '',
            category: data.category || 'idea',
            tags: data.tags || [],
            is_pinned: data.is_pinned || false
          })
          .select()
          .single();
        if (error) throw error;
        return { success: true, message: '✅ Nota criada com sucesso!', data: newNote };
      }

      case 'update': {
        const { id, ...updateData } = data;
        const { error } = await supabase
          .from('notes')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId);
        if (error) throw error;
        return { success: true, message: '✅ Nota atualizada!' };
      }

      case 'delete': {
        const { error } = await supabase
          .from('notes')
          .delete()
          .eq('id', data.id)
          .eq('user_id', userId);
        if (error) throw error;
        return { success: true, message: '✅ Nota excluída!' };
      }

      case 'pin': {
        const { error } = await supabase
          .from('notes')
          .update({ is_pinned: true })
          .eq('id', data.id)
          .eq('user_id', userId);
        if (error) throw error;
        return { success: true, message: '📌 Nota fixada!' };
      }

      case 'unpin': {
        const { error } = await supabase
          .from('notes')
          .update({ is_pinned: false })
          .eq('id', data.id)
          .eq('user_id', userId);
        if (error) throw error;
        return { success: true, message: 'Nota desafixada!' };
      }

      case 'search': {
        const { data: results, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .or(`title.ilike.%${data.query}%,content.ilike.%${data.query}%`)
          .limit(10);
        if (error) throw error;
        return { success: true, data: results };
      }

      case 'list': {
        let query = supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId);

        if (data?.category) {
          query = query.eq('category', data.category);
        }

        const { data: notes, error } = await query.order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        return { success: true, data: notes };
      }

      default:
        return { success: false, message: 'Ação não reconhecida' };
    }
  } catch (error) {
    console.error('Execute action error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao executar ação' };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, tenantId, action, actionData, previousMessages = [] } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If action is 'execute', execute the pending action
    if (action === 'execute' && actionData) {
      const result = await executeAction(supabase, userId, actionData);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get API key - try Lovable AI first, then tenant settings
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    let apiKey = LOVABLE_API_KEY;
    let useGateway = !!LOVABLE_API_KEY;

    if (!apiKey && tenantId) {
      const { data: settingsData } = await supabase
        .from('tenant_settings')
        .select('key, value')
        .eq('tenant_id', tenantId)
        .eq('key', 'gemini_api_key')
        .single();
      
      apiKey = settingsData?.value;
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "Nenhuma chave de API configurada. Configure a chave Gemini em Configurações > Integrações." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get context for AI
    const context = await getNotesContext(supabase, userId);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context);

    // Build messages
    const allMessages = [
      ...previousMessages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message }
    ];

    let responseText = "";

    if (useGateway) {
      // Use Lovable AI Gateway
      console.log("📞 Calling Lovable AI Gateway for notes-ai");
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...allMessages.map((m: any) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("❌ Lovable AI error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no Lovable." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      responseText = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua solicitação.";
    } else {
      // Use Gemini directly
      console.log("📞 Calling Gemini API for notes-ai");
      const contents = allMessages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("❌ Gemini API error:", aiResponse.status, errorText);
        throw new Error(`Gemini API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação.";
    }
    
    console.log("✅ AI response received for notes-ai");
    
    // Parse response and check for actions to execute automatically (non-critical)
    const parsedResponse = parseAIResponse(responseText);
    
    // Auto-execute non-critical actions
    if (parsedResponse.action && !parsedResponse.action.confirmRequired) {
      const result = await executeAction(supabase, userId, parsedResponse.action);
      if (result.success) {
        parsedResponse.message = `${parsedResponse.message}\n\n${result.message}`;
        parsedResponse.action = undefined; // Clear action since it was executed
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in notes-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
