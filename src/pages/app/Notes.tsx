import React, { useState, useMemo } from 'react';
import { Plus, Search, StickyNote, Lightbulb, CheckSquare, Users, Bug, Pin, MoreVertical, Trash2, Edit3, PinOff, Calendar, Tag, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useNotes } from '@/hooks/useNotes';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NoteEditorModal } from '@/components/notes/NoteEditorModal';
import { NotesAIChat } from '@/components/notes/NotesAIChat';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Note, NoteCategory } from '@/types/notes';

const CATEGORY_CONFIG: Record<NoteCategory, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  idea: { label: 'Ideia', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  task: { label: 'Tarefa', icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  meeting: { label: 'Reunião', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  bug: { label: 'Bug', icon: Bug, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
};

const CATEGORY_COLORS: Record<NoteCategory, string> = {
  idea: 'border-l-amber-500',
  task: 'border-l-blue-500',
  meeting: 'border-l-purple-500',
  bug: 'border-l-red-500',
};

export default function Notes() {
  const { notes, isLoading, createNote, updateNote, deleteNote, togglePin } = useNotes();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NoteCategory | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = search === '' || 
        note.title?.toLowerCase().includes(search.toLowerCase()) ||
        note.content.toLowerCase().includes(search.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      const matchesTag = !selectedTag || note.tags.includes(selectedTag);
      
      return matchesSearch && matchesCategory && matchesTag;
    });
  }, [notes, search, selectedCategory, selectedTag]);

  // Sort: pinned first, then by date
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [filteredNotes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    notes.forEach(note => {
      counts[note.category] = (counts[note.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Handlers
  const handleCreateNote = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const handleSaveNote = async (data: Partial<Note>) => {
    if (editingNote) {
      await updateNote.mutateAsync({ id: editingNote.id, ...data });
    } else {
      await createNote.mutateAsync(data as any);
    }
    setIsModalOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote.mutateAsync(id);
  };

  const handleTogglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin.mutateAsync({ id: note.id, is_pinned: note.is_pinned });
  };

  // Get note preview
  const getNotePreview = (content: string) => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(0, 3).join(' ').substring(0, 120);
  };

  const pinnedNotes = sortedNotes.filter(n => n.is_pinned);
  const unpinnedNotes = sortedNotes.filter(n => !n.is_pinned);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Anotações</h1>
              <p className="text-sm text-muted-foreground">
                {notes.length} {notes.length === 1 ? 'nota' : 'notas'} • {pinnedNotes.length} fixadas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NotesAIChat />
              <Button onClick={handleCreateNote} className="gap-2 shadow-lg">
                <Plus className="w-4 h-4" />
                Nova Anotação
              </Button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, conteúdo ou tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="gap-2 shrink-0"
              >
                <StickyNote className="w-4 h-4" />
                Todas
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categoryCounts.all || 0}
                </Badge>
              </Button>
              {(Object.entries(CATEGORY_CONFIG) as [NoteCategory, typeof CATEGORY_CONFIG[NoteCategory]][]).map(([key, config]) => (
                <Button
                  key={key}
                  variant={selectedCategory === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(key)}
                  className="gap-2 shrink-0"
                >
                  <config.icon className={cn("w-4 h-4", selectedCategory !== key && config.color)} />
                  {config.label}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {categoryCounts[key] || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer shrink-0"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
              {selectedTag && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTag(null)}
                  className="text-xs h-6"
                >
                  Limpar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <StickyNote className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search ? 'Nenhuma nota encontrada' : 'Nenhuma anotação ainda'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {search 
                ? 'Tente ajustar sua busca ou filtros' 
                : 'Crie sua primeira anotação para começar a organizar suas ideias'}
            </p>
            {!search && (
              <Button onClick={handleCreateNote} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Anotação
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Pin className="w-4 h-4" />
                  Fixadas ({pinnedNotes.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Notes */}
            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Outras ({unpinnedNotes.length})
                  </h3>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unpinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={handleEditNote}
                      onDelete={handleDeleteNote}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      <NoteEditorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        note={editingNote}
        onSave={handleSaveNote}
        isLoading={createNote.isPending || updateNote.isPending}
      />
    </div>
  );
}

// Note Card Component
interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: Note, e: React.MouseEvent) => void;
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }: NoteCardProps) {
  const categoryConfig = CATEGORY_CONFIG[note.category];
  const CategoryIcon = categoryConfig.icon;

  const getNotePreview = (content: string) => {
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(0, 3).join(' ').substring(0, 120);
  };

  return (
    <Card 
      className={cn(
        "group relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-l-4",
        CATEGORY_COLORS[note.category],
        note.is_pinned && "ring-1 ring-amber-200 dark:ring-amber-900"
      )}
      onClick={() => onEdit(note)}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("p-1.5 rounded-md", categoryConfig.bg)}>
              <CategoryIcon className={cn("w-3.5 h-3.5", categoryConfig.color)} />
            </div>
            <h3 className="font-semibold text-sm truncate text-foreground">
              {note.title || 'Sem título'}
            </h3>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => onTogglePin(note, e as any)}>
                {note.is_pinned ? (
                  <>
                    <PinOff className="w-4 h-4 mr-2" />
                    Desafixar
                  </>
                ) : (
                  <>
                    <Pin className="w-4 h-4 mr-2" />
                    Fixar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3 min-h-[3.75rem]">
          {getNotePreview(note.content) || 'Nota vazia...'}
        </p>

        {/* Footer */}
        <div className="flex flex-col gap-2">
          {/* Scheduled Date */}
          {note.scheduled_at && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
              isPast(new Date(note.scheduled_at)) 
                ? "bg-muted text-muted-foreground" 
                : isToday(new Date(note.scheduled_at))
                  ? "bg-primary/10 text-primary font-medium"
                  : "bg-blue-50 dark:bg-blue-950/30 text-blue-600"
            )}>
              <Calendar className="w-3 h-3" />
              {isToday(new Date(note.scheduled_at)) 
                ? `Hoje às ${format(new Date(note.scheduled_at), 'HH:mm')}`
                : isTomorrow(new Date(note.scheduled_at))
                  ? `Amanhã às ${format(new Date(note.scheduled_at), 'HH:mm')}`
                  : format(new Date(note.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              }
            </div>
          )}
          
          {/* Reminder */}
          {note.reminder_at && (
            <div className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
              isPast(new Date(note.reminder_at)) 
                ? "bg-red-50 dark:bg-red-950/30 text-red-600 animate-pulse" 
                : "bg-orange-50 dark:bg-orange-950/30 text-orange-600"
            )}>
              <Bell className="w-3 h-3" />
              {isPast(new Date(note.reminder_at)) 
                ? "Lembrete vencido!"
                : isToday(new Date(note.reminder_at)) 
                  ? `Lembrete hoje às ${format(new Date(note.reminder_at), 'HH:mm')}`
                  : `Lembrete: ${format(new Date(note.reminder_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`
              }
            </div>
          )}
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(note.created_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </div>

            {note.is_pinned && (
              <Pin className="w-3 h-3 text-amber-500" />
            )}
          </div>
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
            {note.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs py-0">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs py-0">
                +{note.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
