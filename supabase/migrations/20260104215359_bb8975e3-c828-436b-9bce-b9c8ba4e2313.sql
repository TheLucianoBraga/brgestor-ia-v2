-- Add scheduled publishing and multiple images support to content_posts
ALTER TABLE public.content_posts
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS images TEXT[];

-- Create index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled ON public.content_posts (scheduled_at)
WHERE scheduled_at IS NOT NULL AND is_active = false;

-- Function to auto-publish scheduled posts (can be called by cron)
CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_count INTEGER;
BEGIN
  UPDATE content_posts
  SET is_active = true
  WHERE scheduled_at IS NOT NULL
    AND scheduled_at <= now()
    AND is_active = false;
  
  GET DIAGNOSTICS published_count = ROW_COUNT;
  RETURN published_count;
END;
$$;