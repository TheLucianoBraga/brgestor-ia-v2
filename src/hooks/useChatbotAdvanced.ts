import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import type { Json } from '@/integrations/supabase/types';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAILearning } from '@/hooks/useAILearning';

export interface ChatMessage {
  id: string;
  role: 'bot' | 'user';
  content: string;
  timestamp: string;
  options?: MenuOption[];
  action?: ChatAction;
  richContent?: RichContent;
  isWelcome?: boolean;
  suggestions?: string[]; // Sugestões proativas da IA
  autoExecutable?: boolean; // Ação pode ser executada automaticamente
}

export interface MenuOption {
  id: string;
  label: string;
  action: string;
}

export interface ChatAction {
  type: 'generate_pix' | 'show_plans' | 'create_ticket' | 'transfer_human' | 'show_services' | 'show_charges' | 'confirm_action' | 
        'show_system_metrics' | 'navigate_organizations' | 'show_master_billing' | 'navigate_config' | 'create_internal_ticket' |
        'show_adm_dashboard' | 'list_revendas' | 'show_adm_billing' | 'create_revenda' | 'list_tickets' | 'show_subscription' |
        'show_revenda_dashboard' | 'list_customers' | 'list_pending_charges' | 'send_charge' | 'create_customer' |
        'show_due_date' | 'show_referral' | 'navigate_profile' | 'request_help' | 'generate_payment';
  payload: Record<string, any>;
}

export interface RichContent {
  type: 'services' | 'charges' | 'plans' | 'confirmation' | 'customers' | 'revendas' | 'metrics';
  data: any[];
}

export interface ConversationSummary {
  id: string;
  preview: string;
  timestamp: string;
  messageCount: number;
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

type TenantType = 'master' | 'adm' | 'revenda' | 'cliente';

// Menu options by tenant type
function getDefaultMenuForType(type: TenantType): MenuOption[] {
  switch (type) {
    case 'master':
      return [
        { id: 'metrics', label: '📊 Métricas do sistema', action: 'show_system_metrics' },
        { id: 'adms', label: '🏢 Gerenciar ADMs', action: 'navigate_organizations' },
        { id: 'billing', label: '💰 Faturamento geral', action: 'show_master_billing' },
        { id: 'config', label: '⚙️ Configurações', action: 'navigate_config' }
      ];
    case 'adm':
      return [
        { id: 'dashboard', label: '📊 Meu dashboard', action: 'show_adm_dashboard' },
        { id: 'revendas', label: '👥 Minhas revendas', action: 'list_revendas' },
        { id: 'billing', label: '💰 Meu faturamento', action: 'show_adm_billing' },
        { id: 'tickets', label: '🎫 Meus tickets', action: 'list_tickets' }
      ];
    case 'revenda':
      return [
        { id: 'dashboard', label: '📊 Meu dashboard', action: 'show_revenda_dashboard' },
        { id: 'customers', label: '👤 Meus clientes', action: 'list_customers' },
        { id: 'pending', label: '💰 Cobranças pendentes', action: 'list_pending_charges' },
        { id: 'new_customer', label: '➕ Novo cliente', action: 'create_customer' }
      ];
    case 'cliente':
      return [
        { id: 'services', label: '📋 Meus serviços', action: 'show_services' },
        { id: 'payment', label: '💳 2ª via boleto', action: 'generate_payment' },
        { id: 'upgrade', label: '⬆️ Fazer upgrade', action: 'show_plans' },
        { id: 'help', label: '🆘 Preciso de ajuda', action: 'request_help' }
      ];
    default:
      return [];
  }
}

// Helper to convert ChatMessage to Json-compatible format
const messagesToJson = (messages: ChatMessage[]): Json => {
  return messages.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    options: m.options || null,
    action: m.action || null,
    richContent: m.richContent || null,
    isWelcome: m.isWelcome || null
  })) as unknown as Json;
};

// LocalStorage key for chat persistence
const CHAT_STORAGE_KEY = 'brgestor_chat_history';
const CHAT_HISTORY_KEY = 'brgestor_chat_conversations';

interface StoredConversation {
  id: string;
  messages: ChatMessage[];
  sessionId: string | null;
  timestamp: string;
}

