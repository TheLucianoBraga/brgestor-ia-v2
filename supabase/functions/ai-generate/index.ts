import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt padrão para ERP - SEM MARKDOWN
const ERP_SYSTEM_PROMPT = `Você é um assistente de redação para um ERP de gestão e cobrança chamado BRGestor.

REGRAS OBRIGATÓRIAS:
1. NÃO use formatação Markdown (sem **, ##, ###, *, etc.)
2. NÃO use títulos ou cabeçalhos
3. Use quebras de linha adequadas para separar parágrafos (duas quebras de linha)
4. NÃO use negrito, itálico ou qualquer formatação especial
5. Retorne o conteúdo pronto para ser colado em um campo de texto simples
6. Mantenha o mesmo significado e informações do texto original
7. O texto deve ser limpo, direto e profissional
8. Use espaçamento adequado entre frases e parágrafos
9. Para listas, use apenas quebras de linha simples entre itens
10. Preserve a estrutura natural do texto com espaçamento correto`;

// Prompts específicos para cada estilo de tom
const TONE_PROMPTS: Record<string, string> = {
  friendly: `Tom AMIGÁVEL: Use linguagem próxima, acolhedora e informal. Pode usar emojis leves (😊, 👋, ✨) com moderação. Seja caloroso e empático, como se estivesse conversando com um amigo.`,
  sales: `Tom VENDEDOR/PERSUASIVO: Use técnicas de copywriting. Foque nos benefícios, crie urgência, use gatilhos mentais. Inclua chamadas para ação claras. Seja convincente mas não agressivo.`,
  executive: `Tom EXECUTIVO/COMERCIAL: Use linguagem formal, profissional e elegante. Seja direto, objetivo e respeitoso. Transmita credibilidade e confiança. Evite informalidades.`,
};

// Conversão eficiente para Base64
const toBase64 = (arr: Uint8Array) => {
  const binString = Array.from(arr, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binString);
};

// Buscar chave Gemini - primeiro env, depois tenant_settings
async function getGeminiKey(supabase: any, tenantId: string | null): Promise<string | null> {
  // 1. Tentar variável de ambiente
  const envKey = Deno.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (envKey) {
    console.log("[KEY] ✅ Usando chave do ambiente GOOGLE_GENERATIVE_AI_API_KEY");
    return envKey;
  }
  
  // 2. Buscar do tenant_settings
  if (tenantId) {
    console.log("[KEY] Buscando no tenant_settings para tenant:", tenantId);
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('tenant_id', tenantId)
      .eq('key', 'gemini_api_key')
      .maybeSingle();
    
    if (error) {
      console.error("[KEY] ❌ Erro ao buscar do banco:", error.message);
    } else if (data?.value) {
      console.log("[KEY] ✅ Chave encontrada no tenant_settings");
      return data.value;
    }
  }
  
  return null;
}

// Processar mídia do Supabase Storage
async function processMedia(supabase: any, fileUrl: string, fileType: string) {
  try {
    console.log(`[MEDIA] Processando ${fileType}: ${fileUrl.substring(0, 80)}...`);
    
    const storageMatch = fileUrl.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^\/]+)\/(.+)/);
    if (!storageMatch) {
      console.log("[MEDIA] ⚠️ URL não é do Supabase Storage");
      return null;
    }

    const [_, bucket, path] = storageMatch;
    console.log(`[MEDIA] Baixando: bucket=${bucket}, path=${path}`);
    
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error) {
      console.error("[MEDIA] ❌ Erro no download:", error.message);
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();
    const base64 = toBase64(new Uint8Array(arrayBuffer));
    
    console.log(`[MEDIA] ✅ Base64 gerado: ${base64.length} caracteres`);
    
    return {
      inline_data: {
        mime_type: data.type || (fileType === 'audio' ? 'audio/ogg' : 'image/jpeg'),
        data: base64
      }
    };
  } catch (e: any) {
    console.error("[MEDIA] ❌ Erro:", e.message);
    return null;
  }
}

