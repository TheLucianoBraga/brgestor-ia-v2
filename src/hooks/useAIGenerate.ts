import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

type AIAction = 'generate' | 'improve' | 'summarize' | 'variations' | 'translate' | 'content' | 'article' | 'chat' | 'template';

// Função para limpar formatação markdown do texto
const cleanMarkdown = (text: string): string => {
  if (!text) return text;
  
  return text
    // Remove bold/italic markers: **text**, *text*, __text__, _text_
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove headers: # ## ### etc
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bullet points: * - + at start of lines but preserve line breaks
    .replace(/^[\*\-\+]\s+/gm, '• ')
    // Remove numbered lists formatting but keep structure
    .replace(/^\d+\.\s+/gm, '')
    // Remove code blocks: ```code```
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code: `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove links: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images: ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Preserve proper paragraph spacing - convert single line breaks to spaces within paragraphs
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
    // Clean up excessive spaces but preserve intentional formatting
    .replace(/ {2,}/g, ' ')
    // Clean up multiple line breaks to maximum 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Chat action types matching ChatActionCard.tsx
export interface ChatAction {
  type: 'generate_pix' | 'show_plans' | 'create_ticket' | 'transfer_human' | 'show_services' | 'show_charges' | 'confirm_action' | 
        'show_system_metrics' | 'navigate_organizations' | 'show_master_billing' | 'navigate_config' | 'create_internal_ticket' |
        'show_adm_dashboard' | 'list_revendas' | 'show_adm_billing' | 'create_revenda' | 'list_tickets' | 'show_subscription' |
        'show_revenda_dashboard' | 'list_customers' | 'list_pending_charges' | 'send_charge' | 'create_customer' |
        'show_due_date' | 'show_referral' | 'navigate_profile' | 'request_help' | 'generate_payment';
  payload: Record<string, any>;
}

// Enhanced chat context for RAG and memory
export interface ChatContext {
  tenantId?: string;
  customerId?: string;
  phone?: string;
  source?: 'web' | 'whatsapp' | 'portal';
  sessionId?: string;
  messages?: Array<{ role: string; content: string }>;
}

interface GenerateOptions {
  type: AIAction;
  prompt: string;
  context?: {
    title?: string;
    type?: string;
    category?: string;
    messages?: Array<{ role: string; content: string }>;
    targetLanguage?: string;
    // Enhanced chat context
    tenantId?: string;
    customerId?: string;
    phone?: string;
    source?: 'web' | 'whatsapp' | 'portal';
    sessionId?: string;
  };
}

interface AIGenerateResult {
  success: boolean;
  text: string | null;
  error?: string;
  action?: ChatAction;
  hasKnowledge?: boolean;
  hasMemory?: boolean;
}

export function useAIGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const { currentTenant } = useTenant();
  
  // Snapshot for undo functionality
  const contentSnapshot = useRef<string | null>(null);

  const saveSnapshot = useCallback((content: string) => {
    contentSnapshot.current = content;
  }, []);

  const getSnapshot = useCallback((): string | null => {
    return contentSnapshot.current;
  }, []);

  const clearSnapshot = useCallback(() => {
    contentSnapshot.current = null;
  }, []);

  const generate = useCallback(async (options: GenerateOptions): Promise<AIGenerateResult> => {
    const action = options.type as AIAction;
    setIsGenerating(true);
    setActiveAction(action);
    
    try {
      // Garantir que tenantId está no contexto
      const contextWithTenant = {
        ...options.context,
        tenantId: options.context?.tenantId || currentTenant?.id,
      };

      console.log('[AI] Chamando Edge Function ai-generate:', { 
        type: options.type,
        tenantId: contextWithTenant.tenantId,
        hasPrompt: !!options.prompt 
      });
      
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: options.type,
          prompt: options.prompt,
          context: contextWithTenant,
          // Deixar a Edge Function buscar a chave do Gemini do tenant_settings
          aiConfig: { provider: 'gemini' },
        },
      });

      console.log('[AI] Resposta da Edge Function:', { data, error });

      if (error) {
        console.error('[AI] Erro na Edge Function:', error);
        
        // Extrair mensagem de erro real
        let errorMessage = 'Erro ao conectar com IA';
        
        if (error.message) {
          errorMessage = error.message;
        }
        
        // Verificar erro no body da resposta
        if (error.context?.body) {
          try {
            const bodyError = JSON.parse(error.context.body);
            if (bodyError?.error) {
              errorMessage = bodyError.error;
            }
          } catch {
            // Ignorar erros de parse
          }
        }
        
        throw new Error(errorMessage);
      }

      if (data?.error) {
        console.error('[AI] Erro retornado pela IA:', data.error);
        throw new Error(data.error);
      }

      if (!data?.text && options.type !== 'chat') {
        console.warn('[AI] Resposta vazia da IA');
        throw new Error('Resposta vazia da IA');
      }

      // Retornar resultado com action e metadata
      return { 
        success: true, 
        text: data.text || '',
        action: data.action,
        hasKnowledge: data.hasKnowledge,
        hasMemory: data.hasMemory
      };
    } catch (err: unknown) {
      console.error('[AI] Exceção:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido na IA';
      return { success: false, text: null, error: errorMessage };
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  }, [currentTenant?.id]);

  const generateContent = useCallback(async (
    title: string, 
    type: string, 
    category?: string
  ): Promise<string | null> => {
    if (!title.trim()) {
      toast.error('Digite um título para gerar o conteúdo');
      return null;
    }

    const result = await generate({
      type: 'content',
      prompt: `Crie um conteúdo sobre: ${title}`,
      context: { title, type, category },
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao gerar conteúdo');
      return null;
    }

    // Limpar formatação markdown do conteúdo
    return cleanMarkdown(result.text || '');
  }, [generate]);

  const generateArticle = useCallback(async (
    title: string,
    category?: string
  ): Promise<string | null> => {
    if (!title.trim()) {
      toast.error('Digite um título para gerar o artigo');
      return null;
    }

    const result = await generate({
      type: 'article',
      prompt: `Escreva um artigo completo sobre: ${title}`,
      context: { title, category },
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao gerar artigo');
      return null;
    }

    // Limpar formatação markdown do artigo
    return cleanMarkdown(result.text || '');
  }, [generate]);

  const improveText = useCallback(async (
    text: string, 
    saveOriginal?: (original: string) => void
  ): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Digite algum conteúdo para melhorar');
      return null;
    }

    // Save snapshot for undo
    saveSnapshot(text);
    if (saveOriginal) {
      saveOriginal(text);
    }

    const result = await generate({
      type: 'improve',
      prompt: text,
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao melhorar texto');
      clearSnapshot();
      return null;
    }

    // Limpar formatação markdown do texto melhorado
    return cleanMarkdown(result.text || '');
  }, [generate, saveSnapshot, clearSnapshot]);

  const summarizeText = useCallback(async (
    text: string,
    saveOriginal?: (original: string) => void
  ): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Digite algum conteúdo para resumir');
      return null;
    }

    saveSnapshot(text);
    if (saveOriginal) {
      saveOriginal(text);
    }

    const result = await generate({
      type: 'summarize',
      prompt: text,
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao resumir texto');
      clearSnapshot();
      return null;
    }

    // Limpar formatação markdown do texto resumido
    return cleanMarkdown(result.text || '');
  }, [generate, saveSnapshot, clearSnapshot]);

  // Enhanced chat with RAG, memory, and action support
  const chat = useCallback(async (
    message: string, 
    chatContext?: ChatContext
  ): Promise<{ text: string | null; action?: ChatAction; hasKnowledge?: boolean; hasMemory?: boolean }> => {
    if (!message.trim()) {
      return { text: null };
    }

    const result = await generate({
      type: 'chat',
      prompt: message,
      context: {
        messages: chatContext?.messages,
        tenantId: chatContext?.tenantId,
        customerId: chatContext?.customerId,
        phone: chatContext?.phone,
        source: chatContext?.source,
        sessionId: chatContext?.sessionId,
      },
    });

    if (!result.success) {
      toast.error(result.error || 'Erro no chat');
      return { text: null };
    }

    return { 
      text: result.text, 
      action: result.action,
      hasKnowledge: result.hasKnowledge,
      hasMemory: result.hasMemory
    };
  }, [generate]);

  // Legacy chat method for backwards compatibility
  const chatSimple = useCallback(async (
    message: string, 
    previousMessages?: Array<{ role: string; content: string }>
  ): Promise<string | null> => {
    const result = await chat(message, { messages: previousMessages });
    return result.text;
  }, [chat]);

  const generateTemplate = useCallback(async (
    templateType: string, 
    description?: string
  ): Promise<string | null> => {
    const result = await generate({
      type: 'template',
      prompt: `Crie um template de mensagem para: ${templateType}${description ? `. Descrição: ${description}` : ''}`,
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao gerar template');
      return null;
    }

    return result.text;
  }, [generate]);

  const translateText = useCallback(async (
    text: string, 
    targetLanguage: string = 'en',
    saveOriginal?: (original: string) => void
  ): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Digite algum conteúdo para traduzir');
      return null;
    }

    saveSnapshot(text);
    if (saveOriginal) {
      saveOriginal(text);
    }

    const result = await generate({
      type: 'translate',
      prompt: text,
      context: { targetLanguage },
    });

    if (!result.success) {
      toast.error(result.error || 'Erro ao traduzir texto');
      clearSnapshot();
      return null;
    }

    return result.text;
  }, [generate, saveSnapshot, clearSnapshot]);

  const generateVariations = useCallback(async (text: string): Promise<string[] | null> => {
    if (!text.trim()) {
      toast.error('Digite algum conteúdo para gerar variações');
      return null;
    }

    const result = await generate({
      type: 'variations',
      prompt: `Gere 3 variações diferentes do seguinte texto, mantendo o mesmo significado e tom, mas com diferentes estruturas e palavras. Separe cada variação com "---":\n\n${text}`,
    });

    if (!result.success || !result.text) {
      toast.error(result.error || 'Erro ao gerar variações');
      return null;
    }

    // Parse variations from the response (separated by ---)
    const variations = result.text
      .split('---')
      .map(v => cleanMarkdown(v.trim()))
      .filter(v => v.length > 20) // Filter out very short fragments
      .slice(0, 5); // Limit to 5 variations max

    if (variations.length === 0) {
      return [cleanMarkdown(result.text)];
    }

    return variations;
  }, [generate]);

  const getCurrentProvider = useCallback((): string => {
    return 'Google Gemini';
  }, []);

  const isActionLoading = useCallback((action: AIAction): boolean => {
    return isGenerating && activeAction === action;
  }, [isGenerating, activeAction]);

  return {
    isGenerating,
    activeAction,
    isActionLoading,
    generate,
    generateContent,
    generateArticle,
    improveText,
    summarizeText,
    translateText,
    generateVariations,
    chat,
    chatSimple, // Legacy backwards compatible method
    generateTemplate,
    getCurrentProvider,
    // Undo functionality
    saveSnapshot,
    getSnapshot,
    clearSnapshot,
  };
}