function loadChatFromStorage(tenantId: string): { messages: ChatMessage[], sessionId: string | null } | null {
  try {
    const stored = localStorage.getItem(`${CHAT_STORAGE_KEY}_${tenantId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if session is not too old (24 hours max)
      const lastTimestamp = parsed.messages?.[parsed.messages.length - 1]?.timestamp;
      if (lastTimestamp && (Date.now() - new Date(lastTimestamp).getTime()) < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load chat from storage:', e);
  }
  return null;
}

function saveChatToStorage(tenantId: string, messages: ChatMessage[], sessionId: string | null) {
  try {
    localStorage.setItem(`${CHAT_STORAGE_KEY}_${tenantId}`, JSON.stringify({ messages, sessionId }));
  } catch (e) {
    console.warn('Failed to save chat to storage:', e);
  }
}

function clearChatFromStorage(tenantId: string) {
  try {
    localStorage.removeItem(`${CHAT_STORAGE_KEY}_${tenantId}`);
  } catch (e) {
    console.warn('Failed to clear chat from storage:', e);
  }
}

// Conversation history management
function loadConversationHistory(tenantId: string): StoredConversation[] {
  try {
    const stored = localStorage.getItem(`${CHAT_HISTORY_KEY}_${tenantId}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out conversations older than 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return parsed.filter((c: StoredConversation) => new Date(c.timestamp).getTime() > sevenDaysAgo);
    }
  } catch (e) {
    console.warn('Failed to load conversation history:', e);
  }
  return [];
}

