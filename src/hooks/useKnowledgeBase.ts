import { useState } from 'react';
import { supabase } from '@/lib/supabase-postgres';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export interface KnowledgeBaseItem {
  id: string;
  tenant_id: string;
  type: 'faq' | 'document' | 'snippet' | 'procedure' | 'pricing' | 'policy' | 'persona' | 'contact' | 'link' | 'glossary' | 'error_response';
  category: string | null;
  question: string | null;
  answer: string | null;
  content: string | null;
  file_name: string | null;
  file_url: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items, isLoading } = useQuery({
    queryKey: ['knowledge_base', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeBaseItem[];
    },
    enabled: !!currentTenant?.id
  });

  const { data: categories } = useQuery({
    queryKey: ['knowledge-base_categories', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];
      
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .select('category')
        .eq('tenant_id', currentTenant.id)
        .not('category', 'is', null);

      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(d => d.category).filter(Boolean))];
      return uniqueCategories as string[];
    },
    enabled: !!currentTenant?.id
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<KnowledgeBaseItem>) => {
      if (!currentTenant?.id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .insert({
          tenant_id: currentTenant.id,
          type: item.type || 'faq',
          category: item.category,
          question: item.question,
          answer: item.answer,
          content: item.content,
          file_name: item.file_name || null,
          file_url: item.file_url,
          is_active: item.is_active ?? true,
          priority: item.priority || 0
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
      toast({ title: 'Item criado com sucesso!' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar item', variant: 'destructive' });
    }
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<KnowledgeBaseItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('chatbot_knowledge_base')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
      toast({ title: 'Item atualizado!' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge_base'] });
      toast({ title: 'Item removido!' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  });

  return {
    items: items || [],
    categories: categories || [],
    isLoading,
    createItem,
    updateItem,
    deleteItem
  };
}

