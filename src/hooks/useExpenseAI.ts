import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';

interface ExpenseAction {
  action: 'create' | 'update' | 'delete' | 'mark_paid' | 'postpone' | 'cancel' | 'list' | 'summary';
  data?: any;
  confirmRequired?: boolean;
}

interface AIResponse {
  message: string;
  action?: ExpenseAction;
  requiresConfirmation?: boolean;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useExpenseAI = () => {
  const { currentTenant } = useTenant();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<ExpenseAction | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<AIResponse | null> => {
    if (!currentTenant?.id) {
      toast.error('Tenant não selecionado');
      return null;
    }

    setIsLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('expense-ai', {
        body: {
          message,
          tenantId: currentTenant.id,
          previousMessages: messages.slice(-10) // Last 10 messages for context
        }
      });

      if (error) throw error;

      const response = data as AIResponse;

      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);

      // Check if action requires confirmation
      if (response.action?.confirmRequired) {
        setPendingAction(response.action);
      }

      return response;

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar mensagem';
      toast.error(errorMessage);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.' 
      }]);
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, messages]);

  const confirmAction = useCallback(async (): Promise<boolean> => {
    if (!pendingAction || !currentTenant?.id) {
      return false;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('expense-ai', {
        body: {
          tenantId: currentTenant.id,
          action: 'execute',
          actionData: pendingAction
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${data.message}` 
        }]);
        setPendingAction(null);
        return true;
      } else {
        throw new Error(data.message || 'Erro ao executar ação');
      }

    } catch (error) {
      console.error('Error confirming action:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar ação');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pendingAction, currentTenant?.id]);

  const cancelAction = useCallback(() => {
    setPendingAction(null);
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Ação cancelada.' 
    }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
  }, []);

  return {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    cancelAction,
    clearMessages,
  };
};
