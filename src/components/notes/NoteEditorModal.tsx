import React, { useState, useEffect } from 'react';
import { X, Lightbulb, CheckSquare, Users, Bug, Tag, Plus, Calendar, Bell, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AITextAssistant } from '@/components/ui/AITextAssistant';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Note, NoteCategory } from '@/types/notes';

const CATEGORY_CONFIG: Record<NoteCategory, { label: string; icon: React.ElementType; color: string }> = {
  idea: { label: 'Ideia', icon: Lightbulb, color: 'text-amber_500' },
  task: { label: 'Tarefa', icon: CheckSquare, color: 'text-blue_500' },
  meeting: { label: 'Reunião', icon: Users, color: 'text-purple_500' },
  bug: { label: 'Bug', icon: Bug, color: 'text-red_500' },
};

interface NoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSave: (data: Partial<Note>) => Promise<void>;
  isLoading: boolean;
}

export function NoteEditorModal({ open, onOpenChange, note, onSave, isLoading }: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('idea');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [reminderTime, setReminderTime] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content);
      setCategory(note.category);
      setTags(note.tags || []);
      
      // Parse scheduled_at
      if (note.scheduled_at) {
        const scheduledAtDate = new Date(note.scheduled_at);
        setScheduledDate(scheduledAtDate);
        setScheduledTime(format(scheduledAtDate, 'HH:mm'));
      } else {
        setScheduledDate(undefined);
        setScheduledTime('');
      }
      
      // Parse reminder_at
      if (note.reminder_at) {
        const reminderAtDate = new Date(note.reminder_at);
        setReminderEnabled(true);
        setReminderDate(reminderAtDate);
        setReminderTime(format(reminderAtDate, 'HH:mm'));
      } else {
        setReminderEnabled(false);
        setReminderDate(undefined);
        setReminderTime('');
      }
    } else {
      setTitle('');
      setContent('');
      setCategory('idea');
      setTags([]);
      setScheduledDate(undefined);
      setScheduledTime('');
      setReminderEnabled(false);
      setReminderDate(undefined);
      setReminderTime('');
    }
  }, [note, open]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const combineDateTime = (date: Date | undefined, time: string): string | null => {
    if (!date) return null;
    const [hours, minutes] = time ? time.split(':').map(Number) : [0, 0];
    const combined = new Date(date);
    combined.setHours(hours || 0, minutes || 0, 0, 0);
    return combined.toISOString();
  };

  const handleSave = async () => {
    await onSave({
      title: title || 'Sem título',
      content,
      category,
      tags,
      scheduled_at: combineDateTime(scheduledDate, scheduledTime),
      reminder_at: reminderEnabled ? combineDateTime(reminderDate, reminderTime) : null,
    });
  };

  const handleAIUpdate = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-3">
            {note ? 'Editar Anotação' : 'Nova Anotação'}
            <div className="flex-1" />
            <AITextAssistant 
              value={content} 
              onUpdate={handleAIUpdate}
              disabled={!content.trim()}
            />
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Title & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da anotação..."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as NoteCategory)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_CONFIG) as [NoteCategory, typeof CATEGORY_CONFIG[NoteCategory]][]).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className={cn("w-4 h-4", config.color)} />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva sua anotação aqui..."
              className="mt-1.5 min-h-[200px] resize-none"
            />
          </div>

          {/* Date/Time Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
            {/* Scheduled Date/Time */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Data/Hora da Anotação
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-28 pl-10"
                  />
                </div>
              </div>
              {scheduledDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setScheduledDate(undefined);
                    setScheduledTime('');
                  }}
                  className="text-xs h-7"
                >
                  <X className="w-3 h-3 mr-1" />
                  Limpar data
                </Button>
              )}
            </div>

            {/* Reminder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-500" />
                  Lembrete
                </Label>
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={(checked) => {
                    setReminderEnabled(checked);
                    if (!checked) {
                      setReminderDate(undefined);
                      setReminderTime('');
                    }
                  }}
                />
              </div>
              {reminderEnabled && (
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !reminderDate && "text-muted-foreground"
                        )}
                      >
                        <Bell className="mr-2 h-4 w-4" />
                        {reminderDate ? format(reminderDate, "dd/MM/yyyy", { locale: ptBR }) : "Data do lembrete"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={reminderDate}
                        onSelect={setReminderDate}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-28 pl-10"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Adicionar tag..."
                  className="h-7 w-32 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleAddTag}
                  className="h-7 w-7"
                  disabled={!newTag.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : (note ? 'Salvar' : 'Criar')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
