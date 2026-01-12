import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';

export interface ChatbotAnalytics {
  totalSessions: number;
  activeSessions: number;
  resolvedByAI: number;
  transferredToHuman: number;
  positiveRatings: number;
  negativeRatings: number;
  totalActions: number;
  avgMessagesPerSession: number;
  topActions: { action_type: string; count: number }[];
  sessionsOverTime: { date: string; count: number }[];
  // WhatsApp Auto-Responder metrics
  whatsappConversations: number;
  whatsappMessages: number;
}

export function useChatbotAnalytics(startDate?: Date, endDate?: Date) {
  const { currentTenant } = useTenant();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['chatbot-analytics', currentTenant?.id, startDate, endDate],
    queryFn: async (): Promise<ChatbotAnalytics> => {
      if (!currentTenant?.id) {
        return getEmptyAnalytics();
      }

      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      // Fetch chatbot sessions (Chatbot IA)
      const { data: sessions, error: sessionsError } = await supabase
        .from('chatbot_sessions')
        .select('id, status, rating, resolved_by_ai, transferred_to_human, total_actions, messages, started_at')
        .eq('tenant_id', currentTenant.id)
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString());

      if (sessionsError) throw sessionsError;

      // Fetch chatbot actions
      const { data: actions, error: actionsError } = await supabase
        .from('chatbot_actions')
        .select('action_type')
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (actionsError) throw actionsError;

      // Fetch chatbot feedback
      const { data: feedback, error: feedbackError } = await supabase
        .from('chatbot_feedback')
        .select('rating')
        .eq('tenant_id', currentTenant.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (feedbackError) throw feedbackError;

      // Fetch WhatsApp Auto-Responder conversations (chat_memory)
      const { data: whatsappMemories, error: memoriesError } = await supabase
        .from('chat_memory')
        .select('id, messages_count, last_contact_at, first_contact_at')
        .eq('tenant_id', currentTenant.id)
        .gte('last_contact_at', start.toISOString())
        .lte('last_contact_at', end.toISOString());

      if (memoriesError) throw memoriesError;

      // Fetch WhatsApp messages history from conversation_history table
      const memoryIds = whatsappMemories?.map(m => m.id) || [];
      let whatsappMessagesData: any[] = [];
      
      if (memoryIds.length > 0) {
        const { data: messages, error: messagesError } = await supabase
          .from('conversation_history')
          .select('id, memory_id, created_at')
          .in('memory_id', memoryIds)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (messagesError) throw messagesError;
        whatsappMessagesData = messages || [];
      }

      // Calculate combined analytics
      const chatbotSessionCount = sessions?.length || 0;
      const whatsappConversations = whatsappMemories?.length || 0;
      const totalSessions = chatbotSessionCount + whatsappConversations;
      
      const activeSessions = sessions?.filter(s => s.status === 'active').length || 0;
      const resolvedByAI = sessions?.filter(s => s.resolved_by_ai).length || 0;
      const transferredToHuman = sessions?.filter(s => s.transferred_to_human).length || 0;
      const positiveRatings = feedback?.filter(f => f.rating === true).length || 0;
      const negativeRatings = feedback?.filter(f => f.rating === false).length || 0;
      const totalActions = actions?.length || 0;

      // Average messages per session (combined)
      let totalChatbotMessages = 0;
      sessions?.forEach(s => {
        if (Array.isArray(s.messages)) {
          totalChatbotMessages += s.messages.length;
        }
      });
      
      const totalWhatsappMessages = whatsappMessagesData.length;
      const totalMessages = totalChatbotMessages + totalWhatsappMessages;
      const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions * 10) / 10 : 0;

      // Top actions
      const actionCounts: Record<string, number> = {};
      actions?.forEach(a => {
        actionCounts[a.action_type] = (actionCounts[a.action_type] || 0) + 1;
      });
      const topActions = Object.entries(actionCounts)
        .map(([action_type, count]) => ({ action_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Sessions over time (combined by day)
      const sessionsByDay: Record<string, number> = {};
      
      // Add chatbot sessions
      sessions?.forEach(s => {
        const day = new Date(s.started_at).toISOString().split('T')[0];
        sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
      });
      
      // Add WhatsApp conversations (use first_contact_at or last_contact_at)
      whatsappMemories?.forEach(m => {
        const contactDate = m.first_contact_at || m.last_contact_at;
        if (contactDate) {
          const day = new Date(contactDate).toISOString().split('T')[0];
          sessionsByDay[day] = (sessionsByDay[day] || 0) + 1;
        }
      });
      
      const sessionsOverTime = Object.entries(sessionsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalSessions,
        activeSessions,
        resolvedByAI,
        transferredToHuman,
        positiveRatings,
        negativeRatings,
        totalActions,
        avgMessagesPerSession,
        topActions,
        sessionsOverTime,
        whatsappConversations,
        whatsappMessages: totalWhatsappMessages
      };
    },
    enabled: !!currentTenant?.id
  });

  return {
    analytics: analytics || getEmptyAnalytics(),
    isLoading
  };
}

function getEmptyAnalytics(): ChatbotAnalytics {
  return {
    totalSessions: 0,
    activeSessions: 0,
    resolvedByAI: 0,
    transferredToHuman: 0,
    positiveRatings: 0,
    negativeRatings: 0,
    totalActions: 0,
    avgMessagesPerSession: 0,
    topActions: [],
    sessionsOverTime: [],
    whatsappConversations: 0,
    whatsappMessages: 0
  };
}
