-- Create content_versions table for version history
CREATE TABLE public.content_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_post_id UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  type TEXT NOT NULL DEFAULT 'post',
  media_url TEXT,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_content_versions_post_id ON public.content_versions(content_post_id);
CREATE INDEX idx_content_versions_created_at ON public.content_versions(content_post_id, created_at DESC);

-- RLS Policies - allow access based on parent content_post tenant
CREATE POLICY "Users can view versions of their tenant posts"
ON public.content_versions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.content_posts cp
    WHERE cp.id = content_post_id
    AND cp.tenant_id = current_tenant_id()
  )
);

CREATE POLICY "Users can create versions for their tenant posts"
ON public.content_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content_posts cp
    WHERE cp.id = content_post_id
    AND cp.tenant_id = current_tenant_id()
  )
);

-- Function to auto-save version before update
CREATE OR REPLACE FUNCTION public.save_content_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.content_versions
  WHERE content_post_id = OLD.id;
  
  -- Save old version
  INSERT INTO public.content_versions (
    content_post_id, version_number, title, content, category, type, media_url, images, created_by
  ) VALUES (
    OLD.id, next_version, OLD.title, OLD.content, OLD.category, OLD.type, OLD.media_url, OLD.images, auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-save versions on update
CREATE TRIGGER save_content_version_trigger
BEFORE UPDATE ON public.content_posts
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
EXECUTE FUNCTION public.save_content_version();