function saveConversationToHistory(tenantId: string, messages: ChatMessage[], sessionId: string | null) {
  if (messages.length < 2) return; // Don't save if only welcome message
  
  try {
    const history = loadConversationHistory(tenantId);
    const newConversation: StoredConversation = {
      id: crypto.randomUUID(),
      messages,
      sessionId,
      timestamp: new Date().toISOString()
    };
    
    // Keep last 10 conversations
    const updated = [newConversation, ...history.filter(c => c.sessionId !== sessionId)].slice(0, 10);
    localStorage.setItem(`${CHAT_HISTORY_KEY}_${tenantId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save conversation to history:', e);
  }
}

function deleteConversationFromHistory(tenantId: string, conversationId: string) {
  try {
    const history = loadConversationHistory(tenantId);
    const updated = history.filter(c => c.id !== conversationId);
    localStorage.setItem(`${CHAT_HISTORY_KEY}_${tenantId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete conversation from history:', e);
  }
}

interface UseChatbotAdvancedOptions {
  navigate?: (path: string) => void;
}

export function useChatbotAdvanced(options: UseChatbotAdvancedOptions = {}) {
  const { navigate } = options;
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const { customer, isAuthenticated: isCustomerAuthenticated } = useCustomerAuth();
  const { getSetting } = useTenantSettings();
  const aiLearning = useAILearning();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [proactiveAlerts, setProactiveAlerts] = useState<string[]>([]);
  const [contextStats, setContextStats] = useState<Record<string, any>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [backgroundAnalysis, setBackgroundAnalysis] = useState<any>(null);

  // Get tenant type - default to cliente if customer is authenticated
  const tenantType: TenantType = isCustomerAuthenticated 
    ? 'cliente' 
    : (currentTenant?.type as TenantType) || 'revenda';

  // Get customer name for personalization
  const customerName = customer?.customerName || user?.email?.split('@')[0] || null;

  // Load chat from localStorage on mount
  useEffect(() => {
    if (currentTenant?.id && !isInitialized) {
      const stored = loadChatFromStorage(currentTenant.id);
      if (stored && stored.messages.length > 0) {
        setMessages(stored.messages);
        setSessionId(stored.sessionId);
        setIsInitialized(true);
      }
    }
  }, [currentTenant?.id, isInitialized]);

  // Save chat to localStorage when messages change
  useEffect(() => {
    if (currentTenant?.id && messages.length > 0) {
      saveChatToStorage(currentTenant.id, messages, sessionId);
      
      // Trigger background analysis (não bloqueia UI)
      performBackgroundAnalysis();
    }
  }, [currentTenant?.id, messages, sessionId]);

  /**
   * Análise em background - roda sem bloquear a conversa
   */
  const performBackgroundAnalysis = useCallback(async () => {
    if (!currentTenant?.id || messages.length < 2) return;

    try {
      // Análise não-bloqueante de padrões
      const analysis: any = {
        pendingActions: [],
        suggestions: [],
        alerts: []
      };

      // Detectar padrões de mensagens do usuário
      const userMessages = messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        const content = lastUserMessage.content.toLowerCase();

        // Detecta menção a categorias/despesas
        if (content.includes('despesa') || content.includes('gasto') || content.includes('pagar')) {
          const suggestion = await aiLearning.suggestCategory(content);
          if (suggestion) {
            analysis.suggestions.push(`💡 Posso categorizar isso automaticamente como sugerido anteriormente`);
          }
        }

        // Detecta anomalias se mencionar valores
        const amountMatch = content.match(/r\$?\s*(\d+(?:[.,]\d{2})?)/i);
        if (amountMatch) {
          const amount = parseFloat(amountMatch[1].replace(',', '.'));
          // Detecção de anomalia seria aqui
          if (amount > 5000) {
            analysis.alerts.push(`⚠️ Valor acima da média detectado`);
          }
        }
      }

      // Buscar ações pendentes no tenant
      if (tenantType === 'revenda' || tenantType === 'adm') {
        const { data: pendingCharges } = await supabase
          .from('customer_charges')
          .select('id')
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'pending')
          .limit(5);

        if (pendingCharges && pendingCharges.length > 0) {
          analysis.pendingActions.push({
            type: 'pending_charges',
            count: pendingCharges.length,
            message: `Você tem ${pendingCharges.length} cobrança(s) pendente(s). Quer que eu envie lembretes?`
          });
        }
      }

      // Cliente com vencimento próximo
      if (tenantType === 'cliente' && customer?.customerId) {
        const { data: items } = await supabase
          .from('customer_items')
          .select('expires_at, due_date, price')
          .eq('customer_id', customer.customerId)
          .in('status', ['active', 'trial']);

        if (items && items.length > 0) {
          const nextExpiry = items
            .map(i => i.expires_at || i.due_date)
            .filter(Boolean)
            .sort()[0];

          if (nextExpiry) {
            const daysUntil = Math.ceil((new Date(nextExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 7 && daysUntil > 0) {
              analysis.alerts.push(`📅 Seu vencimento está em ${daysUntil} dia(s)!`);
            }
          }
        }
      }

      setBackgroundAnalysis(analysis);

      // Atualizar alertas proativos se houver
      const newAlerts = [
        ...analysis.suggestions,
        ...analysis.alerts,
        ...analysis.pendingActions.map((a: any) => a.message)
      ].slice(0, 3); // Máximo 3 alertas

      if (newAlerts.length > 0) {
        setProactiveAlerts(newAlerts);
      }

    } catch (error) {
      console.error('Background analysis error:', error);
    }
  }, [currentTenant?.id, messages, tenantType, customer?.customerId, aiLearning]);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['chatbot_config', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return null;
      
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Get menu options based on tenant type
      const menuOptions = getDefaultMenuForType(tenantType);
      
      if (!data) {
        return {
          welcome_message: 'Olá! 👋 Como posso ajudar você hoje?',
          menu_options: menuOptions,
          business_hours: 'Segunda a Sexta: 08:00 às 18:00\nSábado: 08:00 às 12:00',
          whatsapp_number: null,
          is_active: true
        } as Partial<ChatbotConfig>;
      }
      
      return {
        ...data,
        // Override menu_options with type-specific options
        menu_options: menuOptions
      } as ChatbotConfig;
    },
    enabled: !!currentTenant?.id
  });

  const startSession = useCallback(async () => {
    if (!currentTenant?.id || !config) return;

    // If we already have messages (restored from localStorage), don't reinitialize
    if (messages.length > 0 && isInitialized) {
      return;
    }

    setIsThinking(true);

    try {
      // Call contextual edge function for initialization
      const { data, error } = await supabase.rpc('chat_contextual', {
          action: 'init',
          tenantId: currentTenant.id,
          tenantType: tenantType,
          userId: user?.id || null,
          customerId: customer?.customerId || null
        });

      if (error) {
        console.error('Init error:', error);
        throw error;
      }

      const welcomeContent = data?.response || config.welcome_message || 'Olá! Como posso ajudar?';
      const menuOptions = data?.menuOptions || config.menu_options;

      // Store context stats
      if (data?.context?.stats) {
        setContextStats(data.context.stats);
      }

      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: welcomeContent,
        timestamp: new Date().toISOString(),
        options: menuOptions as MenuOption[],
        isWelcome: true
      };

      setMessages([welcomeMessage]);
      setProactiveAlerts([]);

      // Create session in database
      const { data: session } = await supabase
        .from('chatbot_sessions')
        .insert({
          tenant_id: currentTenant.id,
          customer_id: customer?.customerId || null,
          messages: messagesToJson([welcomeMessage]),
          status: 'active',
          metadata: { tenantType, contextStats: data?.context?.stats }
        })
        .select()
        .single();

      if (session) {
        setSessionId(session.id);
      }
    } catch (err) {
      console.error('Error starting session:', err);
      // Fallback to basic welcome
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: config.welcome_message || 'Olá! Como posso ajudar?',
        timestamp: new Date().toISOString(),
        options: config.menu_options as MenuOption[],
        isWelcome: true
      };
      setMessages([welcomeMessage]);
    } finally {
      setIsThinking(false);
    }
  }, [currentTenant?.id, config, tenantType, user?.id, customer?.customerId, messages.length, isInitialized]);

  const executeAction = useCallback(async (action: ChatAction): Promise<void> => {
    if (!config || !currentTenant) return;

    // Modo Executivo: ações simples executam automaticamente
    const executiveMode = getSetting('ai_executive_mode') === 'true';
    const nonCriticalActions = [
      'show_services', 'show_plans', 'show_charges', 
      'show_due_date', 'list_customers', 'list_pending_charges',
      'show_adm_dashboard', 'show_revenda_dashboard', 'show_system_metrics'
    ];

    const isNonCritical = nonCriticalActions.includes(action.type);
    const shouldAutoExecute = executiveMode && isNonCritical;

    if (shouldAutoExecute) {
      // Log de aprendizado - preferência de ação
      aiLearning.learnPattern('preferred_action', action.type, { count: 1 }, 0.5);
    }

    switch (action.type) {
      // CLIENT actions
      case 'generate_pix':
      case 'generate_payment':
        if (tenantType === 'cliente' && customer?.tenantId) {
          // Buscar a fatura pendente mais recente
          const { data: pendingPayment } = await supabase
            .from('payments')
            .select('*')
            .eq('buyer_tenant_id', customer.tenantId)
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (pendingPayment) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: `💳 Encontrei uma fatura pendente de R$ ${pendingPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com vencimento em ${new Date(pendingPayment.due_date).toLocaleDateString('pt-BR')}.\n\nPor favor, acesse o menu "Meus Serviços" para visualizar e pagar sua fatura.`,
              timestamp: new Date().toISOString(),
              richContent: { type: 'charges', data: [pendingPayment] }
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: '✅ Não encontrei faturas pendentes para você no momento!',
              timestamp: new Date().toISOString()
            }]);
          }
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '💳 Para gerar a 2ª via, por favor acesse o menu de faturas ou entre em contato com o suporte.',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'show_plans':
        const { data: plans } = await supabase
          .from('services')
          .select('id, name, price, description')
          .eq('seller_tenant_id', currentTenant.id)
          .eq('active', true)
          .limit(5);

        if (plans && plans.length > 0) {
          const planMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '📦 Aqui estão os planos disponíveis:',
            timestamp: new Date().toISOString(),
            richContent: { type: 'plans', data: plans }
          };
          setMessages(prev => [...prev, planMessage]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '📦 No momento não há planos disponíveis. Entre em contato conosco para mais informações.',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'show_services':
        if (customer?.customerId) {
          const { data: services } = await supabase
            .from('customer_items')
            .select('id, product_name, status, due_date, expires_at, price')
            .eq('customer_id', customer.customerId);

          if (services && services.length > 0) {
            const serviceMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'bot',
              content: '📋 Seus serviços ativos:',
              timestamp: new Date().toISOString(),
              richContent: { type: 'services', data: services }
            };
            setMessages(prev => [...prev, serviceMessage]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: 'Você ainda não possui serviços ativos. Gostaria de conhecer nossos planos?',
              timestamp: new Date().toISOString(),
              options: [{ id: 'plans', label: '📦 Ver planos', action: 'show_plans' }]
            }]);
          }
        }
        break;

      case 'show_due_date':
        if (tenantType === 'cliente' && customer?.tenantId) {
          // Busca em tempo real para garantir precisão
          const { data: items } = await supabase
            .from('customer_items')
            .select('expires_at, due_date, price, starts_at')
            .eq('customer_id', customer.customerId)
            .in('status', ['active', 'trial']);

          let nextDate: Date | null = null;
          let amount = 0;

          if (items && items.length > 0) {
            const itemsWithDates = items.map(item => {
              const expiry = item.expires_at || item.due_date;
              return { expiry, price: item.price };
            }).filter(i => i.expiry);

            const sorted = itemsWithDates.sort((a, b) => new Date(a.expiry!).getTime() - new Date(b.expiry!).getTime());
            if (sorted[0]) {
              nextDate = new Date(sorted[0].expiry!);
              amount = sorted[0].price || 0;
            }
          }

          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: nextDate 
              ? `📅 Seu próximo vencimento é em ${nextDate.toLocaleDateString('pt-BR')}, no valor de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
              : '📅 Não encontrei vencimentos próximos para seus serviços ativos.',
            timestamp: new Date().toISOString()
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '📅 Não consegui localizar seus vencimentos. Por favor, verifique o menu "Meus Serviços".',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'show_referral':
        // Buscar o código de referência do tenant do cliente para gerar o link correto
        const customerTenantId = customer?.tenantId || currentTenant?.id;
        let referralMessage = `🎁 Seu saldo de indicações: R$ ${(contextStats.referralBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nTotal de indicações: ${contextStats.totalReferrals || 0}`;
        
        if (customerTenantId) {
          const { data: refCodeData } = await supabase
            .from('ref_codes')
            .select('code')
            .eq('owner_tenant_id', customerTenantId)
            .eq('kind', 'signup_cliente')
            .eq('active', true)
            .maybeSingle();
          
          if (refCodeData?.code) {
            const baseUrl = import.meta.env.VITE_APP_URL;
            const referralUrl = `${baseUrl}/cadastro?ref=${refCodeData.code}`;
            referralMessage += `\n\n🔗 Seu link de indicação:\n${referralUrl}`;
          } else {
            referralMessage += '\n\nAcesse o menu "Indicações" para gerar seu link personalizado!';
          }
        } else {
          referralMessage += '\n\nAcesse o menu "Indicações" para ver seu link personalizado!';
        }
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: referralMessage,
          timestamp: new Date().toISOString()
        }]);
        break;

      case 'request_help':
      case 'transfer_human':
        // Primeiro tenta o número configurado manualmente, depois o WAHA conectado
        let whatsappNumber = (config as ChatbotConfig).whatsapp_number || '';
        
        // Se não tem número configurado, tenta buscar do WAHA conectado
        if (!whatsappNumber && currentTenant?.id) {
          try {
            const { data: wahaResult } = await supabase.rpc('waha_api', { action: 'get_status', tenantId: currentTenant.id });
            
            if (wahaResult?.success && wahaResult?.data?.status === 'WORKING' && wahaResult?.data?.me?.id) {
              whatsappNumber = wahaResult.data.me.id.split('@')[0] || '';
              console.log('Using WAHA connected phone:', whatsappNumber);
            }
          } catch (wahaError) {
            console.error('Error fetching WAHA status:', wahaError);
          }
        }
        
        if (whatsappNumber) {
          const context = action.payload.context || 'Preciso de atendimento';
          const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! ${context}`)}`;
          
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '👤 Claro! Vou te direcionar para nosso atendimento via WhatsApp. Uma nova janela será aberta.',
            timestamp: new Date().toISOString()
          }]);
          
          setTimeout(() => window.open(whatsappUrl, '_blank'), 500);
          
          if (sessionId) {
            await supabase
              .from('chatbot_sessions')
              .update({ transferred_to_human: true })
              .eq('id', sessionId);
          }
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: '👤 Entendi que você precisa de ajuda! Infelizmente o WhatsApp de atendimento não está configurado. Por favor, entre em contato através dos canais disponíveis na página do serviço.',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'create_ticket':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '🎫 Estou criando um ticket de suporte para você. Nossa equipe entrará em contato em breve!',
          timestamp: new Date().toISOString()
        }]);
        break;

      // REVENDA actions
      case 'list_customers':
        const { data: customers } = await supabase
          .from('customers')
          .select('id, full_name, whatsapp, status')
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'active')
          .limit(10);

        if (customers && customers.length > 0) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: `👤 Seus ${customers.length} cliente(s) ativos:`,
            timestamp: new Date().toISOString(),
            richContent: { type: 'customers', data: customers }
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'Você ainda não possui clientes cadastrados.',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'list_pending_charges':
        // Se for cliente, buscamos da tabela de pagamentos (payments)
        if (tenantType === 'cliente' && customer?.customerId) {
          const { data: customerPayments } = await supabase
            .from('payments')
            .select('*')
            .eq('buyer_tenant_id', customer.tenantId)
            .eq('status', 'pending')
            .order('due_date', { ascending: true })
            .limit(5);

          if (customerPayments && customerPayments.length > 0) {
            const paymentsList = customerPayments.map(p => 
              `• Fatura de R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - Vencimento: ${new Date(p.due_date).toLocaleDateString('pt-BR')}`
            ).join('\n');

            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: `💰 Encontrei faturas pendentes para você:\n\n${paymentsList}\n\nVocê pode pagar acessando o menu "Meus Serviços".`,
              timestamp: new Date().toISOString()
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: '✅ Não encontrei faturas pendentes para você no momento!',
              timestamp: new Date().toISOString()
            }]);
          }
        } else {
          // Lógica original para Revendas/ADMs
          const { data: pendingCharges } = await supabase
            .from('customer_charges')
            .select('id, description, amount, due_date, status, customer:customers(full_name)')
            .eq('tenant_id', currentTenant.id)
            .in('status', ['pending', 'overdue'])
            .order('due_date', { ascending: true })
            .limit(10);

          if (pendingCharges && pendingCharges.length > 0) {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: `💰 Você tem ${pendingCharges.length} cobrança(s) pendente(s):`,
              timestamp: new Date().toISOString(),
              richContent: { type: 'charges', data: pendingCharges }
            }]);
          } else {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'bot',
              content: '✅ Não há cobranças pendentes!',
              timestamp: new Date().toISOString()
            }]);
          }
        }
        break;

      case 'create_customer':
        toast.info('Abrindo formulário de cadastro...');
        // Navigate to customers page using React Router
        if (navigate) {
          navigate('/app/clientes?action=new');
        }
        break;

      case 'send_charge':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '📧 A funcionalidade de envio de cobrança está em desenvolvimento. Por enquanto, acesse o menu Cobranças para enviar manualmente.',
          timestamp: new Date().toISOString()
        }]);
        break;

      // ADM actions
      case 'list_revendas':
        const { data: revendas } = await supabase
          .from('tenants')
          .select('id, name, status, created_at')
          .eq('parent_tenant_id', currentTenant.id)
          .eq('type', 'revenda')
          .limit(10);

        if (revendas && revendas.length > 0) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: `👥 Suas ${revendas.length} revenda(s):`,
            timestamp: new Date().toISOString(),
            richContent: { type: 'revendas', data: revendas }
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'Você ainda não possui revendas cadastradas.',
            timestamp: new Date().toISOString()
          }]);
        }
        break;

      case 'create_revenda':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '➕ Vou te redirecionar para criar uma nova revenda...',
          timestamp: new Date().toISOString()
        }]);
        if (navigate) setTimeout(() => navigate('/app/contas?action=new'), 500);
        break;

      case 'show_adm_billing':
      case 'show_master_billing':
      case 'show_revenda_dashboard':
      case 'show_adm_dashboard':
        const revenueMsg = contextStats.revenueThisMonth 
          ? `💰 Faturamento este mês: R$ ${contextStats.revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '💰 Carregando dados de faturamento...';
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: revenueMsg,
          timestamp: new Date().toISOString()
        }]);
        break;

      case 'list_tickets':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '🎫 Abrindo lista de tickets... Você pode ver todos os seus tickets de suporte aqui.',
          timestamp: new Date().toISOString()
        }]);
        break;

      case 'show_subscription':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '📋 Vou te redirecionar para ver seu plano atual...',
          timestamp: new Date().toISOString()
        }]);
        if (navigate) setTimeout(() => navigate('/app/meu_plano'), 500);
        break;
      // Navigation actions
      case 'navigate_organizations':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '🏢 Vou te redirecionar para a página de organizações...',
          timestamp: new Date().toISOString()
        }]);
        if (navigate) setTimeout(() => navigate('/app/contas'), 500);
        break;

      case 'navigate_config':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '⚙️ Vou te redirecionar para as configurações...',
          timestamp: new Date().toISOString()
        }]);
        if (navigate) setTimeout(() => navigate('/app/config'), 500);
        break;

      case 'navigate_profile':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '👤 Vou te redirecionar para seu perfil...',
          timestamp: new Date().toISOString()
        }]);
        if (navigate) setTimeout(() => navigate(isCustomerAuthenticated ? '/portal/perfil' : '/app/config'), 500);
        break;

      case 'show_system_metrics':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: `📊 Métricas do Sistema:\n\n` +
            `• Revendas/ADMs ativos: ${contextStats.totalAdms || 0}\n` +
            `• Faturamento do mês: R$ ${(contextStats.revenueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
            `• Inadimplentes: ${contextStats.defaultingAdms || 0}`,
          timestamp: new Date().toISOString(),
          richContent: { type: 'metrics', data: [contextStats] }
        }]);
        break;

      case 'create_internal_ticket':
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'bot',
          content: '🐛 Abrindo formulário de bug report... Descreva o problema que encontrou.',
          timestamp: new Date().toISOString()
        }]);
        break;

      default:
        console.log('Unknown action:', action);
    }
  }, [config, currentTenant, customer, sessionId, contextStats, isCustomerAuthenticated]);

  const handleAction = useCallback(async (action: string, label: string) => {
    if (!config) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: label,
      timestamp: new Date().toISOString()
    };

    // Get current message count before action
    const messageCountBefore = messages.length;

    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);

    try {
      // Execute the action
      await executeAction({ type: action as ChatAction['type'], payload: {} });
      
      // Check if executeAction added any message by comparing message count
      // We use a timeout to ensure state update has completed
      setTimeout(() => {
        setMessages(currentMessages => {
          // If no bot response was added, add a fallback
          const hasNewBotMessage = currentMessages.length > messageCountBefore + 1 && 
            currentMessages.some((m, i) => i > messageCountBefore && m.role === 'bot');
          
          if (!hasNewBotMessage) {
            return [...currentMessages, {
              id: crypto.randomUUID(),
              role: 'bot' as const,
              content: `✅ Ação "${label}" processada. Posso ajudar com mais alguma coisa?`,
              timestamp: new Date().toISOString()
            }];
          }
          return currentMessages;
        });
      }, 100);
    } catch (error) {
      console.error('Error executing action:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: 'Desculpe, houve um erro ao processar sua solicitação. Por favor, tente novamente.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }

    // Update session with a small delay to catch all message updates
    setTimeout(async () => {
      if (sessionId) {
        const { data: session } = await supabase
          .from('chatbot_sessions')
          .select('messages')
          .eq('id', sessionId)
          .single();
        
        // Only update if we have new messages to add
        setMessages(currentMessages => {
          supabase
            .from('chatbot_sessions')
            .update({ messages: messagesToJson(currentMessages) })
            .eq('id', sessionId);
          return currentMessages;
        });
      }
    }, 200);
  }, [config, sessionId, messages, executeAction]);

  const sendMessage = useCallback(async (text: string, file?: { url: string, type: 'image' | 'audio' }) => {
    if (!config || !currentTenant?.id) return;

    // Lista de ações não-críticas que podem ser executadas automaticamente
    const nonCriticalActions = [
      'show_services', 'show_plans', 'show_charges', 
      'show_due_date', 'list_customers', 'list_pending_charges',
      'show_adm_dashboard', 'show_revenda_dashboard', 'show_system_metrics'
    ];

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || (file?.type === 'image' ? '🖼️ [Imagem enviada]' : '🎤 [Áudio enviado]'),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);

    let responseContent = '';
    let responseAction: ChatAction | undefined;

    try {
      const aiEnabled = getSetting('ai_chatbot_enabled') === 'true';

      if (aiEnabled) {
        // Check if web search might be enabled for this tenant
        const mightUseWebSearch = tenantType === 'master';
        if (mightUseWebSearch) {
          setIsSearchingWeb(true);
        }
        
        const { data, error } = await supabase.rpc('chat_contextual', {
          body: {
            message: text,
            previousMessages: messages.map(m => ({ role: m.role, content: m.content })),
            tenantId: currentTenant.id,
            tenantType: tenantType,
            userId: user?.id || null,
            customerId: customer?.customerId || null,
            sessionId: sessionId,
            fileUrl: file?.url,
            fileType: file?.type
          }
        });

        setIsSearchingWeb(false);

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        responseContent = data?.response || '';
        
        if (data?.action) {
          responseAction = data.action as ChatAction;
        }

        if (data?.context?.stats) {
          setContextStats(data.context.stats);
        }
      }
      
      if (!responseContent) {
        // Fallback to keyword matching
        const lowerText = text.toLowerCase();
        const menuOptions = getDefaultMenuForType(tenantType);
        
        if (lowerText.includes('serviço') || lowerText.includes('plano')) {
          responseContent = '📋 Vou mostrar suas informações...';
          responseAction = { type: 'show_services', payload: {} };
        } else if (lowerText.includes('pagar') || lowerText.includes('boleto') || lowerText.includes('pix') || lowerText.includes('fatura') || lowerText.includes('vencimento') || lowerText.includes('vence')) {
          responseContent = '💳 Vou verificar suas faturas e vencimentos!';
          responseAction = { type: 'list_pending_charges', payload: {} };
        } else if (lowerText.includes('ajuda') || lowerText.includes('atendente')) {
          responseContent = '👤 Vou transferir você para atendimento.';
          responseAction = { type: 'request_help', payload: { context: text } };
        } else {
          responseContent = 'Entendi. Escolha uma opção abaixo ou me diga como posso ajudar.';
        }
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setIsSearchingWeb(false);
      
      // Provide specific error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        responseContent = '🔌 Parece que há um problema de conexão. Verifique sua internet e tente novamente.';
      } else if (errorMessage.includes('timeout')) {
        responseContent = '⏱️ A requisição demorou muito. Tente novamente em alguns instantes.';
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        responseContent = '🔐 Sua sessão pode ter expirado. Recarregue a página e tente novamente.';
      } else {
        responseContent = 'Desculpe, estou com dificuldades no momento. Tente novamente ou escolha uma opção abaixo.';
      }
    }

    setIsThinking(false);

    // Gerar sugestões proativas baseadas em contexto
    const proactiveSuggestions: string[] = [];
    
    if (backgroundAnalysis?.pendingActions?.length > 0) {
      proactiveSuggestions.push('Ver cobranças pendentes');
    }
    
    if (tenantType === 'cliente' && responseContent.includes('vencimento')) {
      proactiveSuggestions.push('Pagar agora', 'Ver meus serviços');
    }

    if (tenantType === 'revenda' && responseContent.includes('cliente')) {
      proactiveSuggestions.push('Criar nova cobrança', 'Ver relatório');
    }

    // Aprender horário de uso
    const now = new Date();
    aiLearning.learnPaymentTiming(now.getDay(), now.getHours());

    const botResponse: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'bot',
      content: responseContent,
      timestamp: new Date().toISOString(),
      action: responseAction,
      suggestions: proactiveSuggestions.length > 0 ? proactiveSuggestions : undefined,
      autoExecutable: responseAction && nonCriticalActions.includes(responseAction.type)
    };

    setMessages(prev => [...prev, botResponse]);

    if (responseAction) {
      await executeAction(responseAction);
    }

    if (sessionId) {
      const allMessages = [...messages, userMessage, botResponse];
      await supabase
        .from('chatbot_sessions')
        .update({ messages: messagesToJson(allMessages) })
        .eq('id', sessionId);
    }
  }, [config, sessionId, messages, currentTenant?.id, tenantType, user?.id, customer?.customerId, getSetting, executeAction]);

  const sendFeedback = useCallback(async (rating: boolean, messageId?: string) => {
    if (!sessionId || !currentTenant?.id) return;

    try {
      await supabase
        .from('chatbot_feedback')
        .insert({
          session_id: sessionId,
          tenant_id: currentTenant.id,
          rating,
          message_id: messageId
        });

      await supabase
        .from('chatbot_sessions')
        .update({ rating })
        .eq('id', sessionId);

      toast.success(rating ? 'Obrigado pelo feedback! 😊' : 'Obrigado! Vamos melhorar.');
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  }, [sessionId, currentTenant?.id]);

  const endSession = useCallback(async () => {
    // Save current conversation to history before ending
    if (currentTenant?.id && messages.length > 1) {
      saveConversationToHistory(currentTenant.id, messages, sessionId);
    }
    
    if (sessionId) {
      await supabase
        .from('chatbot_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          resolved_by_ai: !messages.some(m => m.action?.type === 'transfer_human' || m.action?.type === 'request_help')
        })
        .eq('id', sessionId);
    }
    
    // Clear localStorage
    if (currentTenant?.id) {
      clearChatFromStorage(currentTenant.id);
    }
    
    setSessionId(null);
    setMessages([]);
    setProactiveAlerts([]);
    setContextStats({});
    setIsInitialized(false);
  }, [sessionId, messages, currentTenant?.id]);

  // Get conversation history summaries
  const conversationHistory: ConversationSummary[] = useMemo(() => {
    if (!currentTenant?.id) return [];
    const history = loadConversationHistory(currentTenant.id);
    return history.map(conv => {
      const userMessages = conv.messages.filter(m => m.role === 'user');
      const firstUserMessage = userMessages[0]?.content || 'Conversa iniciada';
      return {
        id: conv.id,
        preview: firstUserMessage.slice(0, 50) + (firstUserMessage.length > 50 ? '...' : ''),
        timestamp: conv.timestamp,
        messageCount: conv.messages.length
      };
    });
  }, [currentTenant?.id, messages]); // Re-compute when messages change

  // Load a specific conversation from history
  const loadConversation = useCallback((conversationId: string) => {
    if (!currentTenant?.id) return;
    
    // Save current conversation first if it has content
    if (messages.length > 1) {
      saveConversationToHistory(currentTenant.id, messages, sessionId);
    }
    
    const history = loadConversationHistory(currentTenant.id);
    const conversation = history.find(c => c.id === conversationId);
    
    if (conversation) {
      setMessages(conversation.messages);
      setSessionId(conversation.sessionId);
      saveChatToStorage(currentTenant.id, conversation.messages, conversation.sessionId);
    }
  }, [currentTenant?.id, messages, sessionId]);

  // Clear current conversation and start fresh
  const clearCurrentConversation = useCallback(async () => {
    // Save current to history before clearing
    if (currentTenant?.id && messages.length > 1) {
      saveConversationToHistory(currentTenant.id, messages, sessionId);
    }
    
    if (currentTenant?.id) {
      clearChatFromStorage(currentTenant.id);
    }
    
    setSessionId(null);
    setMessages([]);
    setIsInitialized(false);
  }, [currentTenant?.id, messages, sessionId]);

  // Delete a conversation from history
  const deleteConversation = useCallback((conversationId: string) => {
    if (!currentTenant?.id) return;
    deleteConversationFromHistory(currentTenant.id, conversationId);
  }, [currentTenant?.id]);

  return {
    config,
    configLoading,
    messages,
    sessionId,
    isThinking,
    isSearchingWeb,
    proactiveAlerts,
    backgroundAnalysis,
    tenantType,
    contextStats,
    isCustomerAuthenticated,
    customerName: customer?.customerName,
    conversationHistory,
    aiLearning,
    startSession,
    handleAction,
    sendMessage,
    sendFeedback,
    executeAction,
    endSession,
    loadConversation,
    clearCurrentConversation,
    deleteConversation
  };
}

