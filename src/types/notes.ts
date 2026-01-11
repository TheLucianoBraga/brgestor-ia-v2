export type NoteCategory = 'idea' | 'task' | 'meeting' | 'bug';

export interface Note {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  category: NoteCategory;
  is_pinned: boolean;
  tags: string[];
  scheduled_at: string | null;
  reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteAIAction {
  id: string;
  note_id: string;
  action_type: string;
  original_content: string;
  ai_response: string | null;
  created_at: string;
}

export interface CreateNoteDTO {
  title?: string | null;
  content: string;
  category?: NoteCategory;
  is_pinned?: boolean;
  tags?: string[];
  scheduled_at?: string | null;
  reminder_at?: string | null;
}

export interface UpdateNoteDTO {
  title?: string | null;
  content?: string;
  category?: NoteCategory;
  is_pinned?: boolean;
  tags?: string[];
  scheduled_at?: string | null;
  reminder_at?: string | null;
}
