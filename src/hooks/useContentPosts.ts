import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { toast } from 'sonner';

export interface ContentPost {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  category: string | null;
  media_url: string | null;
  images: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  scheduled_at: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ContentPostInput {
  title: string;
  content: string;
  type: 'text' | 'image' | 'video';
  category?: string;
  media_url?: string;
  images?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  scheduled_at?: string | null;
}

export function useContentPosts(category?: string) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['content-posts', currentTenant?.id, category],
    queryFn: async () => {
      let query = supabase
        .from('content_posts')
        .select('*')
        .eq('tenant_id', currentTenant!.id)
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContentPost[];
    },
    enabled: !!currentTenant?.id
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['content-categories', currentTenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_posts')
        .select('category')
        .eq('tenant_id', currentTenant!.id)
        .not('category', 'is', null);

      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(d => d.category).filter(Boolean))];
      return uniqueCategories as string[];
    },
    enabled: !!currentTenant?.id
  });

  const createPost = useMutation({
    mutationFn: async (input: ContentPostInput) => {
      const { data, error } = await supabase
        .from('content_posts')
        .insert({
          ...input,
          tenant_id: currentTenant!.id,
          is_active: input.is_active ?? true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-posts'] });
      queryClient.invalidateQueries({ queryKey: ['content-categories'] });
      toast.success('Conteúdo publicado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao publicar: ' + error.message);
    }
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...input }: ContentPostInput & { id: string }) => {
      const { data, error } = await supabase
        .from('content_posts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-posts'] });
      queryClient.invalidateQueries({ queryKey: ['content-categories'] });
      toast.success('Conteúdo atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-posts'] });
      toast.success('Conteúdo removido!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('content_posts')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-posts'] });
      toast.success('Status atualizado!');
    }
  });

  return {
    posts,
    categories,
    isLoading,
    createPost: createPost.mutate,
    updatePost: updatePost.mutate,
    deletePost: deletePost.mutate,
    toggleActive: toggleActive.mutate,
    isCreating: createPost.isPending,
    isUpdating: updatePost.isPending
  };
}

// Hook para o portal do cliente
export function usePortalContent(category?: string) {
  const { customer, isPreviewMode, previewData } = useCustomerAuth();
  
  // Importamos dinamicamente para evitar circular dependency
  const { data: portalInfo } = useQuery({
    queryKey: ['portal-customer-info-for-content'],
    queryFn: async () => {
      // Se temos customer do CustomerAuth, usamos o tenantId dele (do revendedor)
      if (customer?.tenantId) {
        return { ownerTenantId: customer.tenantId };
      }
      
      // Senão, buscamos via Supabase Auth - precisa achar o parent_tenant_id do cliente
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Buscar o tenant do usuário
      const { data: member } = await supabase
        .from('tenant_members')
        .select('tenant_id, tenants!inner(id, type, parent_tenant_id)')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!member) return null;
      
      const tenant = (member as any).tenants;
      
      // Se for tenant tipo 'cliente', o conteúdo vem do parent_tenant_id (revendedor)
      if (tenant?.type === 'cliente' && tenant?.parent_tenant_id) {
        return { ownerTenantId: tenant.parent_tenant_id };
      }
      
      // Fallback para o próprio tenant
      return { ownerTenantId: member.tenant_id };
    },
    enabled: true
  });
  
  const effectiveTenantId = isPreviewMode 
    ? previewData?.tenantId 
    : portalInfo?.ownerTenantId;
  
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['portal-content', effectiveTenantId, category],
    queryFn: async () => {
      if (!effectiveTenantId) {
        console.log('No effectiveTenantId for portal content');
        return [];
      }
      
      try {
        // Buscar diretamente com o tenantId correto (do revendedor/owner)
        const { data, error } = await supabase.functions.invoke('chat-contextual', {
          body: {
            action: 'get_portal_content',
            tenantId: effectiveTenantId,
            tenantType: 'cliente',
            category: category === 'all' ? undefined : category
          }
        });

        if (error) {
          console.error('Edge Function error:', error);
        }

        if (data?.posts) {
          return data.posts as ContentPost[];
        }
      } catch (e) {
        console.error('Error fetching content via Edge Function:', e);
      }

      // Fallback: busca direta do tenant do revendedor
      const { data: directData } = await supabase
        .from('content_posts')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      return (directData || []) as ContentPost[];
    },
    enabled: !!effectiveTenantId
  });

  const categories = [...new Set(posts.map(p => p.category).filter(Boolean))] as string[];

  return { posts, categories, isLoading };
}
