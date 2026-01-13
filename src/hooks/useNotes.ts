import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase-postgres';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Note, CreateNoteDTO, UpdateNoteDTO, NoteCategory } from '@/types/notes';

const NOTES_KEY = ['notes'];

export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notes for current user
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: NOTES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(note => ({
        ...note,
        category: note.category as NoteCategory,
        tags: note.tags || [],
        scheduled_at: note.scheduled_at || null,
        reminder_at: note.reminder_at || null,
      })) as Note[];
    },
    enabled: !!user,
  });

  // Create note
  const createNote = useMutation({
    mutationFn: async (dto: CreateNoteDTO) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: dto.title || null,
          content: dto.content,
          category: dto.category || 'idea',
          is_pinned: dto.is_pinned || false,
          tags: dto.tags || [],
          scheduled_at: dto.scheduled_at || null,
          reminder_at: dto.reminder_at || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      toast({ title: 'Nota criada com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar nota', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update note
  const updateNote = useMutation({
    mutationFn: async ({ id, ...dto }: UpdateNoteDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({
          ...dto,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      toast({ title: 'Nota atualizada!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar nota', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Delete note
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      toast({ title: 'Nota excluída!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir nota', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Toggle pin
  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ is_pinned: !is_pinned })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      toast({ title: data.is_pinned ? 'Nota fixada!' : 'Nota desafixada!' });
    },
  });

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
  };
}

