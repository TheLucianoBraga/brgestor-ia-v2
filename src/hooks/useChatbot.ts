import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';
import { useTenantSettings } from '@/hooks/useTenantSettings';

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: string;
  options?: MenuOption[];
}

export interface MenuOption {
  id: string;
  label: string;
  action: string;
}

export interface ChatbotConfig {
  id: string;
  tenant_id: string;
  welcome_message: string;
  menu_options: MenuOption[];
  business_hours: string;
  auto_responses: Record<string, string>;
  whatsapp_number: string | null;
  is_active: boolean;
}

// Helper to convert ChatMessage to Json-compatible format
const messagesToJson = (messages: ChatMessage[]): Json => {
  return messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    options: m.options || null
  })) as unknown as Json;
};

export function useChatbot() {
  const { currentTenant } = useTenant();
  const { getSetting } = useTenantSettings();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['chatbot-config', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        // Return default config if none exists
        return {
          welcome_message: 'Olá! 👋 Como posso ajudar você hoje?',
          menu_options: [
            { id: 'services', label: '📋 Ver meus serviços', action: 'list_services' },
            { id: 'payment', label: '💳 2ª via de boleto', action: 'generate_payment' },
            { id: 'hours', label: '🕐 Horário de funcionamento', action: 'show_hours' },
            { id: 'attendant', label: '👤 Falar com atendente', action: 'open_whatsapp' }
          ],
          business_hours: 'Segunda a Sexta: 08:00 às 18:00\nSábado: 08:00 às 12:00',
          whatsapp_number: null,
          is_active: true
        } as Partial<ChatbotConfig>;
      }
      
      return {
        ...data,
        menu_options: data.menu_options as unknown as MenuOption[]
      } as ChatbotConfig;
    },
    enabled: !!currentTenant?.id
  });

  const startSession = useCallback(async () => {
    if (!currentTenant?.id || !config) return;

    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'bot',
      content: config.welcome_message || 'Olá! Como posso ajudar?',
      timestamp: new Date().toISOString(),
      options: config.menu_options as MenuOption[]
    };

    setMessages([welcomeMessage]);

    // Create session in database
    const { data: session } = await supabase
      .from('chatbot_sessions')
      .insert({
        tenant_id: currentTenant.id,
        messages: messagesToJson([welcomeMessage]),
        status: 'active'
      })
      .select()
      .single();

    if (session) {
      setSessionId(session.id);
    }
  }, [currentTenant?.id, config]);

  const handleAction = useCallback(async (action: string, label: string) => {
    if (!config) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: label,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    // Process action
    let botResponse: ChatMessage;

    switch (action) {
      case 'list_services':
        botResponse = {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '📋 Para ver seus serviços ativos, acesse a seção "Meus Serviços" no portal do cliente.\n\nPosso ajudar com mais alguma coisa?',
          timestamp: new Date().toISOString(),
          options: config.menu_options as MenuOption[]
        };
        break;

      case 'generate_payment':
        botResponse = {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '💳 Para gerar a 2ª via do seu boleto:\n\n1. Acesse o portal do cliente\n2. Vá em "Meus Serviços"\n3. Clique em "Gerar Boleto"\n\nOu entre em contato com nosso atendimento.\n\nPosso ajudar com mais alguma coisa?',
          timestamp: new Date().toISOString(),
          options: config.menu_options as MenuOption[]
        };
        break;

      case 'show_hours':
        botResponse = {
          id: crypto.randomUUID(),
          role: 'bot',
          content: `🕐 Nosso horário de funcionamento:\n\n${config.business_hours || 'Segunda a Sexta: 08:00 às 18:00'}\n\nPosso ajudar com mais alguma coisa?`,
          timestamp: new Date().toISOString(),
          options: config.menu_options as MenuOption[]
        };
        break;

      case 'open_whatsapp':
        const whatsappNumber = (config as ChatbotConfig).whatsapp_number || '5500000000000';
        const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=Olá! Vim pelo chatbot e preciso de atendimento.`;
        window.open(whatsappUrl, '_blank');
        
        botResponse = {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '👤 Abrindo WhatsApp para você falar com um atendente...\n\nPosso ajudar com mais alguma coisa?',
          timestamp: new Date().toISOString(),
          options: config.menu_options as MenuOption[]
        };
        break;

      default:
        botResponse = {
          id: crypto.randomUUID(),
          role: 'bot',
          content: 'Desculpe, não entendi. Escolha uma das opções abaixo:',
          timestamp: new Date().toISOString(),
          options: config.menu_options as MenuOption[]
        };
    }

    setMessages(prev => [...prev, botResponse]);

    // Update session in database
    if (sessionId) {
      const allMessages = [...messages, userMessage, botResponse];
      await supabase
        .from('chatbot_sessions')
        .update({
          messages: messagesToJson(allMessages)
        })
        .eq('id', sessionId);
    }
  }, [config, sessionId, messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!config || !currentTenant?.id) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);

    let responseContent = '';

    try {
      // Check if AI is enabled for chatbot
      const aiEnabled = getSetting('ai_chatbot_enabled') === 'true';

      if (aiEnabled) {
        // Call the chatbot-response edge function
        const { data, error } = await supabase.functions.invoke('chatbot-response', {
          body: {
            message: text,
            previousMessages: messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            tenantId: currentTenant.id,
            businessHours: config.business_hours,
            menuOptions: config.menu_options
          }
        });

        if (error) {
          console.error('Chatbot AI error:', error);
          throw error;
        }

        if (data?.error) {
          console.error('Chatbot AI response error:', data.error);
          throw new Error(data.error);
        }

        responseContent = data?.response || '';
      }
      
      if (!responseContent) {
        // Fallback to simple keyword matching
        const lowerText = text.toLowerCase();
        if (lowerText.includes('serviço') || lowerText.includes('plano')) {
          responseContent = '📋 Para ver seus serviços, use a opção "Ver meus serviços" abaixo.';
        } else if (lowerText.includes('boleto') || lowerText.includes('pagar') || lowerText.includes('pagamento')) {
          responseContent = '💳 Para 2ª via de boleto, use a opção abaixo ou acesse o portal do cliente.';
        } else if (lowerText.includes('horário') || lowerText.includes('funcionamento') || lowerText.includes('aberto')) {
          responseContent = `🕐 ${config.business_hours || 'Segunda a Sexta: 08:00 às 18:00'}`;
        } else if (lowerText.includes('atendente') || lowerText.includes('humano') || lowerText.includes('pessoa')) {
          responseContent = '👤 Para falar com um atendente, use a opção "Falar com atendente" abaixo.';
        } else {
          responseContent = 'Desculpe, não entendi sua mensagem. Por favor, escolha uma das opções abaixo:';
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      responseContent = 'Desculpe, estou com dificuldades no momento. Por favor, tente novamente ou escolha uma das opções abaixo.';
    }

    setIsThinking(false);

    const botResponse: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'bot',
      content: responseContent,
      timestamp: new Date().toISOString(),
      options: config.menu_options as MenuOption[]
    };

    setMessages(prev => [...prev, botResponse]);

    // Update session
    if (sessionId) {
      const allMessages = [...messages, userMessage, botResponse];
      await supabase
        .from('chatbot_sessions')
        .update({
          messages: messagesToJson(allMessages)
        })
        .eq('id', sessionId);
    }
  }, [config, sessionId, messages, currentTenant?.id, getSetting]);

  const endSession = useCallback(async () => {
    if (sessionId) {
      await supabase
        .from('chatbot_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    }
    setSessionId(null);
    setMessages([]);
  }, [sessionId]);

  return {
    config,
    configLoading,
    messages,
    sessionId,
    isThinking,
    startSession,
    handleAction,
    sendMessage,
    endSession
  };
}

export function useChatbotConfig() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['chatbot-config-admin', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        menu_options: data.menu_options as unknown as MenuOption[]
      } as ChatbotConfig;
    },
    enabled: !!currentTenant?.id
  });

  const { data: sessions } = useQuery({
    queryKey: ['chatbot-sessions', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('chatbot_sessions')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!currentTenant?.id
  });

  const saveConfig = useMutation({
    mutationFn: async (configData: Partial<ChatbotConfig>) => {
      if (!currentTenant?.id) throw new Error('No tenant');

      const { data: existing } = await supabase
        .from('chatbot_config')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      const dbData = {
        ...configData,
        menu_options: configData.menu_options as unknown as Json,
        auto_responses: configData.auto_responses as unknown as Json
      };

      if (existing) {
        const { data, error } = await supabase
          .from('chatbot_config')
          .update({
            ...dbData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('chatbot_config')
          .insert({
            tenant_id: currentTenant.id,
            ...dbData
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-config-admin'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot-config'] });
    }
  });

  return {
    config,
    isLoading,
    sessions,
    saveConfig
  };
}
