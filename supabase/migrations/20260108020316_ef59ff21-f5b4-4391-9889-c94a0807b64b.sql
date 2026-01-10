-- Create enum for note categories
CREATE TYPE public.note_category AS ENUM ('idea', 'task', 'meeting', 'bug');

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  category note_category DEFAULT 'idea',
  is_pinned BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create note_ai_actions table
CREATE TABLE public.note_ai_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  original_content TEXT NOT NULL,
  ai_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_ai_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
ON public.notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for note_ai_actions (based on note ownership)
CREATE POLICY "Users can view AI actions for their notes"
ON public.note_ai_actions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = note_ai_actions.note_id 
  AND notes.user_id = auth.uid()
));

CREATE POLICY "Users can create AI actions for their notes"
ON public.note_ai_actions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = note_ai_actions.note_id 
  AND notes.user_id = auth.uid()
));

CREATE POLICY "Users can delete AI actions for their notes"
ON public.note_ai_actions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = note_ai_actions.note_id 
  AND notes.user_id = auth.uid()
));

-- Create trigger for updated_at on notes
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_notes_user_id ON public.notes(user_id);
CREATE INDEX idx_notes_category ON public.notes(category);
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX idx_note_ai_actions_note_id ON public.note_ai_actions(note_id);