// Construir prompt baseado no tipo de ação
function buildPrompt(type: string, prompt: string, context?: any): { userPrompt: string; systemPrompt: string } {
  let userPrompt = prompt;
  let systemPrompt = ERP_SYSTEM_PROMPT;

  // Detectar se é um prompt de sistema/persona (contém instruções estruturadas)
  const isSystemPrompt = prompt.includes('CAPACIDADES:') || 
                         prompt.includes('REGRAS') || 
                         prompt.includes('{{') ||
                         prompt.includes('CONTEXTO DO USUÁRIO') ||
                         prompt.includes('[ACTION:');

  switch (type) {
    case 'improve':
      if (isSystemPrompt) {
        // Se for um prompt de sistema, melhorar como documentação técnica
        systemPrompt = `Você é um especialista em criar prompts de sistema para chatbots de IA.
REGRAS:
1. NÃO use formatação Markdown (sem **, ##, *, etc.)
2. Mantenha variáveis como {{nome}}, {{valor}} intactas
3. Mantenha [ACTION:...] intactas
4. Melhore a clareza e organização das instruções
5. Torne mais objetivo e direto
6. Retorne APENAS o prompt melhorado`;
        userPrompt = `Melhore o prompt de sistema a seguir para um chatbot de atendimento. Mantenha todas as variáveis e ações intactas. Responda APENAS com o prompt melhorado:\n\n${prompt}`;
      } else {
        userPrompt = `Melhore a escrita do texto a seguir, tornando-o mais claro, profissional e bem estruturado. Mantenha o mesmo significado. Responda APENAS com o texto melhorado:\n\n${prompt}`;
      }
      break;
    
    case 'shorten':
      userPrompt = `Encurte o texto a seguir, deixando-o direto ao ponto. Remova redundâncias mantendo a mensagem principal. Responda APENAS com o texto resumido:\n\n${prompt}`;
      break;
    
    case 'translate':
      const lang = context?.targetLanguage === 'en' ? 'inglês' : 
                   context?.targetLanguage === 'es' ? 'espanhol' : context?.targetLanguage || 'inglês';
      userPrompt = `Traduza o texto a seguir para ${lang}. Responda APENAS com a tradução:\n\n${prompt}`;
      break;
    
    case 'tone':
      const toneStyle = context?.tone || 'executive';
      const toneInstruction = TONE_PROMPTS[toneStyle] || TONE_PROMPTS.executive;
      systemPrompt = `${ERP_SYSTEM_PROMPT}\n\n${toneInstruction}`;
      userPrompt = `Reescreva o texto a seguir aplicando o tom especificado. Mantenha o significado original. Responda APENAS com o texto reescrito:\n\n${prompt}`;
      break;
    
    case 'variations':
      systemPrompt = `${ERP_SYSTEM_PROMPT}\n\nVocê é especialista em criar variações de texto mantendo o mesmo significado.`;
      userPrompt = `Crie 3 variações diferentes do texto a seguir. Mantenha o mesmo significado e tom, mas varie a estrutura e palavras. Separe cada variação com "---" em uma nova linha:\n\n${prompt}`;
      break;
    
    case 'content':
    case 'article':
      systemPrompt = `${ERP_SYSTEM_PROMPT}\n\nVocê é um criador de conteúdo especializado. Crie conteúdo relevante e envolvente.`;
      break;
    
    case 'template':
      systemPrompt = `${ERP_SYSTEM_PROMPT}\n\nVocê cria templates de mensagens para comunicação com clientes. Use variáveis como {nome}, {valor}, {vencimento} quando apropriado.`;
      break;
    
    case 'chat':
      systemPrompt = `Você é o BRGestor, assistente virtual de um ERP de gestão e cobrança. Seja prestativo, profissional e objetivo. ${ERP_SYSTEM_PROMPT}`;
      break;
    
    default:
      systemPrompt = `${ERP_SYSTEM_PROMPT}\n\nSe receber áudio, transcreva e gere a [ACTION] imediatamente. Se receber imagem de conta, extraia os dados e gere [ACTION:add_expense].`;
  }

  return { userPrompt, systemPrompt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[AI-GENERATE] ========== NOVA REQUISIÇÃO ==========");
    
    const { prompt, context, aiConfig, type } = await req.json();
    
    console.log("[AI-GENERATE] Type:", type || "(não informado)");
    console.log("[AI-GENERATE] Prompt:", prompt?.substring(0, 100) || "(vazio)");
    console.log("[AI-GENERATE] TenantId:", context?.tenantId || "(não informado)");
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, 
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Construir prompts baseado no tipo
    const { userPrompt, systemPrompt } = buildPrompt(type, prompt, context);

    // BUSCAR CHAVE GEMINI - SEM FALLBACK
    const geminiKey = await getGeminiKey(supabase, context?.tenantId);
    
    if (!geminiKey) {
      console.error("[AI-GENERATE] ❌ Chave Gemini não encontrada!");
      return new Response(
        JSON.stringify({ 
          error: "Chave Gemini (GOOGLE_GENERATIVE_AI_API_KEY) não configurada nos Secrets do Supabase ou em Configurações > Integrações." 
        }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[AI-GENERATE] ✅ Chave Gemini obtida");

    // BUSCAR MODELO DO TENANT
    let geminiModel = 'gemini-2.5-flash';
    if (context?.tenantId) {
      const { data: modelSetting } = await supabase
        .from('tenant_settings')
        .select('value')
        .eq('tenant_id', context.tenantId)
        .eq('key', 'ai_model')
        .maybeSingle();
      
      if (modelSetting?.value) {
        const rawModel = modelSetting.value;
        if (rawModel.includes('/')) {
          const parts = rawModel.split('/');
          const lastPart = parts[parts.length - 1];
          if (lastPart.startsWith('gemini-')) geminiModel = lastPart;
        } else if (rawModel.startsWith('gemini-')) {
          geminiModel = rawModel;
        }
      }
    }
    
    console.log("[AI-GENERATE] Using model:", geminiModel);

    // PROCESSAR MÍDIA (ÁUDIO OU IMAGEM)
    let mediaPart = null;
    if (context?.fileUrl) {
      mediaPart = await processMedia(supabase, context.fileUrl, context.fileType);
    }

    // MONTAR CORPO PARA O GEMINI
    const requestBody = {
      contents: [{
        role: "user",
        parts: mediaPart ? [mediaPart, { text: userPrompt }] : [{ text: userPrompt }]
      }],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: { 
        temperature: 0.3, 
        topP: 0.8,
        maxOutputTokens: 8000
      }
    };

    console.log("[AI-GENERATE] Chamando modelo:", geminiModel);

    // CHAMADA DIRETA AO GEMINI - SEM FALLBACK
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, 
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    const result = await response.json();
    
    // Retornar erro real do Google para debug
    if (result.error) {
      console.error("[AI-GENERATE] ❌ Erro do Gemini:", result.error.message);
      return new Response(
        JSON.stringify({ error: result.error.message }), 
        { 
          status: result.error.code || 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui processar a informação.";
    
    console.log("[AI-GENERATE] ✅ Resposta recebida:", text.substring(0, 100));

    return new Response(
      JSON.stringify({ text }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: any) {
    console.error("[AI-GENERATE] ❌ ERRO GERAL:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
