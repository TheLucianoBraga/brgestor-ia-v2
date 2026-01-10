-- Add scheduled_at and reminder_at columns to notes table
ALTER TABLE public.notes 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient reminder queries
CREATE INDEX idx_notes_reminder_at ON public.notes (reminder_at) WHERE reminder_at IS NOT NULL;
CREATE INDEX idx_notes_scheduled_at ON public.notes (scheduled_at) WHERE scheduled_at IS NOT NULL;