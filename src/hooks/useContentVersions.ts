import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { toast } from 'sonner';

export interface ContentVersion {
  id: string;
  content_post_id: string;
  version_number: number;
  title: string;
  content: string;
  category: string | null;
  type: string;
  media_url: string | null;
  images: string[] | null;
  created_at: string;
  created_by: string | null;
}

export function useContentVersions(postId: string | null) {
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['content_versions', postId],
    queryFn: async () => {
      if (!postId) return [];
      
      const { data, error } = await supabase
        .from('content_versions')
        .select('*')
        .eq('content_post_id', postId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as ContentVersion[];
    },
    enabled: !!postId
  });

  const restoreVersion = useMutation({
    mutationFn: async (version: ContentVersion) => {
      const { error } = await supabase
        .from('content_posts')
        .update({
          title: version.title,
          content: version.content,
          category: version.category,
          type: version.type,
          media_url: version.media_url,
          images: version.images
        })
        .eq('id', version.content_post_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content_posts'] });
      queryClient.invalidateQueries({ queryKey: ['content_versions'] });
      toast.success('Versão restaurada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao restaurar versão: ' + error.message);
    }
  });

  return {
    versions,
    isLoading,
    restoreVersion: restoreVersion.mutate,
    isRestoring: restoreVersion.isPending
  };
}

