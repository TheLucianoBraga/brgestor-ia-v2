-- Criar bucket para mídias do WhatsApp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('waha-media', 'waha-media', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/opus', 'audio/webm', 'video/mp4', 'video/webm', 'application/pdf', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- Política para edge functions lerem os arquivos (usando service role)
CREATE POLICY "Service role can read media" ON storage.objects
FOR SELECT USING (bucket_id = 'waha-media');

-- Política para edge functions inserirem arquivos
CREATE POLICY "Service role can insert media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'waha-media');

-- Política para edge functions deletarem arquivos
CREATE POLICY "Service role can delete media" ON storage.objects
FOR DELETE USING (bucket_id = 'waha-media');