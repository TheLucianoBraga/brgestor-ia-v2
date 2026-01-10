import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface NoteAction {
  action: 'create' | 'update' | 'delete' | 'pin' | 'unpin' | 'list' | 'search';
  data?: any;
  confirmRequired?: boolean;
}

interface AIResponse {
  message: string;
  action?: NoteAction;
  requiresConfirmation?: boolean;
  error?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useNotesAI = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<NoteAction | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<AIResponse | null> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return null;
    }

    setIsLoading(true);
    
    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('notes-ai', {
        body: {
          message,
          userId: user.id,
          tenantId: currentTenant?.id,
          previousMessages: messages.slice(-10) // Last 10 messages for context
        }
      });

      if (error) throw error;

      const response = data as AIResponse;

      if (response.error) {
        throw new Error(response.error);
      }

      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);

      // Check if action requires confirmation
      if (response.action?.confirmRequired) {
        setPendingAction(response.action);
      } else {
        // Invalidate notes query to refresh data
        queryClient.invalidateQueries({ queryKey: ['notes'] });
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
  }, [user?.id, currentTenant?.id, messages, queryClient]);

  const confirmAction = useCallback(async (): Promise<boolean> => {
    if (!pendingAction || !user?.id) {
      return false;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('notes-ai', {
        body: {
          userId: user.id,
          action: 'execute',
          actionData: pendingAction
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message 
        }]);
        setPendingAction(null);
        queryClient.invalidateQueries({ queryKey: ['notes'] });
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
  }, [pendingAction, user?.id, queryClient]);

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
